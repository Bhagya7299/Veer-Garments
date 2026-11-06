import React, { useState } from 'react';
import { X, Trash2, CreditCard, ShoppingBag, Truck, CheckCircle, ArrowLeft, Wallet, Gift, Sparkles } from 'lucide-react';

export default function Cart({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem, onClearCart, API_BASE_URL, currentUser, walletBalance = 0, onOrderSuccessCallback }) {
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD'); // COD or UPI
  const [paymentRef, setPaymentRef] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [earnedCashback, setEarnedCashback] = useState(0);

  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setCustomerName(currentUser.name);
      if (currentUser.phone) setCustomerPhone(currentUser.phone);
    }
  }, [currentUser]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const walletDiscount = (useWallet && walletBalance > 0) ? Math.min(walletBalance, subtotal) : 0;
  const finalPayable = Math.max(0, subtotal - walletDiscount);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerAddress) {
      alert('Please fill in all customer details');
      return;
    }
    if (paymentMethod === 'UPI' && !paymentRef) {
      alert('Please enter your payment Transaction ID / Reference Number.');
      return;
    }

    setIsSubmitting(true);

    try {
      let orderPlaced = false;
      let orderId = null;
      let cashback = 0;

      if (API_BASE_URL && !window.location.hostname.includes('github.io')) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customerName,
              customerPhone,
              customerAddress,
              customerEmail: currentUser?.email || null,
              userId: currentUser?.id || null,
              paymentMethod,
              totalAmount: finalPayable,
              walletUsed: walletDiscount,
              items: cartItems,
              paymentRef: paymentMethod === 'UPI' ? paymentRef : null
            })
          });

          if (response.ok) {
            const data = await response.json();
            orderPlaced = true;
            orderId = data.orderId;
            cashback = data.cashbackEarned || 0;
          }
        } catch (err) {
          console.warn('API call failed, falling back to local storage order placement');
        }
      }

      if (!orderPlaced) {
        // Fallback for GitHub Pages static showcase
        orderId = Math.floor(1000 + Math.random() * 9000);
        cashback = Math.round(finalPayable * 0.05);
        const newOrder = {
          id: orderId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: currentUser?.email || 'customer@veer.com',
          customer_address: customerAddress,
          payment_method: paymentMethod,
          total_amount: finalPayable,
          items: cartItems,
          payment_ref: paymentRef || null,
          order_status: 'Received',
          payment_status: paymentMethod === 'COD' ? 'Pending' : 'Paid',
          created_at: new Date().toISOString()
        };
        const existingOrders = JSON.parse(localStorage.getItem('veer_admin_orders') || '[]');
        localStorage.setItem('veer_admin_orders', JSON.stringify([newOrder, ...existingOrders]));
        orderPlaced = true;
      }

      setOrderSuccess(orderId);
      setEarnedCashback(cashback);
      if (onOrderSuccessCallback) {
        onOrderSuccessCallback();
      }
      onClearCart();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCheckoutMode(false);
    setOrderSuccess(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setPaymentRef('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="cart-drawer-overlay" onClick={handleClose} />
      <div className="cart-drawer animate-slide-in">
        
        {/* Header */}
        <div className="cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={20} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {orderSuccess ? 'Order Success' : checkoutMode ? 'Checkout' : 'Your Shopping Cart'}
            </h3>
          </div>
          <button onClick={handleClose} style={{ color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Success View */}
        {orderSuccess ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CheckCircle size={72} color="#2ecc71" style={{ marginBottom: '1.5rem', filter: 'drop-shadow(0 0 10px rgba(46,204,113,0.3))' }} />
            <h3 className="font-serif" style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Thank You!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Your order has been placed successfully. The shop owner will contact you shortly to confirm the shipment.
            </p>
            <div className="payment-details-card" style={{ width: '100%', textAlign: 'left' }}>
              <div><strong>Order ID:</strong> #{orderSuccess}</div>
              <div style={{ marginTop: '0.5rem' }}><strong>Method:</strong> {paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment (UPI)'}</div>
              <div style={{ marginTop: '0.5rem' }}><strong>Status:</strong> {paymentMethod === 'COD' ? 'Pending Confirmation' : 'Verification Pending'}</div>
              {earnedCashback > 0 && (
                <div style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Gift size={18} />
                  <span>🎉 Earned ₹{earnedCashback} Cashback in Veer Wallet!</span>
                </div>
              )}
            </div>
            <button className="btn-primary" onClick={handleClose} style={{ marginTop: '2rem', width: '100%', justifyContent: 'center' }}>
              Continue Shopping
            </button>
          </div>
        ) : checkoutMode ? (
          /* Checkout View */
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 70px)' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              <button 
                onClick={() => setCheckoutMode(false)} 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}
              >
                <ArrowLeft size={16} /> Back to Cart
              </button>

              <form id="checkout-form" onSubmit={handleSubmitOrder}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Contact Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Delivery Address</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Enter complete shipping address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="form-control"
                    style={{ resize: 'none' }}
                  />
                </div>

                {/* Veer Cashback Wallet Option */}
                {currentUser && walletBalance > 0 && (
                  <div style={{
                    marginTop: '1.25rem',
                    padding: '0.85rem 1rem',
                    background: useWallet ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: useWallet ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'rgba(212, 175, 55, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-gold)'
                      }}>
                        <Wallet size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          Veer Cashback Wallet
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
                          Balance: ₹{walletBalance.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', userSelect: 'none' }}>
                      <input 
                        type="checkbox" 
                        checked={useWallet} 
                        onChange={(e) => setUseWallet(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: useWallet ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                        {useWallet ? `-₹${walletDiscount}` : 'Apply'}
                      </span>
                    </label>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>Select Payment Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COD')}
                      className="form-control"
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        padding: '1rem', 
                        gap: '0.5rem',
                        borderColor: paymentMethod === 'COD' ? 'var(--accent-gold)' : 'var(--border-light)',
                        background: paymentMethod === 'COD' ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255, 255, 255, 0.01)'
                      }}
                    >
                      <Truck size={20} color={paymentMethod === 'COD' ? 'var(--accent-gold)' : 'white'} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Cash on Delivery</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI')}
                      className="form-control"
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        padding: '1rem', 
                        gap: '0.5rem',
                        borderColor: paymentMethod === 'UPI' ? 'var(--accent-gold)' : 'var(--border-light)',
                        background: paymentMethod === 'UPI' ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255, 255, 255, 0.01)'
                      }}
                    >
                      <CreditCard size={20} color={paymentMethod === 'UPI' ? 'var(--accent-gold)' : 'white'} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pay via UPI QR</span>
                    </button>
                  </div>
                </div>

                {/* QR Code flow if UPI is selected */}
                {paymentMethod === 'UPI' && (
                  <div className="animate-fade-in" style={{ marginTop: '1.5rem', padding: '1.25rem', border: '1px solid var(--border-glow)', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.02)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <span className="badge badge-gold">Scan QR Code to Pay</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Scan the shop owner's UPI QR below to transfer ₹{finalPayable.toLocaleString('en-IN')}:
                      </p>
                    </div>

                    {/* Generate custom QR API based on UPI address */}
                    <div className="qr-container">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=veergarments@upi&pn=Veer%20Garments&am=${finalPayable}&cu=INR`)}`} 
                        alt="UPI Payment QR Code" 
                        className="qr-code"
                      />
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', margin: '1rem 0' }}>
                      <div><strong>UPI ID:</strong> veergarments@upi</div>
                      <div><strong>Payee Name:</strong> Veer Garments</div>
                      <div><strong>Amount:</strong> ₹{finalPayable.toLocaleString('en-IN')}</div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ color: 'var(--text-main)' }}>Transaction ID / Ref No. <span style={{ color: '#e74c3c' }}>*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Enter 12-digit UPI reference number"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Sticky Checkout Summary Footer */}
            <div className="cart-footer">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {walletDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Wallet size={14} /> Wallet Cashback:</span>
                    <span>-₹{walletDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                  <span>Final Payable:</span>
                  <span className="cart-total-price">₹{finalPayable.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Sparkles size={12} /> Earn ₹{Math.round(finalPayable * 0.05)} (5%) cashback on this order!
                </div>
              </div>
              <button 
                type="submit" 
                form="checkout-form"
                disabled={isSubmitting} 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isSubmitting ? 'Processing Order...' : paymentMethod === 'COD' ? `Confirm COD (₹${finalPayable.toLocaleString('en-IN')})` : `Submit UPI Payment (₹${finalPayable.toLocaleString('en-IN')})`}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Cart List View */
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 70px)' }}>
            
            {/* Cart Items List */}
            <div className="cart-items-container">
              {cartItems.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <ShoppingBag size={48} style={{ marginBottom: '1rem' }} />
                  <p>Your cart is empty.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Select color and size from product details to add garments!</p>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={idx} className="cart-item">
                    <div className="cart-item-image">
                      {item.image_url ? (
                        <img src={`${API_BASE_URL}${item.image_url}`} alt={item.name} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#222' }} />
                      )}
                    </div>

                    <div className="cart-item-info">
                      <div className="cart-item-title">{item.name}</div>
                      <div className="cart-item-meta">
                        Color: {item.color} | Size: {item.size}
                      </div>
                      
                      <div className="cart-item-controls">
                        <div className="quantity-controller">
                          <button 
                            onClick={() => onUpdateQuantity(idx, item.quantity - 1)} 
                            disabled={item.quantity <= 1}
                            className="quantity-btn"
                          >
                            -
                          </button>
                          <span className="quantity-value">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(idx, item.quantity + 1)} 
                            className="quantity-btn"
                          >
                            +
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                          {item.original_price && item.original_price > item.price && (
                            <span style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                              ₹{(item.original_price * item.quantity).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        <button 
                          onClick={() => onRemoveItem(idx)} 
                          style={{ color: 'var(--text-muted)' }}
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cartItems.length > 0 && (
              <div className="cart-footer">
                <div className="cart-summary-row">
                  <span>Subtotal:</span>
                  <span className="cart-total-price">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Shipping costs and local taxes calculated at checkout.
                </p>
                <button 
                  onClick={() => setCheckoutMode(true)} 
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Proceed to Checkout
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </>
  );
}
