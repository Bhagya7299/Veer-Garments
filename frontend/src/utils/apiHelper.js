// ========================================================
// API HELPER & OFFLINE / GITHUB PAGES LOCAL STORAGE ENGINE
// Protects against "Unexpected token '<', <html>..." errors
// ========================================================

export const isStaticMode = () => {
  return typeof window !== 'undefined' && window.location.hostname.includes('github.io');
};

/**
 * Safe fetch wrapper that never throws SyntaxError on HTML 404 responses
 */
export const safeFetch = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    // Check if response is HTML (starts with <!DOCTYPE or <html or <)
    const trimmed = text.trim();
    if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE')) {
      return {
        ok: false,
        status: res.status,
        data: null,
        isHtml: true,
        error: `Endpoint not found (${res.status})`
      };
    }

    try {
      const json = JSON.parse(text);
      return {
        ok: res.ok,
        status: res.status,
        data: json,
        isHtml: false
      };
    } catch (parseErr) {
      return {
        ok: false,
        status: res.status,
        data: null,
        isHtml: false,
        error: 'Invalid JSON response'
      };
    }
  } catch (netErr) {
    return {
      ok: false,
      status: 0,
      data: null,
      isHtml: false,
      error: netErr.message || 'Network error'
    };
  }
};

/**
 * Local Storage Wallet & Top-up Request Manager
 * Allows real wallet top-ups, approvals, and balances to work on static GitHub Pages
 */
export const localWalletManager = {
  getWalletKey(email) {
    const clean = (email || 'customer@veer.com').toLowerCase().trim();
    return `veer_wallet_${clean}`;
  },

  getWallet(email) {
    try {
      const raw = localStorage.getItem(this.getWalletKey(email));
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { balance: 0, transactions: [] };
  },

  creditWallet(email, amount, description) {
    const num = parseFloat(amount) || 0;
    const wallet = this.getWallet(email);
    wallet.balance = Math.round((wallet.balance + num) * 100) / 100;
    wallet.transactions.unshift({
      id: Date.now(),
      amount: num,
      type: 'credit',
      description: description || `Wallet Top-Up Credited`,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(this.getWalletKey(email), JSON.stringify(wallet));
    return wallet;
  },

  debitWallet(email, amount, description) {
    const num = parseFloat(amount) || 0;
    const wallet = this.getWallet(email);
    wallet.balance = Math.max(0, Math.round((wallet.balance - num) * 100) / 100);
    wallet.transactions.unshift({
      id: Date.now(),
      amount: num,
      type: 'debit',
      description: description || `Redeemed on Order`,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(this.getWalletKey(email), JSON.stringify(wallet));
    return wallet;
  },

  createTopupRequest({ userId, email, customerName, amount, paymentMethod, paymentRef }) {
    const requests = this.getTopupRequests();
    const newReq = {
      id: Math.floor(100 + Math.random() * 900),
      user_id: userId || 1,
      email: email || 'customer@veer.com',
      customer_name: customerName || 'Customer',
      amount: parseFloat(amount),
      payment_method: paymentMethod || 'UPI',
      payment_ref: paymentRef,
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    requests.unshift(newReq);
    localStorage.setItem('veer_wallet_requests', JSON.stringify(requests));
    return newReq;
  },

  getTopupRequests() {
    try {
      const raw = localStorage.getItem('veer_wallet_requests');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  },

  approveTopupRequest(id) {
    const requests = this.getTopupRequests();
    const req = requests.find(r => r.id === parseInt(id) || r.id === id);
    if (!req) return false;
    req.status = 'Approved';
    localStorage.setItem('veer_wallet_requests', JSON.stringify(requests));
    this.creditWallet(req.email, req.amount, `UPI Top-Up Verified (Ref: ${req.payment_ref})`);
    return req;
  },

  rejectTopupRequest(id, reason) {
    const requests = this.getTopupRequests();
    const req = requests.find(r => r.id === parseInt(id) || r.id === id);
    if (!req) return false;
    req.status = 'Rejected';
    req.admin_notes = reason || 'Payment not verified in bank account';
    localStorage.setItem('veer_wallet_requests', JSON.stringify(requests));
    return req;
  }
};

