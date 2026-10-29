// Change to https://eu-prod.oppwa.com when you go live
const HYPERPAY_BASE = 'https://eu-test.oppwa.com';

class HyperPayForm extends HTMLElement {
  connectedCallback() {
    const p = new URLSearchParams(window.location.search);
    const checkoutId = p.get('checkoutId');
    const okUrl = p.get('okUrl');
    const failUrl = p.get('failUrl');

    if (!checkoutId || !okUrl || !failUrl) {
      this.textContent = 'Missing payment details. Please return to checkout.';
      return;
    }

    const action =
      `${window.location.origin}/_functions/result?` +
      new URLSearchParams({ okUrl, failUrl }).toString();

    const form = document.createElement('form');
    form.className = 'paymentWidgets';
    form.setAttribute('action', action);
    form.setAttribute('data-brands', 'VISA MASTER');
    this.appendChild(form);

    // Load the widget script after the form exists
    const script = document.createElement('script');
    script.src = `${HYPERPAY_BASE}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(checkoutId)}`;
    script.onerror = () => {
      this.textContent = 'Could not load the payment form. Please try again later.';
    };
    document.head.appendChild(script);
  }
}

customElements.define('hyperpay-form', HyperPayForm);
