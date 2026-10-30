import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';

// Called when you click "Connect" in Accept Payments
export const connectAccount = async (options) => {
  return { credentials: options.credentials || {} };
};

// Called when the customer clicks "Place Order"
export const createTransaction = async (options) => {
  try {
    const { merchantCredentials, order, wixTransactionId } = options;

    // Amount + currency live under order.description
    const { totalAmount, currency } = order.description;

    // const entityId = await getSecret('HYPERPAY_ENTITY_ID');
    // const token = await getSecret('HYPERPAY_TOKEN');
    // const base = (await getSecret('HYPERPAY_BASE_URL')).replace(/\/$/, '');
    const entityId = "8ac7a4daa16cc13f01a171b3a0820232";
    const token = "OGFjN2E0ZDlhMTZjYjkwOTAxYTE3MWI2NjViZTAyYjB8UFRVeVpvRCVzIzhaOkxrOnpDMzM=";
    const base = "https://eu-test.oppwa.com/";

    const body = new URLSearchParams({
      entityId,
      amount: (Number(totalAmount) / 100).toFixed(2), // smallest unit -> major unit
      currency : "USD",
      paymentType: 'DB',
      merchantTransactionId: wixTransactionId
    });

    const res = await fetch(`${base}/v1/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    const data = await res.json();

    if (!data.id) {
      console.error('HyperPay prepare failed:', JSON.stringify(data));
      return {
        reasonCode: 2000,
        errorCode: data.result && data.result.code,
        errorMessage: (data.result && data.result.description) || 'HyperPay could not prepare the checkout'
      };
    }

    // Use the site's own origin from Wix's return URL (no credentials needed)
    // const site = new URL(order.returnUrls.successUrl).origin;
    // Your own site's domain (where /_functions/pay lives), not Wix's cashier domain
    const SITE_FALLBACK = 'https://www.olyvera.me';
    const site = (
      (merchantCredentials && merchantCredentials.siteUrl && merchantCredentials.siteUrl.startsWith('http'))
        ? merchantCredentials.siteUrl
        : SITE_FALLBACK
    ).replace(/\/$/, '');

    const q = new URLSearchParams({
      checkoutId: data.id,
      okUrl: order.returnUrls.successUrl,
      failUrl: order.returnUrls.errorUrl
    });

    // return {
    //   pluginTransactionId: data.id,
    //   redirectUrl: `${site}/_functions/pay?${q.toString()}`
    // };

    return {
      pluginTransactionId: data.id,
      redirectUrl: `${site}/hyperpay-pay?${q.toString()}`
    };
  } catch (e) {
    console.error('createTransaction crashed:', e && e.message, e && e.stack);
    return {
      reasonCode: 2000,
      errorMessage: 'Unexpected error: ' + (e && e.message)
    };
  }
};

// Refunds are done from the HyperPay back office
export const refundTransaction = async () => {
  return {
    reasonCode: 2000,
    errorMessage: 'Please refund from the HyperPay dashboard.'
  };
};
