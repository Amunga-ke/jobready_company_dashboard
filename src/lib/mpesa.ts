// ─── M-Pesa Daraja API Library ───
// Handles STK Push (Lipa Na M-Pesa Online) for the JobReady company dashboard.
// The payment callback is handled by api.jobready.co.ke which shares the same DB.

const MPESA_BASE_URL =
  process.env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const MPESA_BUSINESS_SHORTCODE = process.env.MPESA_BUSINESS_SHORTCODE || "174379";
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || "";
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "";

// ─── Token caching ───
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export interface STKPushResult {
  success: boolean;
  CheckoutRequestID?: string;
  MerchantRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  errorMessage?: string;
}

/**
 * Get OAuth access token from Daraja API.
 * Token is cached in-module until it expires (typically 1 hour).
 */
export async function getMpesaAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    throw new Error(
      "M-Pesa consumer key and secret are not configured. Set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET environment variables."
    );
  }

  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to get M-Pesa access token: ${response.status} - ${text}`);
  }

  const data = await response.json();
  cachedToken = data.access_token as string;
  // Daraja tokens expire in 60 minutes; cache for 50 minutes to be safe
  tokenExpiresAt = Date.now() + 50 * 60 * 1000;

  return cachedToken!;
}

/**
 * Format a phone number to the 254... format that M-Pesa expects.
 * Handles inputs like "0712345678", "+254712345678", "254712345678".
 */
export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // If starts with "0", replace with "254"
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.slice(1);
  }
  // If starts with "+", remove it
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Validate that a phone number is in the correct Kenyan M-Pesa format.
 */
export function isValidMpesaPhone(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  return /^254[17]\d{8}$/.test(formatted);
}

/**
 * Generate the Daraja timestamp in "YYYYMMDDHHmmss" format (UTC).
 */
function generateTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

/**
 * Initiate an STK Push (Lipa Na M-Pesa Online) request.
 */
export async function initiateSTKPush(params: {
  phoneNumber: string;
  amount: number;
  description: string;
  reference: string;
}): Promise<STKPushResult> {
  const accessToken = await getMpesaAccessToken();
  const timestamp = generateTimestamp();
  const password = Buffer.from(
    `${MPESA_BUSINESS_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
  ).toString("base64");

  const formattedPhone = formatPhoneNumber(params.phoneNumber);

  if (!isValidMpesaPhone(formattedPhone)) {
    return {
      success: false,
      errorMessage: `Invalid phone number: ${params.phoneNumber}. Must be in format 2547XXXXXXXX or 2541XXXXXXXX.`,
    };
  }

  if (!MPESA_CALLBACK_URL) {
    return {
      success: false,
      errorMessage: "M-Pesa callback URL is not configured. Set MPESA_CALLBACK_URL environment variable.",
    };
  }

  // AccountReference max 12 characters
  const accountRef = params.description.slice(0, 12);

  const body = {
    BusinessShortCode: MPESA_BUSINESS_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(params.amount),
    PartyA: formattedPhone,
    PartyB: MPESA_BUSINESS_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: `${MPESA_CALLBACK_URL}?paymentId=${params.reference}`,
    AccountReference: accountRef,
    TransactionDesc: params.description,
  };

  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (data.ResponseCode === "0") {
    return {
      success: true,
      CheckoutRequestID: data.CheckoutRequestID,
      MerchantRequestID: data.MerchantRequestID,
      ResponseCode: data.ResponseCode,
      ResponseDescription: data.ResponseDescription,
    };
  }

  return {
    success: false,
    ResponseCode: data.ResponseCode,
    ResponseDescription: data.ResponseDescription,
    errorMessage: data.ResponseDescription || `M-Pesa error (code: ${data.ResponseCode || "unknown"})`,
  };
}

/**
 * Query the status of an STK Push request.
 * Useful as a fallback if the callback is delayed.
 */
export async function querySTKPushStatus(checkoutRequestId: string): Promise<{
  success: boolean;
  ResultCode?: string;
  ResultDesc?: string;
  errorMessage?: string;
}> {
  const accessToken = await getMpesaAccessToken();
  const timestamp = generateTimestamp();
  const password = Buffer.from(
    `${MPESA_BUSINESS_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
  ).toString("base64");

  const body = {
    BusinessShortCode: MPESA_BUSINESS_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (data.ResultCode === "0") {
    return {
      success: true,
      ResultCode: data.ResultCode,
      ResultDesc: data.ResultDesc,
    };
  }

  return {
    success: false,
    ResultCode: data.ResultCode,
    ResultDesc: data.ResultDesc,
    errorMessage: data.ResultDesc || `STK query error (code: ${data.ResultCode || "unknown"})`,
  };
}
