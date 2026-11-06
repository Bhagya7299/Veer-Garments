import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Lock, 
  Home, 
  RefreshCw, 
  LogOut, 
  Package, 
  X, 
  Wallet, 
  Gift, 
  Sparkles, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight,
  PlusCircle,
  Building2,
  User,
  ChevronDown,
  HelpCircle,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  Edit2
} from 'lucide-react';
import CustomerView from './components/CustomerView';
import AdminPanel from './components/AdminPanel';
import Cart from './components/Cart';
import LoginPage from './components/LoginPage';
import AddMoneyModal from './components/AddMoneyModal';

const API_BASE_URL = typeof window !== 'undefined' && (window.location.port === '5174' || window.location.port === '5173')
  ? `http://${window.location.hostname}:5001`
  : (typeof window !== 'undefined' && window.location.hostname.includes('github.io') ? '.' : '');

// Isolated localStorage key per user account
const getCartStorageKey = (user) => {
  if (!user) return null;
  const identifier = (user.email || user.id || '').toString().toLowerCase().trim();
  return identifier ? `veer_cart_${identifier}` : null;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('veer_user') || sessionStorage.getItem('veer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [view, setView] = useState('home'); // home, admin
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // User-specific orders modal
  const [userOrdersModalOpen, setUserOrdersModalOpen] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);

  // User-specific wallet & cashback state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [addMoneyModalOpen, setAddMoneyModalOpen] = useState(false);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [userTopupRequests, setUserTopupRequests] = useState([]);

  // Profile dropdown and modals
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // User profile personal info & address
  const [userPhone, setUserPhone] = useState(() => {
    return localStorage.getItem(`veer_phone_${currentUser?.email || 'default'}`) || '';
  });
  const [userAddress, setUserAddress] = useState(() => {
    return localStorage.getItem(`veer_address_${currentUser?.email || 'default'}`) || '';
  });
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [tempName, setTempName] = useState(currentUser?.name || '');
  const [tempPhone, setTempPhone] = useState(userPhone);
  const [tempAddress, setTempAddress] = useState(userAddress);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveProfile = () => {
    if (tempName.trim()) {
      const updated = { ...currentUser, name: tempName.trim() };
      setCurrentUser(updated);
      localStorage.setItem('veer_user', JSON.stringify(updated));
    }
    setUserPhone(tempPhone);
    setUserAddress(tempAddress);
    if (currentUser?.email) {
      localStorage.setItem(`veer_phone_${currentUser.email}`, tempPhone);
      localStorage.setItem(`veer_address_${currentUser.email}`, tempAddress);
    }
    setEditProfileMode(false);
  };

  // Auth Handlers
  // Customer role check: customer accounts should not see or access the owner portal
  const isCustomer = Boolean(currentUser && (currentUser.role === 'customer' || !currentUser.role || currentUser.role !== 'admin'));

  // Safety guard: if a registered customer is logged in, ensure view never stays on admin
  useEffect(() => {
    if (isCustomer && view === 'admin') {
      setView('home');
    }
  }, [isCustomer, view]);

  const handleLoginSuccess = (userData, remember = true) => {
    setCurrentUser(userData);
    if (remember) {
      localStorage.setItem('veer_user', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('veer_user', JSON.stringify(userData));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCart([]);
    setWalletBalance(0);
    setWalletTransactions([]);
    localStorage.removeItem('veer_user');
    sessionStorage.removeItem('veer_user');
    localStorage.removeItem('veer_cart');
    setView('home');
  };

  // Fetch initial catalog data
  const fetchData = async () => {
    setLoading(true);
    try {
      let loaded = false;
      if (API_BASE_URL && !window.location.hostname.includes('github.io')) {
        try {
          const prodRes = await fetch(`${API_BASE_URL}/api/products`);
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            setProducts(prodData);
            loaded = true;
          }
        } catch (e) {
          console.warn('Backend API unavailable, falling back to static products.json');
        }
      }

      // If backend not reached or on static GitHub Pages, load static products.json
      if (!loaded) {
        try {
          const staticRes = await fetch('./products.json');
          if (staticRes.ok) {
            const staticData = await staticRes.json();
            const localProducts = JSON.parse(localStorage.getItem('veer_local_products') || '[]');
            setProducts([...localProducts, ...staticData]);
          }
        } catch (err) {
          console.error('Could not load static products.json:', err);
        }
      }

      const adminPass = sessionStorage.getItem('admin_pass');
      if (adminPass === 'admin123') {
        let ordLoaded = false;
        if (API_BASE_URL && !window.location.hostname.includes('github.io')) {
          try {
            const ordRes = await fetch(`${API_BASE_URL}/api/orders`, {
              headers: { 'x-admin-password': adminPass }
            });
            if (ordRes.ok) {
              const ordData = await ordRes.json();
              setOrders(ordData);
              ordLoaded = true;
            }
          } catch (e) {}
        }
        if (!ordLoaded) {
          const savedOrders = JSON.parse(localStorage.getItem('veer_admin_orders') || 'null');
          if (savedOrders) {
            setOrders(savedOrders);
          } else {
            try {
              const initOrdRes = await fetch('./initial_orders.json');
              if (initOrdRes.ok) {
                const initOrdData = await initOrdRes.json();
                setOrders(initOrdData);
                localStorage.setItem('veer_admin_orders', JSON.stringify(initOrdData));
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch user wallet & cashbacks
  const fetchUserWallet = async () => {
    if (!currentUser) return;
    setLoadingWallet(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet?userId=${currentUser.id || ''}&email=${encodeURIComponent(currentUser.email || '')}`);
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance || 0);
        setWalletTransactions(data.transactions || []);
      }
      // Also fetch pending top-up requests
      const reqRes = await fetch(`${API_BASE_URL}/api/wallet/my-requests?userId=${currentUser.id || ''}&email=${encodeURIComponent(currentUser.email || '')}`);
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setUserTopupRequests(reqData);
      }
    } catch (err) {
      console.error('Failed to load wallet:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Fetch orders specifically placed by current user
  const fetchUserOrders = async () => {
    if (!currentUser) return;
    setLoadingUserOrders(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/orders?userId=${currentUser.id || ''}&email=${encodeURIComponent(currentUser.email || '')}`);
      if (res.ok) {
        const data = await res.json();
        setUserOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch user orders:', err);
    } finally {
      setLoadingUserOrders(false);
    }
  };

  // Load & Sync Cart per user account (isolated per account)
  useEffect(() => {
    if (!currentUser) {
      setCart([]);
      return;
    }

    const key = getCartStorageKey(currentUser);
    
    // 1. Immediately load local cached cart for this user
    if (key) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCart(parsed);
          }
        } else {
          setCart([]);
        }
      } catch (err) {
        setCart([]);
      }
    }

    // 2. Fetch latest cart from database for this specific user
    const fetchDbCart = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cart?userId=${currentUser.id || ''}&email=${encodeURIComponent(currentUser.email || '')}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            setCart(data.items);
            if (key) {
              localStorage.setItem(key, JSON.stringify(data.items));
            }
          }
        }
      } catch (e) {
        console.error('Error fetching user cart from DB:', e);
      }
    };

    fetchDbCart();
    fetchUserWallet();
  }, [currentUser?.email, currentUser?.id]);

  // Save cart per user (both to localStorage and backend database)
  const saveCart = (newCart) => {
    setCart(newCart);
    const key = getCartStorageKey(currentUser);
    if (key) {
      localStorage.setItem(key, JSON.stringify(newCart));
    }

    if (currentUser && (currentUser.id || currentUser.email)) {
      fetch(`${API_BASE_URL}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id || null,
          email: currentUser.email || null,
          items: newCart
        })
      }).catch(err => console.error('Failed to sync cart:', err));
    }
  };

  // Add item to cart
  const handleAddToCart = (newItem) => {
    const existingIndex = cart.findIndex(
      item => 
        item.product_id === newItem.product_id && 
        (item.color || '').trim().toLowerCase() === (newItem.color || '').trim().toLowerCase() && 
        (item.size || '').trim().toLowerCase() === (newItem.size || '').trim().toLowerCase()
    );

    let updatedCart;
    if (existingIndex > -1) {
      updatedCart = [...cart];
      updatedCart[existingIndex].quantity += (newItem.quantity || 1);
    } else {
      updatedCart = [...cart, newItem];
    }
    saveCart(updatedCart);
    setCartOpen(true);
  };

  // Update item quantity
  const handleUpdateCartQty = (index, newQty) => {
    if (newQty <= 0) return;
    const updatedCart = [...cart];
    updatedCart[index].quantity = newQty;
    saveCart(updatedCart);
  };

  // Remove item from cart
  const handleRemoveCartItem = (index) => {
    const updatedCart = cart.filter((_, idx) => idx !== index);
    saveCart(updatedCart);
  };

  // Clear cart
  const handleClearCart = () => {
    setCart([]);
    const key = getCartStorageKey(currentUser);
    if (key) {
      localStorage.removeItem(key);
    }
    if (currentUser && (currentUser.id || currentUser.email)) {
      fetch(`${API_BASE_URL}/api/cart?userId=${currentUser.id || ''}&email=${encodeURIComponent(currentUser.email || '')}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
  };

  const handleOpenUserOrders = () => {
    setUserOrdersModalOpen(true);
    fetchUserOrders();
  };

  // Total cart items count
  const cartItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  // If user is not logged in and not in owner portal, require login/account creation
  if (!currentUser && view !== 'admin') {
    return (
      <div className="app-container">
        {/* Minimal Auth Header */}
        <header className="header">
          <div className="container header-container">
            <a href="#" className="logo" onClick={(e) => { e.preventDefault(); setView('home'); }}>
              VEER <span>Garments</span>
            </a>
            <div className="header-actions">
              <button 
                onClick={() => setView('admin')} 
                className="nav-link" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Lock size={15} /> Owner Portal
              </button>
            </div>
          </div>
        </header>

        {/* Exclusive Sign In / Registration Gate */}
        <LoginPage 
          onLoginSuccess={handleLoginSuccess} 
          API_BASE_URL={API_BASE_URL}
          onOpenAdmin={() => setView('admin')}
        />

        {/* Footer */}
        <footer className="footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '2rem 0' }}>
          <div className="container" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <p>&copy; {new Date().getFullYear()} Veer Garments. All Rights Reserved. Luxury Quality Clothing.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header Nav */}
      <header className="header">
        <div className="container header-container">
          <a href="#" className="logo" onClick={(e) => { e.preventDefault(); setView('home'); }}>
            VEER <span>Garments</span>
          </a>

          <nav className="nav-links">
            {!isCustomer && (
              <button 
                onClick={() => setView('admin')} 
                className={`nav-link ${view === 'admin' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Lock size={16} /> Owner Portal
              </button>
            )}
          </nav>

          <div className="header-actions">
            {currentUser && (
              <>
                {/* Combined Wallet & Add Money Widget in Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <button 
                    onClick={() => { setWalletModalOpen(true); fetchUserWallet(); }}
                    title="View Wallet Balance & History"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.45rem', 
                      padding: '0.45rem 0.75rem', 
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-gold)',
                      cursor: 'pointer'
                    }}
                  >
                    <Wallet size={16} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>₹{walletBalance.toLocaleString('en-IN')}</span>
                  </button>

                  <button
                    onClick={() => { setAddMoneyModalOpen(true); }}
                    title="Add Money to Wallet"
                    style={{
                      background: 'var(--accent-gold)',
                      color: '#0a0a0c',
                      border: 'none',
                      padding: '0.45rem 0.7rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      borderLeft: '1px solid rgba(212,175,55,0.4)'
                    }}
                  >
                    <PlusCircle size={13} />
                    <span>+ Add</span>
                  </button>
                </div>

                {/* My Profile Dropdown Button */}
                <div className="profile-dropdown-container" ref={profileMenuRef} style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setProfileMenuOpen(prev => !prev)}
                    className="profile-menu-trigger-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      padding: '0.42rem 0.85rem 0.42rem 0.45rem',
                      borderRadius: '50px',
                      border: profileMenuOpen ? '1px solid var(--accent-gold)' : '1px solid rgba(212, 175, 55, 0.45)',
                      background: profileMenuOpen ? 'rgba(212, 175, 55, 0.18)' : 'rgba(212, 175, 55, 0.08)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: profileMenuOpen ? '0 0 15px rgba(212, 175, 55, 0.25)' : 'none'
                    }}
                    title="Account & Profile Menu"
                  >
                    <div className="user-avatar-circle" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f3f4f6' }}>
                      My Profile
                    </span>
                    {cartItemsCount > 0 && (
                      <span style={{
                        background: 'var(--accent-gold)',
                        color: '#000',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '10px'
                      }}>
                        {cartItemsCount}
                      </span>
                    )}
                    <ChevronDown 
                      size={14} 
                      style={{ 
                        color: 'var(--accent-gold)',
                        transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }} 
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {profileMenuOpen && (
                    <div 
                      className="profile-dropdown-menu animate-fade-in"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: '270px',
                        background: '#121217',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                        borderRadius: '14px',
                        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.85), 0 0 20px rgba(212, 175, 55, 0.15)',
                        padding: '0.5rem 0',
                        zIndex: 1050,
                        backdropFilter: 'blur(16px)'
                      }}
                    >
                      {/* User Card Header */}
                      <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#fff' }}>
                          {currentUser.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {currentUser.email}
                        </div>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          marginTop: '0.45rem',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          background: 'rgba(212, 175, 55, 0.12)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          fontSize: '0.72rem',
                          color: 'var(--accent-gold)',
                          fontWeight: 600
                        }}>
                          <Sparkles size={11} /> Veer Privilege Member
                        </div>
                      </div>

                      {/* Menu Items List */}
                      <div style={{ padding: '0.35rem 0' }}>
                        {/* 1. My Profile */}
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            setProfileModalOpen(true);
                          }}
                          className="profile-menu-item"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                            <User size={16} style={{ color: 'var(--accent-gold)' }} />
                            <span>My Profile</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Details</span>
                        </button>

                        {/* 2. My Orders */}
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            handleOpenUserOrders();
                          }}
                          className="profile-menu-item"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                            <Package size={16} style={{ color: 'var(--accent-gold)' }} />
                            <span>My Orders</span>
                          </div>
                          {userOrders.length > 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', background: 'rgba(212,175,55,0.15)', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>
                              {userOrders.length}
                            </span>
                          )}
                        </button>

                        {/* 3. Cart */}
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            setCartOpen(true);
                          }}
                          className="profile-menu-item"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                            <ShoppingBag size={16} style={{ color: 'var(--accent-gold)' }} />
                            <span>Cart</span>
                          </div>
                          {cartItemsCount > 0 ? (
                            <span style={{
                              background: 'var(--accent-gold)',
                              color: '#000',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px'
                            }}>
                              {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'items'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Empty</span>
                          )}
                        </button>

                        {/* 4. Help */}
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            setHelpModalOpen(true);
                          }}
                          className="profile-menu-item"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                            <HelpCircle size={16} style={{ color: 'var(--accent-gold)' }} />
                            <span>Help</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>24x7</span>
                        </button>
                      </div>

                      {/* Divider */}
                      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '0.25rem 0' }} />

                      {/* 5. Logout */}
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="profile-menu-item logout-item"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {loading && products.length === 0 ? (
          <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading garments catalog...</p>
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        ) : (
          <>
            {view === 'home' || isCustomer ? (
              <CustomerView 
                products={products} 
                onAddToCart={handleAddToCart}
                API_BASE_URL={API_BASE_URL}
                openCart={() => setCartOpen(true)}
              />
            ) : (
              <AdminPanel 
                products={products}
                orders={orders}
                onRefreshData={fetchData}
                API_BASE_URL={API_BASE_URL}
                onBackToStore={() => setView('home')}
              />
            )}
          </>
        )}
      </main>

      {/* Cart Drawer Panel */}
      <Cart 
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        API_BASE_URL={API_BASE_URL}
        currentUser={currentUser}
        walletBalance={walletBalance}
        onOrderSuccessCallback={() => {
          fetchUserWallet();
          fetchUserOrders();
        }}
      />

      {/* User Orders Modal (Isolated per customer account) */}
      {userOrdersModalOpen && (
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
            zIndex: 1100,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '1rem',
            boxSizing: 'border-box'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setUserOrdersModalOpen(false); }}
        >
          <div style={{
            background: 'var(--bg-card, #121216)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '92%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Package size={20} style={{ color: 'var(--accent-gold)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                  My Orders <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({currentUser?.email})</span>
                </h3>
              </div>
              <button 
                onClick={() => setUserOrdersModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {loadingUserOrders ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  Loading your orders...
                </div>
              ) : userOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <Package size={42} style={{ margin: '0 auto 1rem', opacity: 0.4, color: 'var(--accent-gold)' }} />
                  <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No orders placed yet</h4>
                  <p style={{ fontSize: '0.85rem' }}>Items you purchase with this account ({currentUser?.email}) will be tracked here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {userOrders.map((ord) => (
                    <div 
                      key={ord.id} 
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '12px',
                        padding: '1.2rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 600 }}>ORDER #{ord.id}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                            {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '100px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: ord.order_status === 'Delivered' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(212, 175, 55, 0.15)',
                            color: ord.order_status === 'Delivered' ? '#4ade80' : 'var(--accent-gold)',
                            border: `1px solid ${ord.order_status === 'Delivered' ? '#4ade80' : 'var(--accent-gold)'}`
                          }}>
                            {ord.order_status}
                          </span>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                        {ord.items && ord.items.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                            <span style={{ color: 'var(--text-main)' }}>
                              {it.quantity}x {it.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({it.color}, Size {it.size})</span>
                            </span>
                            <span style={{ color: 'var(--accent-gold)' }}>₹{(it.price * it.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', marginTop: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Payment ({ord.payment_method}):</span>
                        <span style={{ color: 'var(--text-main)' }}>₹{ord.total_amount?.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Veer Privilege Wallet & Cashbacks Modal */}
      {walletModalOpen && (
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
            zIndex: 1100,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '1rem',
            boxSizing: 'border-box'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setWalletModalOpen(false); }}
        >
          <div style={{
            background: 'var(--bg-card, #121216)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '92%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Wallet size={20} style={{ color: 'var(--accent-gold)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                  Veer Privilege Wallet
                </h3>
              </div>
              <button 
                onClick={() => setWalletModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Luxury Gold Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(20, 20, 25, 0.8) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.45)',
                borderRadius: '14px',
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', letterSpacing: '1.5px', color: 'var(--accent-gold)', textTransform: 'uppercase', fontWeight: 600 }}>
                      MEMBER WALLET & CASHBACK BALANCE
                    </span>
                    <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff', marginTop: '0.4rem', letterSpacing: '0.5px' }}>
                      ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid var(--accent-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-gold)'
                  }}>
                    <Sparkles size={20} />
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(212, 175, 55, 0.2)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setAddMoneyModalOpen(true)}
                    style={{
                      background: 'var(--accent-gold)',
                      color: '#0a0a0c',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.55rem 1.25rem',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(212, 175, 55, 0.35)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <PlusCircle size={16} />
                    <span>+ Add Money to Wallet</span>
                  </button>

                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                    Account: {currentUser?.email}
                  </span>
                </div>
              </div>

              {/* Pending Top-Up Requests Status for Customer */}
              {userTopupRequests && userTopupRequests.length > 0 && (
                <div style={{
                  background: 'rgba(212, 175, 55, 0.05)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      Top-Up Requests & Verification Status:
                    </span>
                    <button onClick={fetchUserWallet} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>
                      Refresh
                    </button>
                  </div>
                  {userTopupRequests.slice(0, 3).map((req) => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-main)' }}>₹{req.amount}</strong> via UPI
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>({req.payment_ref})</span>
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '100px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: req.status === 'Approved' ? 'rgba(74, 222, 128, 0.15)' : req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(243, 156, 18, 0.15)',
                        color: req.status === 'Approved' ? '#4ade80' : req.status === 'Rejected' ? '#ef4444' : '#f39c12'
                      }}>
                        {req.status === 'Pending' ? 'Pending Admin Review' : req.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Perks Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  display: 'flex',
                  gap: '0.6rem',
                  alignItems: 'center'
                }}>
                  <Gift size={20} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>5% Cashback</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Earned on every purchase</div>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  display: 'flex',
                  gap: '0.6rem',
                  alignItems: 'center'
                }}>
                  <TrendingUp size={20} style={{ color: '#4ade80', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Instant Checkout Savings</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Redeem 100% on any order</div>
                  </div>
                </div>
              </div>

              {/* Cashbacks & Activity History */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '0.5rem 0 0.85rem 0', fontWeight: 600, letterSpacing: '0.5px' }}>
                  Cashback & Transaction History
                </h4>

                {loadingWallet ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Loading history...</div>
                ) : walletTransactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No wallet activity yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {walletTransactions.map((tx) => (
                      <div 
                        key={tx.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: tx.type === 'credit' ? 'rgba(74, 222, 128, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: tx.type === 'credit' ? '#4ade80' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {tx.type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {tx.description}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: tx.type === 'credit' ? '#4ade80' : '#ef4444'
                        }}>
                          {tx.type === 'credit' ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Dedicated Luxury Add Money Pop-up Modal */}
      <AddMoneyModal 
        isOpen={addMoneyModalOpen}
        onClose={() => setAddMoneyModalOpen(false)}
        currentUser={currentUser}
        API_BASE_URL={API_BASE_URL}
        currentBalance={walletBalance}
        onSuccess={fetchUserWallet}
      />

      {/* My Profile Modal */}
      {profileModalOpen && (
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
            zIndex: 1100,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '1rem',
            boxSizing: 'border-box'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setProfileModalOpen(false); }}
        >
          <div style={{
            background: 'var(--bg-card, #121216)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '92%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 25px rgba(212, 175, 55, 0.15)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <User size={20} style={{ color: 'var(--accent-gold)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                  My Profile & Account
                </h3>
              </div>
              <button 
                onClick={() => setProfileModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Card Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(212, 175, 55, 0.06)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '12px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-gold) 0%, #997b1a 100%)',
                  color: '#0a0a0c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  flexShrink: 0
                }}>
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                    {currentUser?.name || 'Customer'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {currentUser?.email || ''}
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginTop: '0.4rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: 'var(--accent-gold)',
                    fontSize: '0.72rem',
                    fontWeight: 600
                  }}>
                    <Sparkles size={11} /> Veer Privilege Customer
                  </div>
                </div>
              </div>

              {/* Account Details & Saved Address */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Personal & Delivery Info</span>
                  {!editProfileMode ? (
                    <button
                      onClick={() => {
                        setTempName(currentUser?.name || '');
                        setTempPhone(userPhone);
                        setTempAddress(userAddress);
                        setEditProfileMode(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-gold)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setEditProfileMode(false)}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.78rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        style={{
                          background: 'var(--accent-gold)',
                          border: 'none',
                          color: '#000',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {editProfileMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Full Name</label>
                      <input 
                        type="text" 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)} 
                        className="form-control"
                        style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Phone Number</label>
                      <input 
                        type="tel" 
                        value={tempPhone} 
                        onChange={(e) => setTempPhone(e.target.value)} 
                        placeholder="+91 98260 00000"
                        className="form-control"
                        style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.88rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Delivery Address</label>
                      <textarea 
                        rows={3} 
                        value={tempAddress} 
                        onChange={(e) => setTempAddress(e.target.value)} 
                        placeholder="House / Flat No., Street, Landmark, Ratlam (M.P.)"
                        className="form-control"
                        style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.88rem', resize: 'none' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.86rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Name</span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{currentUser?.name || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Email</span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{currentUser?.email || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Phone</span>
                      <span style={{ color: userPhone ? '#fff' : 'var(--text-muted)', fontWeight: 500 }}>{userPhone || 'Not set (click Edit)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Default Address</span>
                      <span style={{ color: userAddress ? '#fff' : 'var(--text-muted)', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{userAddress || 'Not set (click Edit)'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Hub Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{
                  background: 'rgba(212, 175, 55, 0.05)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-gold)' }}>
                    <Wallet size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Privilege Wallet</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    ₹{walletBalance.toLocaleString('en-IN')}
                  </div>
                  <button
                    onClick={() => {
                      setProfileModalOpen(false);
                      setAddMoneyModalOpen(true);
                    }}
                    style={{
                      marginTop: '0.25rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-gold)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0
                    }}
                  >
                    + Add Money &rarr;
                  </button>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-gold)' }}>
                    <Package size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>My Orders</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    {userOrders.length} {userOrders.length === 1 ? 'Order' : 'Orders'}
                  </div>
                  <button
                    onClick={() => {
                      setProfileModalOpen(false);
                      handleOpenUserOrders();
                    }}
                    style={{
                      marginTop: '0.25rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-gold)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0
                    }}
                  >
                    View History &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.2)'
            }}>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="btn-secondary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Modal */}
      {helpModalOpen && (
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
            zIndex: 1100,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '1rem',
            boxSizing: 'border-box'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setHelpModalOpen(false); }}
        >
          <div style={{
            background: 'var(--bg-card, #121216)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '16px',
            maxWidth: '580px',
            width: '92%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 25px rgba(212, 175, 55, 0.15)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <HelpCircle size={20} style={{ color: 'var(--accent-gold)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                  Help & Customer Support
                </h3>
              </div>
              <button 
                onClick={() => setHelpModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Quick Assistance Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.02) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '12px',
                padding: '1.2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                  Veer Garments Concierge Desk
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Need urgent size advice, fitting assistance, or order tracking in Ratlam? Our dedicated showroom team is available 7 days a week.
                </p>
                
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <a
                    href="tel:+919827332721"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: 'var(--accent-gold)',
                      color: '#000',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <Phone size={15} /> Call Showroom
                  </a>
                  <a
                    href="https://wa.me/919827332721?text=Hi%20Veer%20Garments,%20I%20need%20help%20with%20an%20order"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: 'rgba(37, 211, 102, 0.15)',
                      border: '1px solid rgba(37, 211, 102, 0.4)',
                      color: '#4ade80',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    <MessageCircle size={15} /> WhatsApp Support
                  </a>
                </div>
              </div>

              {/* Showroom Details */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Store Information</div>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.84rem' }}>
                  <MapPin size={16} style={{ color: 'var(--accent-gold)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#fff', fontWeight: 500 }}>Showroom Address:</span><br />
                    <span style={{ color: 'var(--text-muted)' }}>Manak Chowk Main Road, Dhanmandi, Laxman Pura, Ratlam (M.P.) - 457001</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.84rem' }}>
                  <Clock size={16} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#fff', fontWeight: 500 }}>Visiting Hours:</span> <span style={{ color: 'var(--text-muted)' }}>10:00 AM – 9:30 PM (All 7 Days)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.84rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: '#fff', fontWeight: 500 }}>Complimentary Alterations:</span> <span style={{ color: 'var(--text-muted)' }}>Free custom fitting for suits, pants & shirts</span>
                  </div>
                </div>
              </div>

              {/* Frequently Asked Questions */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Frequently Asked Questions</div>

                <div style={{ fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>Q: How do I track my active order?</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>Click your <strong>My Profile</strong> button and select <strong>My Orders</strong> to see live preparation, dispatch & delivery status.</div>
                </div>

                <div style={{ fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>Q: What if the size does not fit?</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>We provide free 7-day exchanges or instant on-site tailoring at our Manak Chowk showroom.</div>
                </div>

                <div style={{ fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>Q: How to pay via UPI or Wallet?</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>You can use your Veer Privilege Wallet for instant checkout with cashback, or select UPI QR / Cash on Delivery in cart.</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.2)'
            }}>
              <button 
                onClick={() => setHelpModalOpen(false)}
                className="btn-secondary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Section */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h4 className="logo" style={{ marginBottom: '1rem', fontSize: '1.4rem' }}>VEER <span>Garments</span></h4>
              <p style={{ lineHeight: '1.6', fontSize: '0.85rem' }}>
                Your premier destination for wedding suiting, royal sherwanis, formal shirts, pants, and trendsetting fashion.
              </p>
              <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img 
                  src="/images/store/store_front.jpg" 
                  alt="Veer Garments Building" 
                  style={{ width: '46px', height: '46px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--accent-gold)' }} 
                />
                <div style={{ fontSize: '0.75rem', lineHeight: '1.35' }}>
                  <strong style={{ color: '#fff' }}>Flagship Showroom</strong><br />
                  <span style={{ color: 'var(--text-muted)' }}>Manak Chowk, Ratlam (M.P.)</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="footer-title">Departments</h4>
              <ul className="footer-links" style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <li><a href="#shop-section" onClick={() => setView('home')}>• Upper Wear (Shirts, Polos, Tees)</a></li>
                <li><a href="#shop-section" onClick={() => setView('home')}>• Bottom Wear (Pants, Lowers, Baggy)</a></li>
                <li><a href="#shop-section" onClick={() => setView('home')}>• Under Garments (Vests, Trunks, Socks)</a></li>
              </ul>
            </div>

            <div>
              <h4 className="footer-title">Payment Options</h4>
              <ul className="footer-links" style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>• Cash on Delivery (COD)</li>
                <li>• Scan & Pay (Direct UPI QR)</li>
                <li>• Veer Privilege Wallet Cashback</li>
              </ul>
            </div>

            <div>
              <h4 className="footer-title">Store Operations</h4>
              <ul className="footer-links" style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>Hours:</strong> 10:00 AM - 9:00 PM</li>
                <li><strong>Location:</strong> Manak Chowk Main Rd, Dhanmandi, Laxman Pura, Ratlam, Madhya Pradesh</li>
                <li><strong>Contact:</strong> <a href="tel:+919827332721" style={{ color: 'var(--text-main)' }}>+91 98273 32721</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Veer Garments. All Rights Reserved. Crafted with Gold Elegance.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
