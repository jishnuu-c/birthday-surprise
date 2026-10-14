import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyEditToken,
  saveSurpriseWithToken,
  createAdminFreeSurprise,
  serverSupabase
} from '../server/paymentHandlers';
import { getStoredEditToken, storeEditToken } from '../lib/paymentService';

describe('Payment & Edit Token Security Engine (Requirements 2 & 3)', () => {
  const mockSecret = 'test_secret_key_1234567890';

  beforeEach(() => {
    process.env.PAYMENTS_ENABLED = 'true';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_123456';
    process.env.RAZORPAY_KEY_SECRET = mockSecret;
  });

  it('blocks order creation with temporary unavailability message when payments are disabled', async () => {
    delete process.env.PAYMENTS_ENABLED;
    const res = await createRazorpayOrder({ recipientName: 'Sophia' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Payments are temporarily unavailable. Please try again later.');
  });

  it('blocks payment verification with temporary unavailability message when payments are disabled', async () => {
    delete process.env.PAYMENTS_ENABLED;
    const res = await verifyRazorpayPayment({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'sig_123',
      surpriseId: 'bday-123'
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Payments are temporarily unavailable. Please try again later.');
  });

  it('enforces ₹40 (4000 paise) amount and INR currency on Razorpay order creation', async () => {
    // Spy on global fetch to verify payload sent to Razorpay API
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const body = JSON.parse(init?.body as string);
      expect(body.amount).toBe(4000); // Must be exactly ₹40.00
      expect(body.currency).toBe('INR');

      return {
        ok: true,
        json: async () => ({
          id: 'order_test_12345',
          amount: 4000,
          currency: 'INR',
          status: 'created'
        })
      } as any;
    });

    const res = await createRazorpayOrder({ recipientName: 'Sophia' });

    expect(res.success).toBe(true);
    expect(res.orderId).toBe('order_test_12345');
    expect(res.amount).toBe(4000);
    expect(res.currency).toBe('INR');
    expect(res.surpriseId).toBeDefined();

    fetchSpy.mockRestore();
  });

  it('rejects tampered or invalid payment signatures cryptographically (Requirement 2)', async () => {
    const orderId = 'order_valid_123';
    const paymentId = 'pay_valid_456';
    const fakeSignature = 'tampered_or_invalid_signature_hex';

    const res = await verifyRazorpayPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: fakeSignature,
      surpriseId: 'bday-test-1'
    });

    // Must NEVER trust frontend callback alone
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid payment signature');
    expect(res.editToken).toBeUndefined();
  });

  it('generates a unique unguessable edit token upon genuine cryptographic verification', async () => {
    const orderId = 'order_test_abc';
    const paymentId = 'pay_test_xyz';

    // Calculate real cryptographic HMAC SHA-256 signature
    const validSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Mock Razorpay API response confirming captured payment for ₹40
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({
          id: paymentId,
          order_id: orderId,
          amount: 4000,
          currency: 'INR',
          status: 'captured'
        })
      } as any;
    });

    const res = await verifyRazorpayPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      surpriseId: 'bday-test-verified-1',
      recipientName: 'Sophia'
    });

    expect(res.success).toBe(true);
    expect(res.surpriseId).toBe('bday-test-verified-1');
    expect(res.editToken).toBeDefined();
    expect(res.editToken).toMatch(/^bday_edit_[a-f0-9]{48}$/); // 24 random bytes hex = 48 chars
    expect(res.editUrl).toContain(`?token=${res.editToken}`);

    fetchSpy.mockRestore();
  });

  it('rejects edit operations when token is missing or unauthorized (Requirement 3 & 6)', async () => {
    const res = await saveSurpriseWithToken({
      id: 'bday-test-protected',
      token: 'invalid_token_123',
      config: { recipientName: 'Hacker Attempt' }
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Unauthorized');
  });

  it('rejects payments where Razorpay status is not captured/authorized', async () => {
    const orderId = 'order_status_check';
    const paymentId = 'pay_status_check';
    const validSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({
          id: paymentId,
          order_id: orderId,
          amount: 4000,
          currency: 'INR',
          status: 'failed' // Razorpay status is failed
        })
      } as any;
    });

    const res = await verifyRazorpayPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      surpriseId: 'bday-test-failed'
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Payment not completed');
    expect(res.editToken).toBeUndefined();

    fetchSpy.mockRestore();
  });

  it('rejects payments where amount is not ₹40 (4000 paise)', async () => {
    const orderId = 'order_amount_check';
    const paymentId = 'pay_amount_check';
    const validSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({
          id: paymentId,
          order_id: orderId,
          amount: 1000, // Tampered ₹10 instead of ₹40
          currency: 'INR',
          status: 'captured'
        })
      } as any;
    });

    const res = await verifyRazorpayPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      surpriseId: 'bday-test-amount-mismatch'
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid payment amount');
    expect(res.editToken).toBeUndefined();

    fetchSpy.mockRestore();
  });

  it('rejects payments where Razorpay order_id does not match the requested order', async () => {
    const orderId = 'order_real_123';
    const paymentId = 'pay_real_456';
    const validSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({
          id: paymentId,
          order_id: 'order_DIFFERENT_999', // Order ID mismatch
          amount: 4000,
          currency: 'INR',
          status: 'captured'
        })
      } as any;
    });

    const res = await verifyRazorpayPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      surpriseId: 'bday-test-order-mismatch'
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Payment order ID does not match');
    expect(res.editToken).toBeUndefined();

    fetchSpy.mockRestore();
  });

  it('manages edit token persistence and retrieval in localStorage cleanly without leaking', () => {
    const testId = 'bday-persist-test';
    const testToken = 'bday_edit_abcdef1234567890';

    storeEditToken(testId, testToken);
    expect(getStoredEditToken(testId)).toBe(testToken);

    // Another surprise must not inherit the token
    expect(getStoredEditToken('different-surprise-id')).toBeNull();
  });

  it('blocks createAdminFreeSurprise when no administrator authorization is provided', async () => {
    const resNoAuth = await createAdminFreeSurprise(null, {
      recipientName: 'VIP Bestie',
      config: {}
    });
    expect(resNoAuth.success).toBe(false);
    expect(resNoAuth.error).toContain('Unauthorized: Admin authentication required');

    const resInvalidAuth = await createAdminFreeSurprise('Bearer invalid_token_xyz', {
      recipientName: 'VIP Bestie',
      config: {}
    });
    expect(resInvalidAuth.success).toBe(false);
    expect(resInvalidAuth.error).toContain('Unauthorized: Admin authentication required');
  });

  it('allows verified administrator to create complimentary surprises without payment', async () => {
    process.env.ADMIN_SECRET_KEY = 'super_secret_admin_key_777';
    const authHeader = 'Bearer super_secret_admin_key_777';

    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromSpy = vi.spyOn(serverSupabase, 'from').mockReturnValue({
      insert: insertMock,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    } as any);

    const res = await createAdminFreeSurprise(authHeader, {
      recipientName: 'Complimentary Star',
      config: { pageTitle: 'Happy Birthday' }
    });

    expect(res.success).toBe(true);
    expect(res.surpriseId).toMatch(/^bday-/);
    expect(res.editUrl).toContain('/editor/');
    expect(insertMock).toHaveBeenCalled();

    fromSpy.mockRestore();
  });

  it('prevents non-admin callers from forging or setting isAdminCreated = true via saveSurpriseWithToken', async () => {
    // When a caller without admin credentials sends config with isAdminCreated: true
    const res = await saveSurpriseWithToken({
      id: 'bday-tamper-attempt',
      token: 'invalid_public_token',
      adminAuthHeader: null,
      config: {
        recipientName: 'Hacker',
        isAdminCreated: true,
        isPaid: true
      }
    });

    // Unauthenticated/untokened modification is completely blocked
    expect(res.success).toBe(false);
    expect(res.error).toContain('Unauthorized');
  });
});
