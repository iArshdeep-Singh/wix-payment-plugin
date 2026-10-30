import { ok, badRequest, response } from 'wix-http-functions';
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import wixPaymentProviderBackend from 'wix-payment-provider-backend';


// ════════════════════════════════════════════════════════
//  HYPERPAY 
// ════════════════════════════════════════════════════════
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

// Health check: https://www.olyvera.me/_functions/ping
export function get_ping(request) {
  return ok({
    body: 'http-functions is live',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Card form page: https://www.olyvera.me/_functions/pay
export async function get_pay(request) {
  const { checkoutId, okUrl, failUrl } = request.query;
  if (!checkoutId) return badRequest({ body: 'Missing checkoutId' });

  const base = ("https://eu-test.oppwa.com/").trim().replace(/\/$/, '');
  const q = new URLSearchParams({ okUrl, failUrl });
  const action = `${new URL(request.url || 'https://www.olyvera.me').origin}/_functions/result?${q.toString()}`;
  const scriptSrc = `${base}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(checkoutId)}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pay</title>
</head>
<body style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:0 16px">
  <p id="status" style="color:#666;font-size:13px">Loading payment form from ${esc(base)} ...</p>
  <form action="${esc(action)}" class="paymentWidgets" data-brands="VISA MASTER"></form>
  <script>
    window.wpwlOptions = { style: 'card' };
  </script>
  <script src="${esc(scriptSrc)}"
    onload="document.getElementById('status').textContent=''"
    onerror="document.getElementById('status').textContent='Could not load HyperPay script from: ${esc(base)}. Check HYPERPAY_BASE_URL.'">
  </script>
</body>
</html>`;

  return ok({ body: html, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// HyperPay redirects here after payment: https://www.olyvera.me/_functions/result
export async function get_result(request) {
  const { resourcePath, okUrl, failUrl } = request.query;
  if (!resourcePath || !resourcePath.startsWith('/v1/checkouts/')) {
    return badRequest({ body: 'Invalid request' });
  }

  const entityId = await getSecret('HYPERPAY_ENTITY_ID');
  const token = await getSecret('HYPERPAY_TOKEN');
  const base = (await getSecret('HYPERPAY_BASE_URL')).replace(/\/$/, '');


  const res = await fetch(`${base}${resourcePath}?entityId=${entityId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  const code = (data.result && data.result.code) || '';
  const success = /^(000\.000\.|000\.100\.1|000\.[36])/.test(code);
  const checkoutId = resourcePath.split('/')[3];

  const transaction = {
    wixTransactionId: data.merchantTransactionId,
    pluginTransactionId: checkoutId
  };
  if (!success) {
    transaction.reasonCode = 3012;
    transaction.errorCode = code;
    transaction.errorMessage = (data.result && data.result.description) || 'Payment failed';
  }

  try {
    await wixPaymentProviderBackend.submitEvent({ event: { transaction } });
  } catch (e) {
    console.error('submitEvent failed', e);
  }

  return response({
    status: 302,
    headers: { Location: success ? okUrl : failUrl }
  });
}


