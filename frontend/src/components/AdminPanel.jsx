import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Package, 
  Edit, 
  Trash2, 
  ShoppingBag, 
  DollarSign, 
  List, 
  Layers, 
  Shield, 
  RefreshCw, 
  Wallet, 
  Check, 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Hash, 
  Search, 
  Tag, 
  Percent,
  ArrowLeft,
  ChevronRight,
  Shirt,
  Scissors,
  Box,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { safeFetch, isStaticMode, localWalletManager } from '../utils/apiHelper';

export default function AdminPanel({ products, orders, onRefreshData, API_BASE_URL, onBackToStore }) {
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('stock'); // stock, products, orders, wallet

  // Multi-level Stock Management navigation states
  // Level 1: stockSection === null (shows 3 Department Cards: Bottom Wear, Upper Wear, Undergarments)
  // Level 2: stockSection !== null && selectedStockProductId === null (shows product list in that department)
  // Level 3: selectedStockProductId !== null (shows individual product's variations to manage)
  const [stockSection, setStockSection] = useState(null);
  const [selectedStockProductId, setSelectedStockProductId] = useState(null);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // Top-Up verification requests state
  const [walletRequests, setWalletRequests] = useState([]);
  const [loadingWalletRequests, setLoadingWalletRequests] = useState(false);

  // Form states for adding/editing product
  const [editProductId, setEditProductId] = useState(null);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('Upper Wear');
  const [prodImage, setProdImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Discount states for adding/editing product (removable at any time)
  const [prodDiscount, setProdDiscount] = useState('');
  const [hasDiscount, setHasDiscount] = useState(false);

  // Variations builder state
  const [variations, setVariations] = useState([]);
  const [tempColor, setTempColor] = useState('');
  const [tempSize, setTempSize] = useState('M');
  const [tempQty, setTempQty] = useState('10');

  // Orders search filter state
  const [orderSearch, setOrderSearch] = useState('');

  // Safe image URL resolver for localhost and GitHub Pages
  const getProductImage = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    if (API_BASE_URL && !window.location.hostname.includes('github.io')) {
      return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url.startsWith('/') ? `.${url}` : `./${url}`;
  };

  // Categorize any product into the three primary sections
  const getProductPrimarySection = (product) => {
    if (!product) return 'Upper Wear';
    const cat = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const combined = `${cat} ${name} ${desc}`;

    if (
      cat.includes('under') || cat.includes('inner') || 
      combined.includes('underwear') || combined.includes('vest') || 
      combined.includes('sock') || combined.includes('hankey') || 
      combined.includes('hanky') || combined.includes('handkerchief') ||
      combined.includes('trunk') || combined.includes('brief')
    ) {
      return 'Under Garments';
    }

    if (
      cat.includes('bottom') || cat.includes('pant') || 
      combined.includes('pant') || combined.includes('lower') || 
      combined.includes('bootcut') || combined.includes('baggie') || 
      combined.includes('baggy') || combined.includes('trouser') || 
      combined.includes('jean') || combined.includes('cargo') || 
      combined.includes('trackpant')
    ) {
      return 'Bottom Wear';
    }

    return 'Upper Wear';
  };

  // Three primary sections metadata
  const stockSectionsMeta = [
    {
      id: 'Bottom Wear',
      name: 'Bottom Wear',
      title: 'Bottom Wear Department',
      subtitle: 'Pants • Baggie • Formal • Cargo • Lowers',
      desc: 'Quickly adjust stock for baggy street cargos, tailored formal trousers, bootcut jeans, and everyday comfort lowers & trackpants.',
      icon: Scissors,
      accentColor: '#38bdf8',
      accentBg: 'rgba(56, 189, 248, 0.12)',
      borderColor: 'rgba(56, 189, 248, 0.35)'
    },
    {
      id: 'Upper Wear',
      name: 'Upper Wear',
      title: 'Upper Wear Department',
      subtitle: 'Shirts • T-Shirts • Polo • Down Shoulders',
      desc: 'Quickly adjust stock for oversized drop-shoulder tees, double-knit pique polo t-shirts, pure cotton shirts & mandarin collars.',
      icon: Shirt,
      accentColor: '#fbbf24',
      accentBg: 'rgba(212, 175, 55, 0.12)',
      borderColor: 'rgba(212, 175, 55, 0.35)'
    },
    {
      id: 'Under Garments',
      name: 'Undergarments',
      title: 'Undergarments Department',
      subtitle: 'Underwear • Vests • Socks • Hankey Sets',
      desc: 'Quickly adjust stock for combed cotton trunks, ribbed gym & daily vests, cushioned bamboo socks, and pure Egyptian hankey packs.',
      icon: Box,
      accentColor: '#c084fc',
      accentBg: 'rgba(192, 132, 252, 0.12)',
      borderColor: 'rgba(192, 132, 252, 0.35)'
    }
  ];

  // Bulk stock adjust helper
  const handleBulkStockAdjust = (product, delta) => {
    if (!product || !product.stock) return;
    product.stock.forEach(item => {
      const currentQty = parseInt(item.quantity) || 0;
      const newQty = delta === 'reset' ? 0 : Math.max(0, currentQty + delta);
      handleUpdateStockQty(product.id, item.color, item.size, newQty);
    });
  };

  useEffect(() => {
    // Check if password already stored in sessionStorage
    const storedPass = sessionStorage.getItem('admin_pass');
    if (storedPass === 'admin123') {
      setIsAuthenticated(true);
      setAdminPassword('admin123');
      fetchWalletRequests('admin123');
    }
  }, []);

  const fetchWalletRequests = async (pass) => {
    setLoadingWalletRequests(true);
    try {
      let loaded = false;
      if (API_BASE_URL && !isStaticMode()) {
        const res = await safeFetch(`${API_BASE_URL}/api/admin/wallet-requests`, {
          headers: { 'x-admin-password': pass || adminPassword || 'admin123' }
        });
        if (res.ok && Array.isArray(res.data)) {
          setWalletRequests(res.data);
          loaded = true;
        }
      }

      if (!loaded) {
        // Fallback for static showcase / GitHub Pages
        const localRequests = localWalletManager.getTopupRequests();
        setWalletRequests(localRequests);
      }
    } catch (err) {
      console.error('Failed to load wallet requests:', err);
    } finally {
      setLoadingWalletRequests(false);
    }
  };

  const handleApproveTopup = async (id) => {
    if (!window.confirm('Have you verified receipt of this payment in your UPI / Bank account?')) return;
    try {
      let approved = false;
      if (API_BASE_URL && !isStaticMode()) {
        const res = await safeFetch(`${API_BASE_URL}/api/admin/wallet-requests/${id}/approve`, {
          method: 'POST',
          headers: { 'x-admin-password': adminPassword || 'admin123' }
        });
        if (res.ok && res.data) {
          approved = true;
          alert(res.data.message || 'Approved & credited!');
        } else if (!res.isHtml && res.data?.error) {
          throw new Error(res.data.error);
        }
      }

      if (!approved) {
        // Fallback for static showcase / GitHub Pages
        localWalletManager.approveTopupRequest(id);
        alert('Approved & credited to customer wallet!');
      }

      fetchWalletRequests();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRejectTopup = async (id) => {
    const reason = window.prompt('Reason for rejection:', 'Payment not received in bank account / Invalid UTR');
    if (!reason) return;
    try {
      let rejected = false;
      if (API_BASE_URL && !isStaticMode()) {
        const res = await safeFetch(`${API_BASE_URL}/api/admin/wallet-requests/${id}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminPassword || 'admin123'
          },
          body: JSON.stringify({ reason })
        });
        if (res.ok && res.data) {
          rejected = true;
          alert(res.data.message || 'Rejected');
        } else if (!res.isHtml && res.data?.error) {
          throw new Error(res.data.error);
        }
      }

      if (!rejected) {
        // Fallback for static showcase / GitHub Pages
        localWalletManager.rejectTopupRequest(id, reason);
        alert('Rejected');
      }

      fetchWalletRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_pass', 'admin123');
      setAuthError('');
      fetchWalletRequests('admin123');
    } else {
      setAuthError('Incorrect Password. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_pass');
    setAdminPassword('');
  };

  // Add variation to list
  const addVariation = () => {
    if (!tempColor.trim() || !tempSize.trim()) {
      alert('Color and size are required');
      return;
    }
    const color = tempColor.trim();
    const size = tempSize.trim();
    const quantity = parseInt(tempQty) || 0;

    // Check duplicates
    if (variations.some(v => v.color.toLowerCase() === color.toLowerCase() && v.size.toLowerCase() === size.toLowerCase())) {
      alert('Variation already added!');
      return;
    }

    setVariations([...variations, { color, size, quantity }]);
    setTempColor('');
  };

  // Remove variation from list
  const removeVariation = (index) => {
    setVariations(variations.filter((_, idx) => idx !== index));
  };

  // Handle image select
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProdImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Submit product creation or update
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodCategory) {
      alert('Product Name, Price, and Category are required');
      return;
    }

    // Auto-capture variation if user typed in temp fields but forgot to click '+ Add Var'
    let finalVariations = [...variations];
    if (tempColor.trim()) {
      const alreadyHas = finalVariations.some(
        v => v.color.toLowerCase() === tempColor.trim().toLowerCase() && v.size.toLowerCase() === tempSize.trim().toLowerCase()
      );
      if (!alreadyHas) {
        finalVariations.push({
          color: tempColor.trim(),
          size: tempSize.trim() || 'M',
          quantity: parseInt(tempQty) || 10
        });
      }
    }

    // If still no variations configured at all, add standard initial stock so product can be purchased
    if (finalVariations.length === 0) {
      finalVariations = [
        { color: 'Standard', size: 'M', quantity: 20 },
        { color: 'Standard', size: 'L', quantity: 15 }
      ];
    }

    const formData = new FormData();
    formData.append('name', prodName);
    formData.append('description', prodDesc);
    formData.append('price', prodPrice);
    formData.append('discount_percent', hasDiscount ? (parseFloat(prodDiscount) || 0) : 0);
    formData.append('category', prodCategory);
    if (prodImage) {
      formData.append('image', prodImage);
    }
    formData.append('stockData', JSON.stringify(finalVariations));

    const url = editProductId 
      ? `${API_BASE_URL}/api/products/${editProductId}`
      : `${API_BASE_URL}/api/products`;

    const method = editProductId ? 'PUT' : 'POST';
    const effectivePass = adminPassword || sessionStorage.getItem('admin_pass') || 'admin123';
    let saved = false;

    if (API_BASE_URL && !window.location.hostname.includes('github.io')) {
      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            'x-admin-password': effectivePass
          },
          body: formData
        });

        if (response.ok) {
          saved = true;
        }
      } catch (error) {
        console.warn('Backend product save error:', error.message);
      }
    }

    if (!saved) {
      // Fallback for GitHub Pages static showcase
      const localProducts = JSON.parse(localStorage.getItem('veer_local_products') || '[]');
      const newProd = {
        id: editProductId || Date.now(),
        name: prodName,
        description: prodDesc,
        price: parseFloat(prodPrice),
        discount_percent: hasDiscount ? (parseFloat(prodDiscount) || 0) : 0,
        category: prodCategory,
        image_url: previewUrl ? previewUrl.replace(API_BASE_URL, '') : null,
        stock: finalVariations
      };

      if (editProductId) {
        const updated = localProducts.map(p => p.id === editProductId ? newProd : p);
        localStorage.setItem('veer_local_products', JSON.stringify(updated));
      } else {
        localStorage.setItem('veer_local_products', JSON.stringify([newProd, ...localProducts]));
      }
      saved = true;
    }

    alert(editProductId ? 'Product updated successfully!' : 'Product added successfully!');
    resetProductForm();
    onRefreshData();
  };

  const resetProductForm = () => {
    setEditProductId(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdCategory('Upper Wear');
    setProdImage(null);
    setPreviewUrl('');
    setVariations([]);
    setTempColor('');
    setTempSize('M');
    setTempQty('10');
    setProdDiscount('');
    setHasDiscount(false);
  };

  // Set up product edit state
  const startEditProduct = (product) => {
    setEditProductId(product.id);
    setProdName(product.name);
    setProdDesc(product.description || '');
    setProdPrice(product.price.toString());
    setProdCategory(product.category);
    setPreviewUrl(product.image_url ? `${API_BASE_URL}${product.image_url}` : '');
    setVariations(product.stock || []);
    const discount = product.discount_percent || 0;
    setProdDiscount(discount > 0 ? discount.toString() : '');
    setHasDiscount(discount > 0);
    setActiveTab('products'); // Switch view to form
  };

  // Quick 1-click removal of discount directly from product card/table
  const handleRemoveDiscountDirectly = async (productId) => {
    if (!window.confirm('Remove discount from this product and restore regular price?')) return;
    
    // Save to local discount overrides
    try {
      const localDiscounts = JSON.parse(localStorage.getItem('veer_local_discounts') || '{}');
      localDiscounts[productId] = 0;
      localStorage.setItem('veer_local_discounts', JSON.stringify(localDiscounts));
    } catch (e) {}

    const effectivePass = adminPassword || sessionStorage.getItem('admin_pass') || 'admin123';
    if (API_BASE_URL && !window.location.hostname.includes('github.io')) {
      try {
        await fetch(`${API_BASE_URL}/api/products/${productId}/discount`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': effectivePass
          },
          body: JSON.stringify({ discount_percent: 0 })
        });
      } catch (err) {}
    }

    onRefreshData();
  };

  // Delete product
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? All stock variations will be permanently removed.')) {
      return;
    }

    const effectivePass = adminPassword || sessionStorage.getItem('admin_pass') || 'admin123';
    if (API_BASE_URL && !window.location.hostname.includes('github.io')) {
      try {
        await fetch(`${API_BASE_URL}/api/products/${id}`, {
          method: 'DELETE',
          headers: {
            'x-admin-password': effectivePass
          }
        });
      } catch (e) {}
    }

    // Also remove from local storage
    try {
      const localProducts = JSON.parse(localStorage.getItem('veer_local_products') || '[]');
      localStorage.setItem('veer_local_products', JSON.stringify(localProducts.filter(p => p.id !== id)));
      const deletedIds = JSON.parse(localStorage.getItem('veer_deleted_product_ids') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('veer_deleted_product_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    alert('Product deleted successfully');
    onRefreshData();
  };

  // Update specific stock level inline (Fast daily stock updates)
  const handleUpdateStockQty = async (productId, color, size, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 0) return;

    // 1. Always save immediately to local stock overrides in localStorage
    try {
      const localStockOverrides = JSON.parse(localStorage.getItem('veer_local_stock') || '{}');
      const key = `${productId}-${(color || '').trim().toLowerCase()}-${(size || '').trim().toLowerCase()}`;
      localStockOverrides[key] = qty;
      localStorage.setItem('veer_local_stock', JSON.stringify(localStockOverrides));
    } catch (e) {}

    // 2. Try saving to real backend if available and not on github.io
    const effectivePass = adminPassword || sessionStorage.getItem('admin_pass') || 'admin123';
    if (API_BASE_URL && !window.location.hostname.includes('github.io')) {
      try {
        await fetch(`${API_BASE_URL}/api/products/${productId}/stock`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': effectivePass
          },
          body: JSON.stringify({ color, size, quantity: qty })
        });
      } catch (err) {
        console.warn('Backend stock sync error:', err.message);
      }
    }

    // 3. Trigger refresh so UI reflects new stock instantly without any tag error!
    onRefreshData();
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId, orderStatus, paymentStatus) => {
    const effectivePass = adminPassword || sessionStorage.getItem('admin_pass') || 'admin123';

    try {
      let updated = false;
      if (API_BASE_URL && !window.location.hostname.includes('github.io')) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-password': effectivePass
            },
            body: JSON.stringify({ orderStatus, paymentStatus })
          });

          if (response.ok) {
            updated = true;
          }
        } catch (err) {}
      }

      if (!updated) {
        // Fallback for static showcase: update localStorage orders
        const savedOrders = JSON.parse(localStorage.getItem('veer_admin_orders') || '[]');
        const updatedList = savedOrders.map(o => o.id === orderId ? { ...o, order_status: orderStatus, payment_status: paymentStatus } : o);
        localStorage.setItem('veer_admin_orders', JSON.stringify(updatedList));
        updated = true;
      }

      alert('Order status updated successfully');
      onRefreshData();
    } catch (error) {
      alert(error.message);
    }
  };

  // Render Login panel if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Shield size={48} color="var(--accent-gold)" style={{ marginBottom: '1rem' }} />
            <h2 className="font-serif">Owner Admin Login</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Access stock adjustments, listings, and client orders.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Passcode</label>
              <input
                type="password"
                required
                placeholder="Enter passcode (default: admin123)"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="form-control"
              />
            </div>

            {authError && (
              <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 500 }}>
                {authError}
              </p>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Authenticate
            </button>

            {onBackToStore && (
              <button 
                type="button" 
                onClick={onBackToStore} 
                className="btn-secondary" 
                style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                Return to Store
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        <div style={{ padding: '0 1rem 2rem 1rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
          <h3 className="font-serif" style={{ fontSize: '1.4rem' }}>Veer Admin</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inventory & Orders Management</span>
        </div>

        <button 
          onClick={() => setActiveTab('stock')} 
          className={`admin-menu-item ${activeTab === 'stock' ? 'active' : ''}`}
        >
          <RefreshCw size={18} />
          <span>Daily Stock Updates</span>
        </button>

        <button 
          onClick={() => setActiveTab('products')} 
          className={`admin-menu-item ${activeTab === 'products' ? 'active' : ''}`}
        >
          <Layers size={18} />
          <span>Garment Listings</span>
        </button>

        <button 
          onClick={() => setActiveTab('orders')} 
          className={`admin-menu-item ${activeTab === 'orders' ? 'active' : ''}`}
        >
          <Package size={18} />
          <span>Orders List</span>
          {orders.filter(o => o.order_status === 'Received').length > 0 && (
            <span style={{ marginLeft: 'auto', background: '#e74c3c', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
              {orders.filter(o => o.order_status === 'Received').length}
            </span>
          )}
        </button>

        <button 
          onClick={() => { setActiveTab('wallet'); fetchWalletRequests(); }} 
          className={`admin-menu-item ${activeTab === 'wallet' ? 'active' : ''}`}
        >
          <Wallet size={18} />
          <span>Wallet Top-Ups</span>
          {walletRequests.filter(r => r.status === 'Pending').length > 0 && (
            <span style={{ marginLeft: 'auto', background: 'var(--accent-gold)', color: '#000', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
              {walletRequests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>

        <button 
          onClick={() => {
            handleLogout();
            if (onBackToStore) onBackToStore();
          }} 
          className="admin-menu-item" 
          style={{ marginTop: '5rem', color: '#e74c3c' }}
        >
          <Shield size={18} />
          <span>Exit to Store</span>
        </button>
      </aside>

      {/* Admin Main Workspace */}
      <main className="admin-main">
        
        {/* ======================================================== */}
        {/* TAB 1: DAILY STOCK UPDATES (3 SECTIONS DRILL-DOWN) */}
        {/* ======================================================== */}
        {activeTab === 'stock' && (() => {
          // Find currently selected product (if in Level 3)
          const currentSelectedProduct = selectedStockProductId 
            ? products.find(p => p.id === selectedStockProductId)
            : null;

          // LEVEL 3: Individual Product Stock Manager
          if (selectedStockProductId && currentSelectedProduct) {
            const stockItems = currentSelectedProduct.stock || [];
            const totalProductUnits = stockItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);
            const lowStockCount = stockItems.filter(item => (parseInt(item.quantity) || 0) > 0 && (parseInt(item.quantity) || 0) <= 5).length;
            const outOfStockCount = stockItems.filter(item => (parseInt(item.quantity) || 0) <= 0).length;

            return (
              <div className="animate-fade-in">
                {/* Navigation / Breadcrumb Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <button 
                    onClick={() => setSelectedStockProductId(null)} 
                    className="btn-secondary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem', borderRadius: '8px' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to {stockSection} Products</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => { setStockSection(null); setSelectedStockProductId(null); }}>
                      Departments
                    </span>
                    <ChevronRight size={14} />
                    <span style={{ cursor: 'pointer' }} onClick={() => setSelectedStockProductId(null)}>
                      {stockSection}
                    </span>
                    <ChevronRight size={14} />
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{currentSelectedProduct.name}</span>
                  </div>
                </div>

                {/* Product Banner Summary Card */}
                <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem', borderRadius: '14px', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: '85px', height: '105px', borderRadius: '10px', overflow: 'hidden', background: '#16161c', border: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
                      {currentSelectedProduct.image_url ? (
                        <img 
                          src={getProductImage(currentSelectedProduct.image_url)} 
                          alt={currentSelectedProduct.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={28} color="var(--accent-gold)" />
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-gold">{stockSection}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Item #{currentSelectedProduct.id}</span>
                      </div>
                      <h2 className="font-serif" style={{ fontSize: '1.65rem', marginBottom: '0.4rem', color: '#fff' }}>
                        {currentSelectedProduct.name}
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                          ₹{currentSelectedProduct.price}
                        </span>
                        {currentSelectedProduct.discount_percent > 0 && (
                          <span className="badge badge-gold" style={{ background: 'rgba(212, 175, 55, 0.2)' }}>
                            {currentSelectedProduct.discount_percent}% OFF
                          </span>
                        )}
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {stockItems.length} Variations configured
                        </span>
                      </div>
                    </div>

                    {/* Quick KPI Counters */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total In-Stock</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalProductUnits > 0 ? '#4ade80' : '#f87171', marginTop: '0.2rem' }}>
                          {totalProductUnits} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>units</span>
                        </div>
                      </div>

                      {outOfStockCount > 0 && (
                        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(248, 113, 113, 0.08)', borderRadius: '10px', border: '1px solid rgba(248, 113, 113, 0.25)', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Out of Stock</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171', marginTop: '0.2rem' }}>
                            {outOfStockCount} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>sizes</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Bulk Adjustments Bar */}
                  {stockItems.length > 0 && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={14} color="var(--accent-gold)" />
                        <span>Quick Bulk Stock Adjustments:</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handleBulkStockAdjust(currentSelectedProduct, 5)}
                          className="btn-secondary" 
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', borderRadius: '6px' }}
                        >
                          +5 to All Sizes
                        </button>
                        <button 
                          onClick={() => handleBulkStockAdjust(currentSelectedProduct, 10)}
                          className="btn-secondary" 
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', borderRadius: '6px' }}
                        >
                          +10 to All Sizes
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to set ALL sizes of "${currentSelectedProduct.name}" to 0?`)) {
                              handleBulkStockAdjust(currentSelectedProduct, 'reset');
                            }
                          }}
                          className="btn-secondary" 
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', borderRadius: '6px', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
                        >
                          Reset All to 0
                        </button>
                        <button 
                          onClick={onRefreshData} 
                          className="btn-secondary" 
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <RefreshCw size={13} /> Refresh
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock Variations Table */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px' }}>
                  <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <h3 className="font-serif" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Layers size={18} color="var(--accent-gold)" />
                      Size & Color Quantities
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Updates save instantly without page reloads
                    </span>
                  </div>

                  {stockItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                      <AlertTriangle size={42} color="var(--accent-gold)" style={{ margin: '0 auto 1rem auto', opacity: 0.8 }} />
                      <h4 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.5rem' }}>No Variations Configured</h4>
                      <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
                        This garment doesn't have any color or size variations yet. Add them in the Garment Listings tab to track stock.
                      </p>
                      <button 
                        onClick={() => handleEditProduct(currentSelectedProduct)} 
                        className="btn-primary"
                        style={{ padding: '0.6rem 1.5rem' }}
                      >
                        Configure Variations in Listings →
                      </button>
                    </div>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Color Variation</th>
                            <th>Size</th>
                            <th style={{ width: '260px' }}>Quantity Adjuster</th>
                            <th>Available Units</th>
                            <th>Inventory Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockItems.map((item, idx) => {
                            const qty = parseInt(item.quantity) || 0;
                            return (
                              <tr key={`${currentSelectedProduct.id}-${item.color}-${item.size}-${idx}`}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <span 
                                      className="color-dot" 
                                      style={{ 
                                        backgroundColor: (item.color || '#fff').toLowerCase().replace(' ', ''),
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        display: 'inline-block'
                                      }} 
                                    />
                                    <span style={{ fontWeight: 600 }}>{item.color}</span>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ 
                                    padding: '0.35rem 0.8rem', 
                                    background: 'rgba(255, 255, 255, 0.06)', 
                                    borderRadius: '6px', 
                                    fontWeight: 700, 
                                    fontSize: '0.9rem',
                                    letterSpacing: '0.5px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                  }}>
                                    {item.size}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button 
                                      onClick={() => handleUpdateStockQty(currentSelectedProduct.id, item.color, item.size, qty - 1)}
                                      className="quantity-btn"
                                      disabled={qty <= 0}
                                      style={{ 
                                        border: '1px solid var(--border-light)', 
                                        borderRadius: '6px', 
                                        width: '32px', 
                                        height: '32px', 
                                        background: 'rgba(255,255,255,0.05)',
                                        color: qty <= 0 ? 'rgba(255,255,255,0.2)' : '#fff',
                                        cursor: qty <= 0 ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.quantity}
                                      onChange={(e) => handleUpdateStockQty(currentSelectedProduct.id, item.color, item.size, e.target.value)}
                                      className="form-control"
                                      style={{ 
                                        width: '65px', 
                                        padding: '0.35rem', 
                                        textAlign: 'center', 
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(212, 175, 55, 0.3)'
                                      }}
                                    />
                                    <button 
                                      onClick={() => handleUpdateStockQty(currentSelectedProduct.id, item.color, item.size, qty + 1)}
                                      className="quantity-btn"
                                      style={{ 
                                        border: '1px solid var(--border-light)', 
                                        borderRadius: '6px', 
                                        width: '32px', 
                                        height: '32px', 
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#fff',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      +
                                    </button>

                                    {/* Quick Add Pills */}
                                    <div style={{ display: 'flex', gap: '0.3rem', marginLeft: '0.5rem' }}>
                                      <button
                                        onClick={() => handleUpdateStockQty(currentSelectedProduct.id, item.color, item.size, qty + 1)}
                                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-muted)', cursor: 'pointer' }}
                                      >
                                        +1
                                      </button>
                                      <button
                                        onClick={() => handleUpdateStockQty(currentSelectedProduct.id, item.color, item.size, qty + 5)}
                                        style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-muted)', cursor: 'pointer' }}
                                      >
                                        +5
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 700, fontSize: '1rem', color: qty > 0 ? '#fff' : '#f87171' }}>
                                    {qty} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>pcs</span>
                                  </span>
                                </td>
                                <td>
                                  {qty <= 0 ? (
                                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <AlertTriangle size={12} /> Out of Stock
                                    </span>
                                  ) : qty <= 5 ? (
                                    <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                      Low Stock ({qty} left)
                                    </span>
                                  ) : (
                                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <CheckCircle2 size={12} /> In Stock
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // LEVEL 2: Section Product List (e.g. Bottom Wear clicked)
          if (stockSection) {
            const meta = stockSectionsMeta.find(m => m.id === stockSection) || stockSectionsMeta[0];
            const sectionProducts = products.filter(p => getProductPrimarySection(p) === stockSection);
            
            const filteredProducts = sectionProducts.filter(p => {
              if (!stockSearchQuery.trim()) return true;
              const q = stockSearchQuery.toLowerCase();
              const name = (p.name || '').toLowerCase();
              const cat = (p.category || '').toLowerCase();
              const desc = (p.description || '').toLowerCase();
              return name.includes(q) || cat.includes(q) || desc.includes(q);
            });

            const totalSectionUnits = sectionProducts.reduce((sum, p) => 
              sum + (p.stock || []).reduce((s, item) => s + (parseInt(item.quantity) || 0), 0), 0
            );

            return (
              <div className="animate-fade-in">
                {/* Navigation & Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <button 
                    onClick={() => { setStockSection(null); setSelectedStockProductId(null); setStockSearchQuery(''); }} 
                    className="btn-secondary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem', borderRadius: '8px' }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to All Departments</span>
                  </button>

                  {/* Department Quick Switcher Pills */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {stockSectionsMeta.map(sec => {
                      const count = products.filter(p => getProductPrimarySection(p) === sec.id).length;
                      const isActive = sec.id === stockSection;
                      return (
                        <button
                          key={sec.id}
                          onClick={() => { setStockSection(sec.id); setSelectedStockProductId(null); }}
                          style={{
                            padding: '0.45rem 0.9rem',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: isActive ? sec.accentBg : 'rgba(255, 255, 255, 0.03)',
                            color: isActive ? sec.accentColor : 'var(--text-muted)',
                            border: `1px solid ${isActive ? sec.borderColor : 'rgba(255, 255, 255, 0.08)'}`
                          }}
                        >
                          {sec.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section Banner */}
                <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.75rem', borderRadius: '14px', border: `1px solid ${meta.borderColor}`, background: `linear-gradient(135deg, ${meta.accentBg} 0%, rgba(14, 14, 18, 0.6) 100%)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span className="badge badge-gold" style={{ background: meta.accentBg, color: meta.accentColor, borderColor: meta.borderColor }}>
                          {meta.name} Department
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{meta.subtitle}</span>
                      </div>
                      <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '0.4rem', color: '#fff' }}>
                        {meta.name} Stock Management
                      </h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '680px', lineHeight: 1.5 }}>
                        {meta.desc}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Garments Listed</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
                          {sectionProducts.length}
                        </div>
                      </div>

                      <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total In Stock</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: meta.accentColor, marginTop: '0.2rem' }}>
                          {totalSectionUnits} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>pcs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search Bar inside Section */}
                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        value={stockSearchQuery}
                        onChange={(e) => setStockSearchQuery(e.target.value)}
                        placeholder={`Search in ${meta.name} (e.g. pant, baggie, cargo, formal, lower)...`}
                        className="form-control"
                        style={{ paddingLeft: '2.8rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                      />
                      {stockSearchQuery && (
                        <button
                          onClick={() => setStockSearchQuery('')}
                          style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <button onClick={onRefreshData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.2rem', borderRadius: '10px' }}>
                      <RefreshCw size={16} /> Sync
                    </button>
                  </div>
                </div>

                {/* Product Cards Grid in this section */}
                {filteredProducts.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '14px' }}>
                    <Package size={44} color="var(--accent-gold)" style={{ margin: '0 auto 1rem auto', opacity: 0.6 }} />
                    <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Garments Found</h3>
                    <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem' }}>
                      {stockSearchQuery ? `No products match "${stockSearchQuery}". Try clearing search.` : `No products found in ${stockSection}.`}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                    {filteredProducts.map(product => {
                      const stockItems = product.stock || [];
                      const totalQty = stockItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);
                      
                      // Colors & sizes overview
                      const uniqueColors = [...new Set(stockItems.map(s => s.color).filter(Boolean))];
                      const uniqueSizes = [...new Set(stockItems.map(s => s.size).filter(Boolean))];

                      return (
                        <div
                          key={product.id}
                          onClick={() => setSelectedStockProductId(product.id)}
                          className="glass-panel"
                          style={{
                            padding: '1.25rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            transition: 'all 0.22s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = meta.accentColor;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.35)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', gap: '1.15rem' }}>
                            {/* Thumbnail */}
                            <div style={{ width: '85px', height: '105px', borderRadius: '8px', overflow: 'hidden', background: '#16161c', border: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
                              {product.image_url ? (
                                <img 
                                  src={getProductImage(product.image_url)} 
                                  alt={product.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Package size={26} color="var(--accent-gold)" />
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                                <span className="badge badge-gold" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                                  {product.category}
                                </span>
                                {product.discount_percent > 0 && (
                                  <span className="badge badge-gold" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: 'rgba(212, 175, 55, 0.25)' }}>
                                    {product.discount_percent}% OFF
                                  </span>
                                )}
                              </div>

                              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '0.4rem', lineHeight: 1.35 }}>
                                {product.name}
                              </h4>

                              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '0.6rem' }}>
                                ₹{product.price}
                              </div>

                              {/* Sizes & Colors Pill Preview */}
                              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                {uniqueSizes.slice(0, 4).map(s => (
                                  <span key={s} style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    {s}
                                  </span>
                                ))}
                                {uniqueSizes.length > 4 && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+{uniqueSizes.length - 4} sizes</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bottom Action Footer */}
                          <div style={{ marginTop: '1.1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              {totalQty <= 0 ? (
                                <span className="badge badge-danger" style={{ fontSize: '0.78rem' }}>
                                  🔴 Out of Stock
                                </span>
                              ) : totalQty <= 5 ? (
                                <span className="badge badge-gold" style={{ fontSize: '0.78rem' }}>
                                  🟡 Low Stock ({totalQty} left)
                                </span>
                              ) : (
                                <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                                  🟢 {totalQty} Units In Stock
                                </span>
                              )}
                            </div>

                            <button 
                              className="btn-secondary" 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.4rem', 
                                fontSize: '0.82rem', 
                                padding: '0.4rem 0.85rem',
                                color: meta.accentColor,
                                borderColor: meta.borderColor
                              }}
                            >
                              <span>Manage Stock</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // LEVEL 1: The Three Departments View (Bottom Wear, Upper Wear, Undergarments)
          return (
            <div className="animate-fade-in">
              <div className="admin-header-row">
                <div>
                  <h2 className="font-serif" style={{ fontSize: '2rem' }}>Daily Stock Updates</h2>
                  <p style={{ color: 'var(--text-muted)' }}>
                    Select a garment department below to view styles and update stock quantities.
                  </p>
                </div>
                <button onClick={onRefreshData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '8px' }}>
                  <RefreshCw size={16} /> Sync Data
                </button>
              </div>

              {/* The Three Department Luxury Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', marginTop: '1rem' }}>
                {stockSectionsMeta.map(sec => {
                  const SecIcon = sec.icon;
                  const sectionProducts = products.filter(p => getProductPrimarySection(p) === sec.id);
                  const totalUnits = sectionProducts.reduce((sum, p) => 
                    sum + (p.stock || []).reduce((s, item) => s + (parseInt(item.quantity) || 0), 0), 0
                  );
                  const outOfStockVariations = sectionProducts.reduce((sum, p) => 
                    sum + (p.stock || []).filter(item => (parseInt(item.quantity) || 0) <= 0).length, 0
                  );

                  return (
                    <div
                      key={sec.id}
                      onClick={() => { setStockSection(sec.id); setSelectedStockProductId(null); setStockSearchQuery(''); }}
                      className="glass-panel"
                      style={{
                        padding: '2rem',
                        borderRadius: '16px',
                        border: `1px solid ${sec.borderColor}`,
                        background: `linear-gradient(135deg, ${sec.accentBg} 0%, rgba(14, 14, 18, 0.7) 100%)`,
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.borderColor = sec.accentColor;
                        e.currentTarget.style.boxShadow = `0 14px 34px rgba(0,0,0,0.45)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = sec.borderColor;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div>
                        {/* Department Icon & Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: sec.accentBg,
                            border: `1px solid ${sec.borderColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: sec.accentColor
                          }}>
                            <SecIcon size={28} />
                          </div>

                          <span className="badge badge-gold" style={{ background: sec.accentBg, color: sec.accentColor, borderColor: sec.borderColor, fontSize: '0.78rem' }}>
                            {sectionProducts.length} Garments
                          </span>
                        </div>

                        {/* Title & Subtitle */}
                        <h3 className="font-serif" style={{ fontSize: '1.65rem', marginBottom: '0.35rem', color: '#fff' }}>
                          {sec.name}
                        </h3>
                        <div style={{ fontSize: '0.82rem', color: sec.accentColor, fontWeight: 600, letterSpacing: '0.3px', marginBottom: '0.9rem' }}>
                          {sec.subtitle}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.55, marginBottom: '1.5rem' }}>
                          {sec.desc}
                        </p>
                      </div>

                      {/* Card Footer: Metrics & Action Button */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total In Stock</span>
                            <strong style={{ fontSize: '1.15rem', color: '#fff' }}>{totalUnits} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>pcs</span></strong>
                          </div>

                          {outOfStockVariations > 0 ? (
                            <span style={{ fontSize: '0.78rem', color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(248, 113, 113, 0.25)' }}>
                              ⚠️ {outOfStockVariations} out of stock
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(74, 222, 128, 0.25)' }}>
                              ✓ All sizes in stock
                            </span>
                          )}
                        </div>

                        <button
                          className="btn-primary"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.6rem',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            fontWeight: 600,
                            fontSize: '0.92rem',
                            background: `linear-gradient(135deg, ${sec.accentColor} 0%, rgba(212, 175, 55, 0.8) 100%)`,
                            color: '#0a0a0c',
                            border: 'none',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
                          }}
                        >
                          <span>Open {sec.name}</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ======================================================== */}
        {/* TAB 2: PRODUCT LISTINGS & CREATION */}
        {/* ======================================================== */}
        {activeTab === 'products' && (
          <div className="animate-fade-in">
            <div className="admin-header-row">
              <div>
                <h2 className="font-serif" style={{ fontSize: '2rem' }}>
                  {editProductId ? 'Edit Garment Listing' : 'Garment Listings'}
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  {editProductId ? 'Update attributes and variation quantities.' : 'Create, update, and manage your shop products catalog.'}
                </p>
              </div>
              {editProductId && (
                <button onClick={resetProductForm} className="btn-secondary">Cancel Edit</button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'flex-start' }}>
              {/* Product Form */}
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 className="font-serif" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
                  {editProductId ? 'Edit Product Form' : 'Add New Product'}
                </h3>
                
                <form onSubmit={handleSubmitProduct}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Product Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Slim Fit Cotton Linen Shirt"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        className="form-control"
                      />
                    </div>

                    <div className="form-group" style={{ maxWidth: '180px' }}>
                      <label>Price (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="Price"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>

                  {/* SPECIAL DISCOUNT OPTION (OPTIONAL & REMOVABLE) */}
                  <div style={{ 
                    marginBottom: '1.5rem', 
                    padding: '1rem', 
                    background: hasDiscount ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.02)', 
                    border: hasDiscount ? '1px solid rgba(212, 175, 55, 0.35)' : '1px dashed var(--border-light)', 
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0, fontWeight: 600, color: '#fff', fontSize: '0.92rem' }}>
                        <input 
                          type="checkbox" 
                          checked={hasDiscount} 
                          onChange={(e) => {
                            setHasDiscount(e.target.checked);
                            if (!e.target.checked) setProdDiscount('');
                            else if (!prodDiscount) setProdDiscount('20');
                          }} 
                          style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                        />
                        <span>🏷️ Offer Special Discount on this Product</span>
                      </label>
                      {hasDiscount && (
                        <button 
                          type="button" 
                          onClick={() => { setHasDiscount(false); setProdDiscount(''); }}
                          style={{ 
                            fontSize: '0.8rem', 
                            color: '#ff7675', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.3rem', 
                            background: 'rgba(231, 76, 60, 0.1)', 
                            border: '1px solid rgba(231, 76, 60, 0.3)', 
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            cursor: 'pointer' 
                          }}
                        >
                          <X size={14} /> Remove Discount (Restore Full Price)
                        </button>
                      )}
                    </div>

                    {hasDiscount && (
                      <div className="animate-fade-in" style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <div className="form-group" style={{ maxWidth: '170px', margin: 0 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Discount Percentage (%)</label>
                            <input 
                              type="number" 
                              min="1" 
                              max="95" 
                              placeholder="e.g. 20" 
                              value={prodDiscount} 
                              onChange={(e) => setProdDiscount(e.target.value)} 
                              className="form-control"
                              style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1rem' }}
                            />
                          </div>

                          {/* Quick Presets */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quick Presets</label>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {['10', '15', '20', '25', '30', '50'].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setProdDiscount(pct)}
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.78rem',
                                    borderRadius: '4px',
                                    border: prodDiscount === pct ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                                    background: prodDiscount === pct ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                    color: prodDiscount === pct ? 'var(--accent-gold)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                  }}
                                >
                                  {pct}% OFF
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Live calculation breakdown */}
                        {prodPrice && parseFloat(prodDiscount) > 0 && (
                          <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Original MRP: </span>
                              <span style={{ textDecoration: 'line-through', color: '#999' }}>₹{parseFloat(prodPrice).toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Customer Saves: </span>
                              <span style={{ color: '#2ecc71', fontWeight: 600 }}>₹{Math.round(parseFloat(prodPrice) * (parseFloat(prodDiscount) / 100)).toLocaleString('en-IN')} ({prodDiscount}% OFF)</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Final Store Price: </span>
                              <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '1rem' }}>
                                ₹{Math.max(1, Math.round(parseFloat(prodPrice) * (1 - parseFloat(prodDiscount) / 100))).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Section / Category</label>
                      <select 
                        value={prodCategory} 
                        onChange={(e) => setProdCategory(e.target.value)} 
                        className="form-control"
                      >
                        <option value="Upper Wear">Upper Wear (Shirts, T-Shirts, Polo, Down Shoulders)</option>
                        <option value="Bottom Wear">Bottom Wear (Pants, Lowers, Bootcut, Baggie, Formal Trousers)</option>
                        <option value="Under Garments">Under Garments (Underwear, Vests, Socks, Hankey)</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Garment Image Picture</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="form-control"
                        style={{ padding: '0.5rem' }}
                      />
                    </div>
                  </div>

                  {previewUrl && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Image Preview</label>
                      <img 
                        src={previewUrl} 
                        alt="Product Preview" 
                        style={{ height: '120px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-light)' }} 
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      rows="3"
                      placeholder="Garment composition details, weave, care instructions..."
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      className="form-control"
                      style={{ resize: 'none' }}
                    />
                  </div>

                  {/* Stock Variations Editor */}
                  <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.01)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Stock Variations Builder</h4>
                    
                    <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Color (e.g. Navy, White, Olive)</label>
                        <input
                          type="text"
                          placeholder="Color"
                          value={tempColor}
                          onChange={(e) => setTempColor(e.target.value)}
                          className="form-control"
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0, maxWidth: '100px' }}>
                        <label>Size</label>
                        <select 
                          value={tempSize} 
                          onChange={(e) => setTempSize(e.target.value)} 
                          className="form-control"
                        >
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0, maxWidth: '100px' }}>
                        <label>Qty</label>
                        <input
                          type="number"
                          placeholder="10"
                          value={tempQty}
                          onChange={(e) => setTempQty(e.target.value)}
                          className="form-control"
                        />
                      </div>

                      <button 
                        type="button" 
                        onClick={addVariation} 
                        className="btn-secondary" 
                        style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Plus size={16} /> Add Var
                      </button>
                    </div>

                    {/* Variations Preview List */}
                    <div style={{ marginTop: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Configured Variations ({variations.length})</label>
                      {variations.length === 0 ? (
                        <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No variations added yet. Add colors/sizes above.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {variations.map((v, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span className="color-dot" style={{ backgroundColor: v.color.toLowerCase() }} />
                                  <span>{v.color}</span>
                                </div>
                                <div>Size: <strong>{v.size}</strong></div>
                                <div>Qty: <strong>{v.quantity}</strong></div>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => removeVariation(idx)} 
                                style={{ color: '#e74c3c', fontSize: '0.8rem' }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '2rem', padding: '1rem' }}>
                    {editProductId ? 'Save Product Changes' : 'Publish Product to Store'}
                  </button>
                </form>
              </div>

              {/* Products List Sidebar */}
              <div className="glass-panel" style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
                <h3 className="font-serif" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Garment Catalog ({products.length})</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {products.map(prod => (
                    <div key={prod.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ width: '60px', height: '80px', borderRadius: '6px', overflow: 'hidden', background: '#1a1a22', flexShrink: 0 }}>
                        {prod.image_url ? (
                          <img src={`${API_BASE_URL}${prod.image_url}`} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} /></div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>{prod.category}</div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {prod.discount_percent > 0 ? (
                            <>
                              <span style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                                ₹{Math.max(1, Math.round(prod.price * (1 - prod.discount_percent / 100))).toLocaleString('en-IN')}
                              </span>
                              <span style={{ fontSize: '0.78rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                                ₹{prod.price.toLocaleString('en-IN')}
                              </span>
                              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                                {prod.discount_percent}% OFF
                              </span>
                            </>
                          ) : (
                            <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.95rem' }}>₹{prod.price.toLocaleString('en-IN')}</div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => startEditProduct(prod)} 
                            style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <Edit size={12} /> Edit
                          </button>
                          {prod.discount_percent > 0 && (
                            <button
                              onClick={() => handleRemoveDiscountDirectly(prod.id)}
                              style={{ fontSize: '0.78rem', color: '#ff7675', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                              title="Click to remove discount immediately"
                            >
                              <X size={12} /> Remove Discount
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteProduct(prod.id)} 
                            style={{ fontSize: '0.8rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CUSTOMER ORDERS LIST */}
        {/* ======================================================== */}
        {activeTab === 'orders' && (() => {
          const displayedOrders = orders.filter(order => {
            if (!orderSearch.trim()) return true;
            const query = orderSearch.toLowerCase().trim();
            const nameMatch = (order.customer_name || '').toLowerCase().includes(query);
            const phoneMatch = (order.customer_phone || '').includes(query);
            const emailMatch = (order.customer_email || '').toLowerCase().includes(query);
            const idMatch = String(order.id).includes(query);
            const addressMatch = (order.customer_address || '').toLowerCase().includes(query);
            return nameMatch || phoneMatch || emailMatch || idMatch || addressMatch;
          });

          return (
            <div className="animate-fade-in">
              <div className="admin-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 className="font-serif" style={{ fontSize: '2rem' }}>Customer Orders Dashboard</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Real-time customer order management, direct client contact info, and fulfillment tracking.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="Search customer name, phone, order ID..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="form-control"
                      style={{ paddingLeft: '2rem', paddingRight: '0.85rem', width: '280px', fontSize: '0.85rem', background: '#121218' }}
                    />
                    {orderSearch && (
                      <button 
                        onClick={() => setOrderSearch('')} 
                        style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={onRefreshData} 
                    className="btn-secondary" 
                    style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                    title="Refresh Orders"
                  >
                    <RefreshCw size={15} /> Refresh
                  </button>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '130px' }}>Order ID & Date</th>
                        <th style={{ minWidth: '220px' }}>Customer Name & Contact</th>
                        <th style={{ maxWidth: '220px' }}>Shipping Address</th>
                        <th>Apparel Purchased</th>
                        <th style={{ width: '150px' }}>Payment & Total</th>
                        <th style={{ width: '135px' }}>Order Status</th>
                        <th style={{ width: '115px' }}>Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedOrders.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                            {orderSearch ? 'No orders match your search criteria.' : 'No customer orders placed yet.'}
                          </td>
                        </tr>
                      ) : (
                        displayedOrders.map(order => (
                          <tr key={order.id}>
                            {/* 1. ORDER ID & DATE */}
                            <td>
                              <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.35rem', 
                                background: 'rgba(212, 175, 55, 0.08)', 
                                border: '1px solid rgba(212, 175, 55, 0.3)', 
                                padding: '0.2rem 0.55rem', 
                                borderRadius: '6px', 
                                fontWeight: 700, 
                                fontSize: '0.9rem', 
                                color: 'var(--accent-gold)' 
                              }}>
                                <Hash size={13} />
                                <span>#{order.id}</span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Calendar size={12} />
                                <span>{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '1.05rem', marginTop: '0.1rem' }}>
                                {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </div>
                            </td>

                            {/* 2. CUSTOMER NAME & CONTACT (PROMINENT DEDICATED COLUMN) */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  minWidth: '40px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(184, 134, 11, 0.55))',
                                  border: '1.5px solid var(--accent-gold)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '700',
                                  fontSize: '1.05rem',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                                  marginTop: '2px',
                                  flexShrink: 0
                                }}>
                                  {order.customer_name ? order.customer_name.trim().charAt(0).toUpperCase() : 'C'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  <div style={{ 
                                    fontSize: '1.05rem', 
                                    fontWeight: '700', 
                                    color: '#ffffff',
                                    letterSpacing: '0.01em',
                                    lineHeight: 1.25,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}>
                                    <User size={14} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                                    <span>{order.customer_name || 'Guest Customer'}</span>
                                  </div>
                                  {order.customer_phone && (
                                    <a 
                                      href={`tel:${order.customer_phone}`} 
                                      style={{ 
                                        fontSize: '0.84rem', 
                                        color: 'var(--accent-gold)', 
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        fontWeight: 500,
                                        marginTop: '0.1rem'
                                      }}
                                      title="Click to call customer"
                                    >
                                      <Phone size={12} />
                                      <span>{order.customer_phone}</span>
                                    </a>
                                  )}
                                  {order.customer_email && (
                                    <a 
                                      href={`mailto:${order.customer_email}`}
                                      style={{ 
                                        fontSize: '0.78rem', 
                                        color: 'var(--text-muted)', 
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem'
                                      }}
                                      title="Click to email customer"
                                    >
                                      <Mail size={12} />
                                      <span>{order.customer_email}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 3. SHIPPING ADDRESS */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', maxWidth: '220px' }}>
                                <MapPin size={14} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontSize: '0.85rem', lineHeight: '1.4', wordBreak: 'break-word', color: '#e0e0e0' }}>
                                  {order.customer_address}
                                </span>
                              </div>
                            </td>

                            {/* 4. APPAREL PURCHASED */}
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {Array.isArray(order.items) && order.items.map((item, idx) => (
                                  <div key={idx} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>• {item.name}</span>
                                    <span style={{ 
                                      fontSize: '0.72rem', 
                                      background: 'rgba(255, 255, 255, 0.06)', 
                                      border: '1px solid rgba(255, 255, 255, 0.12)', 
                                      padding: '0.1rem 0.4rem', 
                                      borderRadius: '4px',
                                      color: '#bbb'
                                    }}>
                                      {item.color} | {item.size}
                                    </span>
                                    <span style={{ 
                                      fontSize: '0.72rem', 
                                      fontWeight: 700, 
                                      color: 'var(--accent-gold)',
                                      background: 'rgba(212, 175, 55, 0.12)',
                                      padding: '0.1rem 0.45rem',
                                      borderRadius: '4px'
                                    }}>
                                      x{item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            {/* 5. PAYMENT & TOTAL */}
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                                ₹{Number(order.total_amount).toLocaleString('en-IN')}
                              </div>
                              <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                                {order.payment_method === 'COD' ? 'Cash on Delivery' : order.payment_method === 'WALLET' ? 'Wallet Payment' : 'UPI Payment'}
                              </span>
                              {order.wallet_used > 0 && (
                                <div style={{ fontSize: '0.72rem', color: '#2ecc71', marginTop: '0.2rem' }}>
                                  Wallet: -₹{order.wallet_used}
                                </div>
                              )}
                              {order.payment_ref && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                                  <strong>Ref:</strong> {order.payment_ref}
                                </div>
                              )}
                            </td>

                            {/* 6. ORDER STATUS */}
                            <td>
                              <select
                                value={order.order_status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value, order.payment_status)}
                                className="form-control"
                                style={{ 
                                  width: 'auto', 
                                  padding: '0.4rem 0.6rem', 
                                  fontSize: '0.85rem',
                                  borderRadius: '6px',
                                  background: '#1a1a24',
                                  border: '1px solid var(--border-light)',
                                  fontWeight: 600,
                                  color: order.order_status === 'Delivered' ? '#2ecc71' : order.order_status === 'Cancelled' ? '#e74c3c' : 'var(--accent-gold)'
                                }}
                              >
                                <option value="Received">Received</option>
                                <option value="Processing">Processing</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>

                            {/* 7. PAYMENT STATUS */}
                            <td>
                              <select
                                value={order.payment_status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, order.order_status, e.target.value)}
                                className="form-control"
                                style={{ 
                                  width: 'auto', 
                                  padding: '0.4rem 0.6rem', 
                                  fontSize: '0.85rem',
                                  borderRadius: '6px',
                                  background: '#1a1a24',
                                  border: '1px solid var(--border-light)',
                                  fontWeight: 700,
                                  color: order.payment_status === 'Paid' ? '#2ecc71' : '#e74c3c'
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
        {/* Wallet Requests Tab */}
        {activeTab === 'wallet' && (
          <div className="admin-content-card">
            <div className="admin-card-header">
              <div>
                <h3 className="font-serif">Customer Wallet Top-Up Requests</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Verify real UPI payment receipt in your bank/PhonePe before approving wallet credits.
                </p>
              </div>
              <button onClick={() => fetchWalletRequests()} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                <RefreshCw size={16} /> Refresh Requests
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Req ID</th>
                      <th>Customer Name</th>
                      <th>Customer Email</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>UPI Ref / UTR</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingWalletRequests ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                          Loading top-up requests...
                        </td>
                      </tr>
                    ) : walletRequests.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No wallet top-up requests found.
                        </td>
                      </tr>
                    ) : (
                      walletRequests.map((req) => (
                        <tr key={req.id}>
                          <td><strong>#{req.id}</strong></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'rgba(212,175,55,0.15)',
                                border: '1px solid var(--accent-gold)',
                                color: 'var(--accent-gold)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                flexShrink: 0
                              }}>
                                {(req.customer_name || req.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {req.customer_name || 'Customer'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{req.email}</span>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--accent-gold)', fontSize: '1rem' }}>
                              ₹{req.amount.toLocaleString('en-IN')}
                            </strong>
                          </td>
                          <td>{req.payment_method}</td>
                          <td>
                            <code style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--accent-gold)' }}>
                              {req.payment_ref}
                            </code>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(req.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '100px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: req.status === 'Approved' ? 'rgba(74, 222, 128, 0.15)' : req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.15)',
                              color: req.status === 'Approved' ? '#4ade80' : req.status === 'Rejected' ? '#ef4444' : 'var(--accent-gold)',
                              border: `1px solid ${req.status === 'Approved' ? '#4ade80' : req.status === 'Rejected' ? '#ef4444' : 'var(--accent-gold)'}`
                            }}>
                              {req.status}
                            </span>
                            {req.admin_notes && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {req.admin_notes}
                              </div>
                            )}
                          </td>
                          <td>
                            {req.status === 'Pending' ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleApproveTopup(req.id)}
                                  className="btn-primary"
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#2ecc71', borderColor: '#2ecc71' }}
                                  title="Confirm payment received in bank and credit wallet"
                                >
                                  <Check size={14} /> Approve & Credit
                                </button>
                                <button
                                  onClick={() => handleRejectTopup(req.id)}
                                  className="btn-secondary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: '#e74c3c', borderColor: 'rgba(231,76,60,0.4)' }}
                                  title="Reject fake/unverified payment"
                                >
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
