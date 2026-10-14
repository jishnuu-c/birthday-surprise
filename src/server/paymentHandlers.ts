// ==============================================================================
// Birthday Magic — Server-side Payment & Edit Token Verification Engine
// ==============================================================================
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
}

export function getRazorpayKeySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || '';
}

export function getAdminEmails(): string[] {
  const raw = [
    process.env.ADMIN_EMAIL,
    process.env.VITE_ADMIN_EMAIL,
    process.env.ADMIN_EMAILS,
    process.env.VITE_ADMIN_EMAILS
  ].filter(Boolean).join(',');

  const parsed = raw
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes('@'));

  if (parsed.length > 0) {
    return Array.from(new Set(parsed));
  }
  return ['admin@gmail.com', 'jishnuachu951@gmail.com'];
}

export function getAdminEmail(): string {
  const list = getAdminEmails();
  return list[0] || 'admin@gmail.com';
}

let cachedServerSupabase: any = null;
export function getServerSupabase(authHeader?: string | null) {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://mplgvxraslaqtgjntzpa.supabase.co'
  ).trim();

  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  ).trim();

  if (serviceKey && url) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_N-D4agXYIn98PMG9w5Ljgg_kam3ly23'
  ).trim();

  if (url && anonKey) {
    if (authHeader && authHeader.trim().startsWith('Bearer eyJ')) {
      return createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: authHeader.trim() } }
      });
    }
    if (!cachedServerSupabase) {
      cachedServerSupabase = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    return cachedServerSupabase;
  }
  return null;
}

export const serverSupabase = getServerSupabase();

function safeTimingEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getRazorpayAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${getRazorpayKeyId()}:${getRazorpayKeySecret()}`).toString('base64');
}

export function isPaymentProcessingEnabled(): boolean {
  if (process.env.PAYMENTS_ENABLED === 'true') {
    return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
  }
  return false;
}

/**
 * 1. Server-side Order Creation:
 * Creates an authorized order in Razorpay for exactly ₹40 (4000 paise).
 */
export async function createRazorpayOrder(params: {
  recipientName: string;
  tempId?: string;
  slug?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  surpriseId?: string;
  error?: string;
}> {
  if (!isPaymentProcessingEnabled()) {
    return {
      success: false,
      error: 'Payments are temporarily unavailable. Please try again later.'
    };
  }

  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    return {
      success: false,
      error: 'Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.'
    };
  }

  const surpriseId = params.tempId || `bday-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  const amount = 4000; // ₹40.00 in paise
  const currency = 'INR';

  try {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getRazorpayAuthHeader()
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: `rcpt_${surpriseId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30)}`,
        notes: {
          surpriseId,
          recipientName: params.recipientName || 'Special Friend'
        }
      })
    });

    const data = (await res.json()) as any;

    if (!res.ok || !data.id) {
      console.error('Razorpay order creation failed:', data);
      return {
        success: false,
        error: data.error?.description || 'Failed to create payment order with Razorpay.'
      };
    }

    // Record order in payments table
    if (serverSupabase) {
      try {
        await serverSupabase.from('payments').insert({
          surprise_id: surpriseId,
          razorpay_order_id: data.id,
          amount,
          currency,
          status: 'created'
        });
      } catch (dbErr) {
        console.warn('Failed to record created payment in Supabase:', dbErr);
      }
    }

    return {
      success: true,
      orderId: data.id,
      amount,
      currency,
      keyId: getRazorpayKeyId(),
      surpriseId
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error communicating with Razorpay';
    return { success: false, error: msg };
  }
}

/**
 * 2. Server-side Payment Verification:
 * Validates HMAC SHA-256 signature AND fetches payment from Razorpay API to confirm capture.
 * Never trusts frontend callback alone. Unlocks creation and generates unguessable edit token.
 */
