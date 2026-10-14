// ==============================================================================
// Birthday Magic — Client-side Payment & Edit Token Management Service
// ==============================================================================
import { BirthdayPageConfig } from '../types';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads the official Razorpay Checkout SDK script
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existing) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Retrieves the stored edit token from localStorage for a given surprise ID
 */
export function getStoredEditToken(surpriseId: string): string | null {
  if (typeof window === 'undefined' || !surpriseId) return null;
  try {
    return localStorage.getItem(`bday_edit_token_${surpriseId}`) || null;
  } catch {
    return null;
  }
}

/**
 * Persists an edit token to localStorage
 */
export function storeEditToken(surpriseId: string, token: string): void {
  if (typeof window === 'undefined' || !surpriseId || !token) return;
  try {
    localStorage.setItem(`bday_edit_token_${surpriseId}`, token);
  } catch (err) {
    console.warn('Failed to save edit token to localStorage:', err);
  }
}

/**
 * Verifies an edit token or admin session with the server
 */
export async function verifyTokenWithServer(
  surpriseId: string,
  token?: string | null,
  authToken?: string | null
): Promise<{ valid: boolean; isAdmin?: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const res = await fetch('/api/verify-token', {
      method: 'POST',
      headers,
      body: JSON.stringify({ surpriseId, token: token || null })
    });

    if (!res.ok) {
      return { valid: false, error: 'Server token check failed' };
    }

    const data = await res.json();
    return { valid: Boolean(data.valid), isAdmin: Boolean(data.isAdmin) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error verifying edit token';
    return { valid: false, error: msg };
  }
}

/**
 * Saves surprise configuration securely to server via /api/save-surprise
 */
export async function saveSurpriseViaApi(params: {
  id: string;
  token?: string | null;
  config: BirthdayPageConfig;
  isPublished?: boolean;
  adminAuthToken?: string | null;
}): Promise<{ success: boolean; config?: BirthdayPageConfig; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (params.adminAuthToken) {
      headers.Authorization = `Bearer ${params.adminAuthToken}`;
    }

    const res = await fetch('/api/save-surprise', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: params.id,
        token: params.token || null,
        config: params.config,
        isPublished: params.isPublished
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to save surprise with edit token'
      };
    }

    return { success: true, config: data.config };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error during save';
    return { success: false, error: msg };
  }
}

/**
 * Initiates the complete ₹40 Razorpay payment flow:
 * 1. Server-side order creation (/api/create-order)
 * 2. Razorpay checkout modal
 * 3. Server-side payment & signature verification (/api/verify-payment)
 * 4. Token storage and unlocking
 */
export async function startRazorpayCheckout(params: {
  recipientName: string;
  tempId?: string;
  slug?: string;
  initialConfig?: BirthdayPageConfig;
  onPaymentStarted?: () => void;
  onPaymentVerifying?: () => void;
  onPaymentSuccess?: (result: { surpriseId: string; editToken: string; editUrl: string }) => void;
  onPaymentError?: (errorMessage: string) => void;
  onPaymentCancelled?: () => void;
}): Promise<void> {
  const {
    recipientName,
    tempId,
    slug,
    initialConfig,
    onPaymentStarted,
    onPaymentVerifying,
    onPaymentSuccess,
    onPaymentError,
    onPaymentCancelled
  } = params;

  onPaymentStarted?.();

  // 1. Ensure Razorpay checkout script is loaded
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    onPaymentError?.('Unable to load Razorpay payment gateway. Please check your internet connection.');
    return;
  }

  // 2. Call server to create an authorized Razorpay Order for exactly ₹40 (4000 paise)
  let orderData: {
    success: boolean;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
    surpriseId?: string;
    error?: string;
  };

  try {
    const orderRes = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientName, tempId, slug })
    });

    orderData = await orderRes.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error connecting to payment server';
    onPaymentError?.(`Payment initiation failed: ${msg}`);
    return;
  }

  if (!orderData.success || !orderData.orderId || !orderData.keyId) {
    onPaymentError?.(orderData.error || 'Failed to initiate ₹40 payment order.');
    return;
  }

  const surpriseId = orderData.surpriseId || tempId || `bday-${Date.now().toString(36)}`;

  // 3. Launch official Razorpay Checkout modal
  const options = {
    key: orderData.keyId,
    amount: orderData.amount || 4000,
    currency: orderData.currency || 'INR',
    name: 'Birthday Magic',
    description: `₹40 — Birthday Surprise for ${recipientName || 'Friend'}`,
    order_id: orderData.orderId,
    theme: {
      color: '#e11d48'
    },
    notes: {
      surpriseId,
      recipientName: recipientName || 'Friend'
    },
    modal: {
      ondismiss: () => {
        onPaymentCancelled?.();
      }
    },
    // Frontend callback received upon user action
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      // REQUIREMENT 2: Never trust the frontend callback alone!
      // Must verify HMAC SHA-256 signature and payment status with server
      onPaymentVerifying?.();

      try {
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            surpriseId,
            recipientName,
            initialConfig
          })
        });

        const verifyData = await verifyRes.json();

        if (verifyRes.ok && verifyData.success && verifyData.editToken) {
          // Persist editing token locally for uninterrupted creator experience
          storeEditToken(surpriseId, verifyData.editToken);

          onPaymentSuccess?.({
            surpriseId: verifyData.surpriseId || surpriseId,
            editToken: verifyData.editToken,
            editUrl: verifyData.editUrl || `/editor/${surpriseId}?token=${verifyData.editToken}`
          });
        } else {
          onPaymentError?.(
            verifyData.error || 'Payment verification failed on the server. Editor access was not granted.'
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error verifying payment.';
        onPaymentError?.(`Payment verification failed: ${msg}. If money was debited, contact support.`);
      }
    }
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response: any) => {
      const desc = response.error?.description || 'Payment was declined or cancelled.';
      onPaymentError?.(`Payment unsuccessful: ${desc}`);
    });
    rzp.open();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to open Razorpay modal';
    onPaymentError?.(msg);
  }
}
