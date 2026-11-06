import React, { useState } from 'react';
import { 
  X, 
  Wallet, 
  Check, 
  Copy, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { safeFetch, isStaticMode, localWalletManager } from '../utils/apiHelper';

export default function AddMoneyModal({ isOpen, onClose, currentUser, API_BASE_URL, currentBalance = 0, onSuccess }) {
  const [amount, setAmount] = useState('500');
  const [senderName, setSenderName] = useState(currentUser?.name || '');
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (currentUser?.name) {
      setSenderName(currentUser.name);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const quickAmounts = ['200', '500', '1000', '2000', '5000'];
  const numericAmount = parseFloat(amount) || 0;
  const upiId = 'veergarments@upi';

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (numericAmount <= 0) {
      setErrorMsg('Please enter a valid top-up amount greater than ₹0.');
      return;
    }
    if (!utrNumber || utrNumber.trim().length < 6) {
      setErrorMsg('Please enter a valid UPI Reference / UTR Number from your payment receipt.');
      return;
    }

    setIsSubmitting(true);
    try {
      let requestSubmitted = false;
      let requestId = null;

      if (API_BASE_URL && !isStaticMode()) {
        const res = await safeFetch(`${API_BASE_URL}/api/wallet/request-topup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser?.id,
            email: currentUser?.email,
            customerName: (senderName || currentUser?.name || '').trim(),
            amount: numericAmount,
            paymentMethod: 'UPI',
            paymentRef: utrNumber.trim()
          })
        });

        if (res.ok && res.data) {
          requestSubmitted = true;
          requestId = res.data.request?.id || Date.now();
        } else if (!res.isHtml && res.data?.error) {
          throw new Error(res.data.error);
        }
      }

      if (!requestSubmitted) {
        // Fallback for static showcase / GitHub Pages
        const localReq = localWalletManager.createTopupRequest({
          userId: currentUser?.id,
          email: currentUser?.email,
          customerName: (senderName || currentUser?.name || '').trim(),
          amount: numericAmount,
          paymentMethod: 'UPI',
          paymentRef: utrNumber.trim()
        });
        requestId = localReq.id;
        requestSubmitted = true;
      }

      setSubmittedData({
        amount: numericAmount,
        utr: utrNumber.trim(),
        requestId: requestId
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedData(null);
    setUtrNumber('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div 
      className="modal-overlay animate-fade-in" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2500,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: '1rem',
        boxSizing: 'border-box'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleResetAndClose(); }}
    >
      <div 
        style={{
          background: 'linear-gradient(180deg, #16161b 0%, #0d0d10 100%)',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          borderRadius: '20px',
          maxWidth: '520px',
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 30px rgba(212, 175, 55, 0.15)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(212, 175, 55, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)'
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                Add Money to Wallet
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Current Balance: <strong style={{ color: 'var(--accent-gold)' }}>₹{currentBalance.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>

          <button 
            onClick={handleResetAndClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {submittedData ? (
            /* Success / Request Submitted View */
            <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(74, 222, 128, 0.15)',
                border: '2px solid #4ade80',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4ade80',
                marginBottom: '1.25rem',
                boxShadow: '0 0 20px rgba(74, 222, 128, 0.3)'
              }}>
                <Check size={36} />
              </div>

              <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                Top-Up Request Submitted!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', maxWidth: '380px', margin: '0 auto 1.5rem auto' }}>
                Your request has been sent to the store admin for bank verification.
              </p>

              {/* Summary Details Card */}
              <div style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '12px',
                padding: '1.2rem',
                textAlign: 'left',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                  <strong style={{ color: 'var(--accent-gold)', fontSize: '1.1rem' }}>₹{submittedData.amount.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>UPI Reference (UTR):</span>
                  <code style={{ color: '#fff', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                    {submittedData.utr}
                  </code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Verification Status:</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'rgba(243, 156, 18, 0.15)',
                    color: '#f39c12',
                    border: '1px solid #f39c12'
                  }}>
                    Pending Admin Review ⏳
                  </span>
                </div>
              </div>

              <div style={{
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px dashed var(--accent-gold)',
                borderRadius: '10px',
                padding: '0.85rem',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                lineHeight: '1.4',
                marginBottom: '1.5rem',
                textAlign: 'left',
                display: 'flex',
                gap: '0.6rem'
              }}>
                <ShieldCheck size={20} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                <span>
                  <strong>Anti-Fraud Verification:</strong> Our shop owner will verify the bank deposit with this UTR code. Once approved, your wallet balance will automatically update.
                </span>
              </div>

              <button
                onClick={handleResetAndClose}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontWeight: 700 }}
              >
                Done
              </button>
            </div>
          ) : (
            /* Main Form View */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {errorMsg && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Step 1: Amount Selection */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>
                  STEP 1: SELECT OR ENTER TOP-UP AMOUNT
                </label>
                
                {/* Preset Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      style={{
                        padding: '0.6rem 0.2rem',
                        borderRadius: '10px',
                        background: amount === amt ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                        border: amount === amt ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: amount === amt ? 'var(--accent-gold)' : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--accent-gold)',
                    fontWeight: 700,
                    fontSize: '1.2rem'
                  }}>
                    ₹
                  </span>
                  <input 
                    type="number"
                    min="1"
                    placeholder="Enter custom amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="form-control"
                    style={{
                      paddingLeft: '32px',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      borderColor: 'rgba(212, 175, 55, 0.3)'
                    }}
                  />
                </div>
              </div>

              {/* Step 2: UPI QR Code Card */}
              {numericAmount > 0 && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  gap: '1.2rem',
                  alignItems: 'center'
                }}>
                  <div style={{
                    background: '#fff',
                    padding: '8px',
                    borderRadius: '10px',
                    flexShrink: 0,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                  }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=Veer%20Garments&am=${numericAmount}&cu=INR`)}`}
                      alt="UPI Payment QR Code"
                      style={{ width: '110px', height: '110px', display: 'block' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      <QrCode size={14} /> Scan with Any UPI App
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                      Transfer ₹{numericAmount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Payee: <strong>Veer Garments</strong>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      marginTop: '2px',
                      width: 'fit-content'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                        {upiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Payer Name & Transaction Reference (UTR) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>
                  STEP 2: CONFIRM YOUR NAME & UPI REFERENCE (UTR) <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Your Name (as on your Bank / UPI account)"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="form-control"
                  style={{
                    fontSize: '0.9rem',
                    marginBottom: '0.65rem'
                  }}
                />
                <input 
                  type="text"
                  required
                  placeholder="Enter 12-digit UTR from GPay / PhonePe / Paytm"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="form-control"
                  style={{
                    fontSize: '0.95rem',
                    letterSpacing: '1px'
                  }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.4rem',
                  marginTop: '0.5rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  lineHeight: '1.4'
                }}>
                  <ShieldCheck size={14} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '1px' }} />
                  <span>
                    Your top-up will be credited once verified against our bank records to keep transactions authentic and secure.
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isSubmitting || numericAmount <= 0}
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.85rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 20px rgba(212, 175, 55, 0.35)'
                }}
              >
                {isSubmitting ? 'Submitting Request...' : `Submit Top-Up Request (₹${numericAmount.toLocaleString('en-IN')})`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