export async function verifyRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  surpriseId: string;
  recipientName?: string;
  initialConfig?: unknown;
}): Promise<{
  success: boolean;
  surpriseId?: string;
  editToken?: string;
  editUrl?: string;
  error?: string;
}> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, surpriseId } = payload;

  if (!isPaymentProcessingEnabled()) {
    return {
      success: false,
      error: 'Payments are temporarily unavailable. Please try again later.'
    };
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !surpriseId) {
    return { success: false, error: 'Missing required payment verification parameters.' };
  }

  const keySecret = getRazorpayKeySecret();
  if (!keySecret) {
    return { success: false, error: 'Razorpay secret key not configured on server.' };
  }

  // 1. Verify HMAC SHA-256 signature
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isSignatureValid = safeTimingEqual(expectedSignature, razorpay_signature);

  if (!isSignatureValid) {
    console.error('Tampered or invalid Razorpay signature detected');
    return { success: false, error: 'Invalid payment signature. Payment verification failed.' };
  }

  // 2. Query Razorpay API directly to verify payment status, amount, and order matching
  try {
    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      method: 'GET',
      headers: { Authorization: getRazorpayAuthHeader() }
    });

    const paymentData = (await rzpRes.json()) as any;

    if (!rzpRes.ok) {
      return {
        success: false,
        error: paymentData.error?.description || 'Could not retrieve payment details from Razorpay.'
      };
    }

    if (paymentData.status !== 'captured' && paymentData.status !== 'authorized') {
      return {
        success: false,
        error: `Payment not completed. Current status: ${paymentData.status}.`
      };
    }

    if (paymentData.amount !== 4000 || paymentData.currency !== 'INR') {
      return {
        success: false,
        error: `Invalid payment amount or currency: ${paymentData.amount} ${paymentData.currency}.`
      };
    }

    if (paymentData.order_id !== razorpay_order_id) {
      return {
        success: false,
        error: 'Payment order ID does not match the requested order.'
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error checking Razorpay API';
    return { success: false, error: msg };
  }

  // 3. Prevent duplicate payments: verify payment_id hasn't been reused
  if (serverSupabase) {
    const { data: existingPayment } = await serverSupabase
      .from('payments')
      .select('surprise_id, status')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle();

    if (existingPayment && existingPayment.status === 'paid' && existingPayment.surprise_id !== surpriseId) {
      return {
        success: false,
        error: 'This payment has already been redeemed for another birthday surprise.'
      };
    }
  }

  // 4. Generate unique, unguessable editing access token (32 random bytes)
  const editToken = 'bday_edit_' + crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(editToken).digest('hex');

  // 5. Store surprise record, payment record, and hashed token in Supabase
  if (serverSupabase) {
    try {
      // (A) Update payments table
      await serverSupabase.from('payments').upsert({
        surprise_id: surpriseId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount: 4000,
        currency: 'INR',
        status: 'paid',
        updated_at: new Date().toISOString()
      }, { onConflict: 'razorpay_order_id' });

      // (B) Store token hash in surprise_edit_tokens
      await serverSupabase.from('surprise_edit_tokens').upsert({
        surprise_id: surpriseId,
        token_hash: tokenHash,
        created_at: new Date().toISOString()
      }, { onConflict: 'surprise_id' });

      // (C) Ensure birthday_pages record exists and is marked is_paid = true
      const { data: existingPage } = await serverSupabase
        .from('birthday_pages')
        .select('id')
        .eq('id', surpriseId)
        .maybeSingle();

      if (existingPage) {
        await serverSupabase
          .from('birthday_pages')
          .update({
            is_paid: true,
            payment_id: razorpay_payment_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', surpriseId);
      } else if (payload.initialConfig) {
        const cfg = payload.initialConfig as Record<string, unknown>;
        const cleanSlug = String(cfg.slug || surpriseId).toLowerCase().replace(/[^a-z0-9-_]/g, '');
        await serverSupabase.from('birthday_pages').insert({
          id: surpriseId,
          slug: cleanSlug,
          recipient_name: payload.recipientName || String(cfg.recipientName || 'Friend'),
          is_published: false,
          is_paid: true,
          payment_id: razorpay_payment_id,
          config: cfg,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (dbErr) {
      console.error('Database write error during payment verification:', dbErr);
    }
  }

  return {
    success: true,
    surpriseId,
    editToken,
    editUrl: `/editor/${surpriseId}?token=${editToken}`
  };
}

/**
 * 3. Verify Edit Token:
 * Checks whether the presented edit token matches the stored SHA-256 hash
 */
export async function verifyEditToken(
  surpriseId: string,
  token?: string | null,
  adminAuthHeader?: string | null
): Promise<{ valid: boolean; isAdmin?: boolean }> {
  // Check if caller is admin
  if (adminAuthHeader && (await verifyAdminAuth(adminAuthHeader))) {
    return { valid: true, isAdmin: true };
  }

  if (!token || !token.trim() || !surpriseId) {
    return { valid: false };
  }

  const cleanToken = token.trim();
  const inputHash = crypto.createHash('sha256').update(cleanToken).digest('hex');

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('surprise_edit_tokens')
        .select('token_hash')
        .eq('surprise_id', surpriseId)
        .maybeSingle();

      if (error || !data) {
        return { valid: false };
      }

      const isValid = safeTimingEqual(data.token_hash, inputHash);
      return { valid: isValid };
    } catch {
      return { valid: false };
    }
  }

  return { valid: false };
}

/**
 * 4. Verify Admin Session / Secret:
 */
export async function verifyAdminSession(authHeader?: string | null): Promise<{
  authorized: boolean;
  userEmail?: string;
  userId?: string;
  error?: string;
}> {
  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { authorized: false, error: 'Missing bearer token' };
  }

  // 1. Direct admin secret key match if set in server env
  const adminSecret = process.env.ADMIN_SECRET_KEY || '';
  if (adminSecret && token === adminSecret) {
    return { authorized: true, userEmail: 'admin-secret' };
  }

  // 2. Supabase user session token check
  const supabaseClient = getServerSupabase();
  if (supabaseClient) {
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      if (error || !user || !user.email) {
        console.warn('[Admin Auth] Session token rejected by Supabase auth:', error?.message || 'No user associated with token');
        return { authorized: false, error: error?.message || 'Invalid user session token' };
      }

      const userEmail = user.email.trim().toLowerCase();
      const adminEmails = getAdminEmails();

      // (A) Check configured admin email allowlist
      if (adminEmails.includes(userEmail)) {
        return { authorized: true, userEmail, userId: user.id };
      }

      // (B) Check Supabase app_metadata role (tamper-proof)
      const appRole = String(user.app_metadata?.role || '').trim().toLowerCase();
      if (appRole === 'admin' || user.app_metadata?.is_admin === true) {
        return { authorized: true, userEmail, userId: user.id };
      }

      // (C) Check admin_users table in Supabase by UUID
      const { data: adminRow } = await supabaseClient
        .from('admin_users')
        .select('id, email')
        .eq('id', user.id)
        .maybeSingle();

      if (adminRow && adminRow.id) {
        return { authorized: true, userEmail, userId: user.id };
      }

      // (D) Check admin_users table in Supabase by email
      const { data: adminEmailRow } = await supabaseClient
        .from('admin_users')
        .select('id, email')
        .ilike('email', userEmail)
        .maybeSingle();

      if (adminEmailRow && adminEmailRow.id) {
        return { authorized: true, userEmail, userId: user.id };
      }

      console.warn(`[Admin Auth] User authenticated but not in admin allowlist/table: ${userEmail}`);
      return {
        authorized: false,
        userEmail,
        userId: user.id,
        error: `User "${user.email}" authenticated successfully, but this account is not authorized as an administrator.`
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error verifying admin session';
      console.error('[Admin Auth] Verification exception:', msg);
      return { authorized: false, error: msg };
    }
  }

  return { authorized: false, error: 'Supabase server client not initialized' };
}

export async function verifyAdminAuth(authHeader?: string | null): Promise<boolean> {
  const result = await verifyAdminSession(authHeader);
  return result.authorized;
}

/**
 * 5. Admin Dashboard Metrics & Management
 */
export async function getAdminDashboardData(authHeader?: string | null): Promise<{
  authorized: boolean;
  surprises?: unknown[];
  payments?: unknown[];
  metrics?: {
    totalSurprises: number;
    totalPublished: number;
    totalPaid: number;
    totalRevenue: number;
  };
  error?: string;
}> {
  const adminCheck = await verifyAdminSession(authHeader);
  if (!adminCheck.authorized) {
    return { 
      authorized: false, 
      error: `Unauthorized: Admin authentication required. ${adminCheck.error || ''}`.trim() 
    };
  }

  if (!serverSupabase) {
    return { authorized: true, surprises: [], payments: [], metrics: { totalSurprises: 0, totalPublished: 0, totalPaid: 0, totalRevenue: 0 } };
  }

  try {
    let surprises: any[] = [];
    const pagesRes = await serverSupabase
      .from('birthday_pages')
      .select('id, slug, recipient_name, is_published, is_paid, payment_id, is_admin_created, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (pagesRes.data) {
      surprises = pagesRes.data;
    } else {
      // Fallback query if is_admin_created / is_paid columns not yet in schema cache
      const fallbackPages = await serverSupabase
        .from('birthday_pages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fallbackPages.data) {
        surprises = fallbackPages.data.map((p: any) => ({
          ...p,
          is_paid: p.is_paid ?? p.config?.isPaid ?? p.is_published ?? false,
          is_admin_created: p.is_admin_created ?? p.config?.isAdminCreated ?? false,
          payment_id: p.payment_id ?? p.config?.paymentId ?? null
        }));
      }
    }

    let payments: any[] = [];
    try {
      const paymentsRes = await serverSupabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (paymentsRes.data) {
        payments = paymentsRes.data;
      }
    } catch {
      payments = [];
    }

    const totalSurprises = surprises.length;
    const totalPublished = surprises.filter((p: any) => p.is_published).length;
    const totalPaid = surprises.filter((p: any) => p.is_paid).length;
    const paidPayments = payments.filter((p: any) => p.status === 'paid');
    const totalRevenue = paidPayments.reduce((acc: number, curr: any) => acc + (curr.amount || 4000) / 100, 0);

    return {
      authorized: true,
      surprises,
      payments,
      metrics: {
        totalSurprises,
        totalPublished,
        totalPaid,
        totalRevenue
      }
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error fetching admin data';
    return { authorized: false, error: msg };
  }
}

/**
 * 6. Admin Free Surprise Creation:
 * Bypasses payment for administrator
 */
export async function createAdminFreeSurprise(
  authHeader: string | null,
  params: { recipientName: string; config: unknown }
): Promise<{ success: boolean; surpriseId?: string; editUrl?: string; error?: string }> {
  const adminCheck = await verifyAdminSession(authHeader);
  if (!adminCheck.authorized) {
    return { 
      success: false, 
      error: `Unauthorized: Admin authentication required. ${adminCheck.error || ''}`.trim() 
    };
  }

  const supabaseClient = getServerSupabase(authHeader) || serverSupabase;
  if (!supabaseClient) {
    return { success: false, error: 'Supabase not configured on server' };
  }

  const surpriseId = `bday-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  const cleanRecipient = params.recipientName.trim() || 'Guest of Honor';
  const cleanSlug = `${cleanRecipient.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const cfg = (params.config || {}) as Record<string, unknown>;
  cfg.id = surpriseId;
  cfg.slug = cleanSlug;
  cfg.recipientName = cleanRecipient;
  cfg.isPaid = true;
  cfg.isAdminCreated = true;
  cfg.paymentId = 'admin_complimentary';
  if (adminCheck.userId) {
    cfg.userId = adminCheck.userId;
  }

  try {
    const rowPayload: Record<string, unknown> = {
      id: surpriseId,
      slug: cleanSlug,
      recipient_name: cleanRecipient,
      is_published: false,
      is_paid: true,
      payment_id: 'admin_complimentary',
      is_admin_created: true,
      user_id: adminCheck.userId || null,
      config: cfg,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let { error: insertError } = await supabaseClient.from('birthday_pages').insert(rowPayload);

    // If database table does not yet have is_admin_created, is_paid, or payment_id column in schema cache
    if (insertError && (
      insertError.message?.includes('is_admin_created') || 
      insertError.message?.includes('is_paid') || 
      insertError.message?.includes('payment_id') ||
      insertError.message?.includes('schema cache')
    )) {
      console.warn('birthday_pages missing schema columns, retrying with core columns while preserving flags in config:', insertError.message);
      const fallbackPayload = {
        id: surpriseId,
        slug: cleanSlug,
        recipient_name: cleanRecipient,
        is_published: false,
        config: cfg,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const fallbackResult = await supabaseClient.from('birthday_pages').insert(fallbackPayload);
      insertError = fallbackResult.error;
    }

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Generate edit token for admin convenience
    const editToken = 'bday_edit_' + crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(editToken).digest('hex');

    try {
      await supabaseClient.from('surprise_edit_tokens').insert({
        surprise_id: surpriseId,
        token_hash: tokenHash
      });
    } catch (tokenErr) {
      console.warn('surprise_edit_tokens notice (admin can edit via auth):', tokenErr);
    }

    return {
      success: true,
      surpriseId,
      editUrl: `/editor/${surpriseId}?token=${editToken}`
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create admin surprise';
    return { success: false, error: msg };
  }
}

/**
 * 7. Save / Update Surprise with Edit Token or Admin Authorization:
 * Enforces that only callers possessing the valid secret token or admin authorization
 * can update the surprise in Supabase.
 */
export async function saveSurpriseWithToken(params: {
  id: string;
  token?: string | null;
  adminAuthHeader?: string | null;
  config: Record<string, unknown>;
  isPublished?: boolean;
}): Promise<{ success: boolean; config?: Record<string, unknown>; error?: string }> {
  const { id, token, adminAuthHeader, config, isPublished } = params;

  if (!id) {
    return { success: false, error: 'Missing surprise ID.' };
  }

  // Authorize via token or admin session
  const authCheck = await verifyEditToken(id, token, adminAuthHeader);
  if (!authCheck.valid) {
    return {
      success: false,
      error: 'Unauthorized: Invalid or missing edit token. You do not have permission to modify this surprise.'
    };
  }

  if (!serverSupabase) {
    return { success: false, error: 'Supabase server client not configured.' };
  }

  try {
    const cleanSlug = String(config.slug || id)
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/^-+|-+$/g, '') || id;

    const recipientName = String(config.recipientName || 'Friend');
    const updatedAt = new Date().toISOString();

    // Check if row already exists
    const { data: existingRow } = await serverSupabase
      .from('birthday_pages')
      .select('id, is_published, is_paid')
      .eq('id', id)
      .maybeSingle();

    const finalPublished = isPublished !== undefined ? isPublished : (existingRow?.is_published ?? false);

    // Security: Only verified administrators can set isAdminCreated = true!
    const isAdminCreated = authCheck.isAdmin 
      ? (config.isAdminCreated === true || (existingRow as any)?.is_admin_created === true)
      : ((existingRow as any)?.is_admin_created === true);

    const updatedConfig = {
      ...config,
      id,
      slug: cleanSlug,
      recipientName,
      isPublished: finalPublished,
      isPaid: true,
      isAdminCreated,
      updatedAt
    };

    if (existingRow) {
      let updatePayload: Record<string, unknown> = {
        slug: cleanSlug,
        recipient_name: recipientName,
        is_published: finalPublished,
        is_paid: true,
        is_admin_created: isAdminCreated,
        config: updatedConfig,
        updated_at: updatedAt
      };

      let { error: updateError } = await serverSupabase
        .from('birthday_pages')
        .update(updatePayload)
        .eq('id', id);

      // If is_admin_created or is_paid column is missing from schema, update without them
      if (updateError && (
        updateError.message?.includes('is_admin_created') || 
        updateError.message?.includes('is_paid') || 
        updateError.message?.includes('schema cache')
      )) {
        delete updatePayload.is_admin_created;
        delete updatePayload.is_paid;
        const retryResult = await serverSupabase.from('birthday_pages').update(updatePayload).eq('id', id);
        updateError = retryResult.error;
      }

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      let insertPayload: Record<string, unknown> = {
        id,
        slug: cleanSlug,
        recipient_name: recipientName,
        is_published: finalPublished,
        is_paid: true,
        is_admin_created: isAdminCreated,
        config: updatedConfig,
        created_at: updatedAt,
        updated_at: updatedAt
      };

      let { error: insertError } = await serverSupabase
        .from('birthday_pages')
        .insert(insertPayload);

      // If is_admin_created or is_paid column is missing from schema, insert without them
      if (insertError && (
        insertError.message?.includes('is_admin_created') || 
        insertError.message?.includes('is_paid') || 
        insertError.message?.includes('schema cache')
      )) {
        delete insertPayload.is_admin_created;
        delete insertPayload.is_paid;
        const retryInsert = await serverSupabase.from('birthday_pages').insert(insertPayload);
        insertError = retryInsert.error;
      }

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, config: updatedConfig };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save surprise to database';
    return { success: false, error: msg };
  }
}

/**
 * 8. Handle Razorpay Webhooks (Idempotent background processing)
 */
export async function handleRazorpayWebhook(
  rawBody: string,
  signatureHeader?: string | null
): Promise<{ success: boolean; error?: string }> {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!webhookSecret) {
    return { success: false, error: 'Razorpay webhook secret not configured' };
  }

  if (!signatureHeader) {
    return { success: false, error: 'Missing x-razorpay-signature header' };
  }

  // Verify webhook HMAC SHA-256 signature
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const isValid = safeTimingEqual(expectedSig, signatureHeader);

  if (!isValid) {
    return { success: false, error: 'Invalid webhook signature' };
  }

  try {
    const event = JSON.parse(rawBody);
    if (event.event === 'payment.captured' && event.payload?.payment?.entity) {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const notes = paymentEntity.notes || {};
      const surpriseId = notes.surpriseId;

      if (serverSupabase && orderId) {
        // Record or update payment record
        await serverSupabase.from('payments').upsert({
          surprise_id: surpriseId || null,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          amount: paymentEntity.amount || 4000,
          currency: paymentEntity.currency || 'INR',
          status: 'paid',
          updated_at: new Date().toISOString()
        }, { onConflict: 'razorpay_order_id' });

        if (surpriseId) {
          await serverSupabase
            .from('birthday_pages')
            .update({ is_paid: true, payment_id: paymentId, updated_at: new Date().toISOString() })
            .eq('id', surpriseId);
        }
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error processing webhook event';
    return { success: false, error: msg };
  }
}
