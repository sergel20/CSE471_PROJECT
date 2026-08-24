// bKash Tokenized Checkout client. Confirmed empirically against the live sandbox:
// - Grant Token still runs on the older v1.2.0-beta auth infrastructure (this actually
//   returned a real id_token when tested — the newer v2 payment endpoints reuse this).
// - Create/Execute Payment use the v2 endpoints (hyphenated "tokenized-checkout" paths,
//   paymentId/trxId field casing) confirmed from the merchant demo tool's live Request/
//   Response panels.
const GRANT_TOKEN_URL = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant';
const PAYMENT_BASE_URL = process.env.BKASH_BASE_URL; // https://tokenized.sandbox.bka.sh/v2
const APP_KEY = process.env.BKASH_APP_KEY;
const APP_SECRET = process.env.BKASH_APP_SECRET;
const USERNAME = process.env.BKASH_USERNAME;
const PASSWORD = process.env.BKASH_PASSWORD;

let cachedToken = null;
let tokenExpiresAt = 0;

async function rawFetch(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || data.statusCode === 'error') {
    const error = new Error(data.statusMessage || data.errorMessage || data.message || 'bKash request failed');
    error.bkashResponse = data;
    throw error;
  }
  return data;
}

async function paymentFetch(path, options = {}) {
  await grantToken();
  return rawFetch(`${PAYMENT_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: cachedToken,
      'X-App-Key': APP_KEY,
      ...options.headers,
    },
  });
}

async function grantToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const data = await rawFetch(GRANT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: USERNAME,
      password: PASSWORD,
    },
    body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET }),
  });

  cachedToken = data.id_token;
  // Refresh a minute early to avoid edge-of-expiry failures.
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

// Confirmed live: returns { paymentId, bkashURL, transactionStatus: 'Initiated', ... }
async function createPayment({ amount, invoiceNumber, payerReference, callbackURL }) {
  return paymentFetch('/tokenized-checkout/payment/create', {
    method: 'POST',
    body: JSON.stringify({
      amount: String(amount),
      currency: 'BDT',
      intent: 'sale',
      platform: 'web',
      merchantInvoiceNumber: invoiceNumber,
      payerReference,
      callbackURL,
    }),
  });
}

// Confirmed live: returns { paymentId, trxId, transactionStatus: 'Completed', amount,
// paymentExecuteTime, payerAccount, ... } on success.
async function executePayment(paymentId) {
  return paymentFetch('/tokenized-checkout/payment/execute/', {
    method: 'POST',
    body: JSON.stringify({ paymentId }),
  });
}

async function queryPayment(paymentId) {
  return paymentFetch('/tokenized-checkout/payment/status', {
    method: 'POST',
    body: JSON.stringify({ paymentId }),
  });
}

module.exports = { createPayment, executePayment, queryPayment };