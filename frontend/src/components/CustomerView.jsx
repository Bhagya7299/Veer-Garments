import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingBag, 
  X, 
  Check, 
  Eye, 
  MapPin, 
  Clock, 
  Phone, 
  Sparkles, 
  Building2, 
  Award,
  Layers,
  Film
} from 'lucide-react';

// Real Store Showcase Videos (Seamless single-frame playlist)
const STORE_VIDEOS = [
  {
    id: 'space_zoom',
    url: './videos/zoom_from_space.mp4',
    title: 'Zoom From Space to Flagship Storefront',
    subtitle: 'Manak Chowk Main Road, Ratlam (M.P.)',
    badge: '1. SATELLITE ZOOM',
    description: 'Cinematic satellite view zooming in from Earth orbit straight down to our multi-storey Veer Garments showroom.'
  },
  {
    id: 'walkin',
    url: './videos/veergarments_walkin.mp4',
    title: 'Grand Showroom Walk-In Tour',
    subtitle: 'Suits, Sherwanis, Shirts & Racks',
    badge: '2. SHOWROOM WALK-IN',
    description: 'Walk right through the grand glass entrance and explore our royal suiting, wedding collections, and ready-to-wear aisles.'
  }
];

// Color mapping helper for CSS styling
const getColorHex = (name) => {
  if (!name) return '#a0a0a0';
  const clean = name.trim().toLowerCase();
  const map = {
    'navy blue': '#1e3a8a',
    'navy': '#1e3a8a',
    'royal blue': '#2563eb',
    'sky blue': '#38bdf8',
    'blue': '#3b82f6',
    'white': '#ffffff',
    'off white': '#f8fafc',
    'cream': '#fef3c7',
    'black': '#111116',
    'charcoal': '#27272a',
    'grey': '#71717a',
    'gray': '#71717a',
    'light grey': '#d4d4d8',
    'red': '#ef4444',
    'maroon': '#881337',
    'wine': '#4c0519',
    'burgundy': '#800020',
    'green': '#22c55e',
    'olive': '#65a30d',
    'olive green': '#65a30d',
    'dark green': '#14532d',
    'forest green': '#166534',
    'yellow': '#eab308',
    'mustard': '#ca8a04',
    'gold': '#d4af37',
    'orange': '#f97316',
    'pink': '#ec4899',
    'purple': '#a855f7',
    'brown': '#78350f',
    'beige': '#e7d8c9',
    'khaki': '#a39274',
    'tan': '#d2b48c',
    'standard': '#d4af37'
  };
  return map[clean] || clean;
};

export default function CustomerView({ products, onAddToCart, API_BASE_URL, openCart }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Product Detail Modal States
  const [chosenColor, setChosenColor] = useState('');
  const [chosenSize, setChosenSize] = useState('');
  const [addedText, setAddedText] = useState(false);

  // Dual-buffered continuous video player (zero jerk, seamless 800ms crossfade between clips)
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const video0Ref = useRef(null);
  const video1Ref = useRef(null);
  const isTransitioningRef = useRef(false);

  // Crossfade from Clip 0 -> Clip 1
  const transitionToVideo1 = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    const v0 = video0Ref.current;
    const v1 = video1Ref.current;

    if (v1) {
      v1.currentTime = 0;
      v1.muted = true;
      const playPromise = v1.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }

    setActiveVideoIdx(1);

    setTimeout(() => {
      if (v0) {
        v0.pause();
        v0.currentTime = 0;
      }
      isTransitioningRef.current = false;
    }, 850);
  };

  // Crossfade from Clip 1 -> Clip 0
  const transitionToVideo0 = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    const v0 = video0Ref.current;
    const v1 = video1Ref.current;

    if (v0) {
      v0.currentTime = 0;
      v0.muted = true;
      const playPromise = v0.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }

    setActiveVideoIdx(0);

    setTimeout(() => {
      if (v1) {
        v1.pause();
        v1.currentTime = 0;
      }
      isTransitioningRef.current = false;
    }, 850);
  };

  // Pre-trigger crossfade 0.5s before end of clip 0 for buttery seamless continuity
  const handleVideo0TimeUpdate = () => {
    const v0 = video0Ref.current;
    if (v0 && v0.duration && !isTransitioningRef.current && activeVideoIdx === 0) {
      if (v0.duration - v0.currentTime <= 0.55) {
        transitionToVideo1();
      }
    }
  };

  // Pre-trigger crossfade 0.5s before end of clip 1
  const handleVideo1TimeUpdate = () => {
    const v1 = video1Ref.current;
    if (v1 && v1.duration && !isTransitioningRef.current && activeVideoIdx === 1) {
      if (v1.duration - v1.currentTime <= 0.55) {
        transitionToVideo0();
      }
    }
  };

  // Ensure initial video autoplays smoothly on mount across all mobile & desktop browsers
  useEffect(() => {
    const v0 = video0Ref.current;
    const v1 = video1Ref.current;

    [v0, v1].forEach(v => {
      if (v) {
        v.muted = true;
        v.defaultMuted = true;
        v.setAttribute('muted', '');
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', 'true');
        v.setAttribute('x5-playsinline', 'true');
      }
    });

    const startPlayback = () => {
      if (video0Ref.current && video0Ref.current.paused) {
        video0Ref.current.muted = true;
        video0Ref.current.play().catch(() => {});
      }
    };

    // Try autoplaying immediately
    startPlayback();

    // In case iOS Low Power Mode or Android battery saver blocked autoplay, trigger on first touch/interaction
    const handleGesture = () => {
      startPlayback();
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('click', handleGesture);
    };

    window.addEventListener('touchstart', handleGesture, { passive: true, once: true });
    window.addEventListener('click', handleGesture, { passive: true, once: true });

    return () => {
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('click', handleGesture);
    };
  }, []);

  // Primary Sections definition with subcategories requested by user
  const primarySections = [
    {
      id: 'Upper Wear',
      name: 'Upper Wear',
      badge: 'Shirts • T-Shirts • Polo • Down Shoulders',
      desc: 'Tailored pure cotton shirts, French linen, heavy drop-shoulder tees & double-knit pique polo shirts.',
      subcategories: ['All', 'Shirts', 'T-Shirts', 'Polo', 'Down Shoulder']
    },
    {
      id: 'Bottom Wear',
      name: 'Bottom Wear',
      badge: 'Pants • Lowers • Bootcut • Baggie • Formal',
      desc: 'Comfort cotton lowers, trendy flared bootcut jeans, baggy street cargos & royal tailored formal trousers.',
      subcategories: ['All', 'Pants', 'Lowers', 'Bootcut', 'Baggie', 'Formal Trousers']
    },
    {
      id: 'Under Garments',
      name: 'Under Garments',
      badge: 'Underwear • Vests • Socks • Hankey',
      desc: 'Combed cotton anti-chafing trunks, 1x1 ribbed inner vests, cushioned bamboo socks & pure Egyptian cotton hankey sets.',
      subcategories: ['All', 'Underwear', 'Vests', 'Socks', 'Hankey']
    }
  ];

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

  // Subcategory specific filter matcher
  const matchesSubcategory = (product, subcat) => {
    if (!subcat || subcat === 'All') return true;
    const s = subcat.toLowerCase();
    const name = (product.name || '').toLowerCase();
    const cat = (product.category || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const combined = `${name} ${cat} ${desc}`;

    if (s === 'shirts') return combined.includes('shirt') && !combined.includes('t-shirt') && !combined.includes('tshirt') && !combined.includes('polo');
    if (s === 't-shirts') return combined.includes('t-shirt') || combined.includes('tshirt') || combined.includes('tee');
    if (s === 'polo') return combined.includes('polo');
    if (s === 'down shoulder') return combined.includes('down shoulder') || combined.includes('downshoulder') || combined.includes('drop-shoulder') || combined.includes('drop shoulder');
    
    if (s === 'pants') return combined.includes('pant') || combined.includes('trouser');
    if (s === 'lowers') return combined.includes('lower') || combined.includes('trackpant') || combined.includes('jogger');
    if (s === 'bootcut') return combined.includes('bootcut');
    if (s === 'baggie' || s === 'baggy') return combined.includes('baggie') || combined.includes('baggy');
    if (s === 'formal trousers') return combined.includes('formal') || combined.includes('trouser');

    if (s === 'underwear') return combined.includes('underwear') || combined.includes('trunk') || combined.includes('brief') || combined.includes('boxer');
    if (s === 'vests') return combined.includes('vest') || combined.includes('inner');
    if (s === 'socks') return combined.includes('sock');
    if (s === 'hankey') return combined.includes('hankey') || combined.includes('hanky') || combined.includes('handkerchief');

    return combined.includes(s);
  };

  // Extract all unique colors for filter
  const allUniqueColors = useMemo(() => {
    const colors = new Set();
    products.forEach(p => {
      p.stock?.forEach(s => {
        if (s.quantity > 0) colors.add(s.color.trim());
      });
    });
    return Array.from(colors);
  }, [products]);

  // Filter products across primary section, subcategory, search & color
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const section = getProductPrimarySection(p);
      const matchesCategory = selectedCategory === 'All' || 
        section.toLowerCase() === selectedCategory.toLowerCase() ||
        (p.category || '').toLowerCase() === selectedCategory.toLowerCase();
      
      const matchesSub = matchesSubcategory(p, selectedSubCategory);

      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            section.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesColor = selectedColorFilter === 'All';
      if (!matchesColor) {
        matchesColor = p.stock?.some(s => s.color.trim().toLowerCase() === selectedColorFilter.toLowerCase() && s.quantity > 0);
      }

      return matchesCategory && matchesSub && matchesSearch && matchesColor;
    });
  }, [products, selectedCategory, selectedSubCategory, searchQuery, selectedColorFilter]);

  // Handle open modal details
  const openProductModal = (product) => {
    setSelectedProduct(product);
    // Auto-select first color & size that are available in stock
    const availableStock = product.stock?.find(s => s.quantity > 0);
    if (availableStock) {
      setChosenColor(availableStock.color);
      setChosenSize(availableStock.size);
    } else if (product.stock?.length > 0) {
      setChosenColor(product.stock[0].color);
      setChosenSize(product.stock[0].size);
    } else {
      setChosenColor('');
      setChosenSize('');
    }
  };

  // Quick add to cart directly from card
  const handleQuickAddToCart = (e, product) => {
    e.stopPropagation();
    const available = product.stock?.find(s => s.quantity > 0) || product.stock?.[0];
    const effectivePrice = product.discount_percent > 0 
      ? Math.max(1, Math.round(product.price * (1 - product.discount_percent / 100))) 
      : product.price;

    onAddToCart({
      product_id: product.id,
      name: product.name,
      price: effectivePrice,
      original_price: product.discount_percent > 0 ? product.price : undefined,
      discount_percent: product.discount_percent || 0,
      image_url: product.image_url,
      color: available ? available.color : 'Standard',
      size: available ? available.size : 'M',
      quantity: 1
    });
  };

  // Get available sizes for the chosen color of the selected product
  const availableSizesForColor = useMemo(() => {
    if (!selectedProduct || !chosenColor) return [];
    return selectedProduct.stock
      ?.filter(s => s.color.trim().toLowerCase() === chosenColor.trim().toLowerCase())
      .map(s => ({ size: s.size, quantity: s.quantity })) || [];
  }, [selectedProduct, chosenColor]);

  // Check if current selection is in stock
  const currentStockQuantity = useMemo(() => {
    if (!selectedProduct || !chosenColor || !chosenSize) return 0;
    const match = selectedProduct.stock?.find(
      s => s.color.trim().toLowerCase() === chosenColor.trim().toLowerCase() && 
           s.size.trim().toLowerCase() === chosenSize.trim().toLowerCase()
    );
    return match ? match.quantity : 0;
  }, [selectedProduct, chosenColor, chosenSize]);

  // Add to cart helper in modal
  const handleAddToCartClick = () => {
    if (!selectedProduct) return;
    if (!chosenColor || !chosenSize) {
      alert('Please select a color and size.');
      return;
    }

    const effectivePrice = selectedProduct.discount_percent > 0 
      ? Math.max(1, Math.round(selectedProduct.price * (1 - selectedProduct.discount_percent / 100))) 
      : selectedProduct.price;

    onAddToCart({
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      price: effectivePrice,
      original_price: selectedProduct.discount_percent > 0 ? selectedProduct.price : undefined,
      discount_percent: selectedProduct.discount_percent || 0,
      image_url: selectedProduct.image_url,
      color: chosenColor,
      size: chosenSize,
      quantity: 1
    });

    setAddedText(true);
    setTimeout(() => {
      setAddedText(false);
      setSelectedProduct(null);
    }, 450);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <span className="badge badge-gold" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <Sparkles size={13} /> Central India's Men's Fashion Landmark
              </span>
              <h1 className="font-serif">Veer <br /><span>Garments</span></h1>
              <p>
                Step inside our iconic multi-storey showroom at Manak Chowk, Ratlam. From royal groom sherwanis & bespoke 3-piece suiting to pure cotton shirts, denims, and everyday essentials tailored to perfection.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <a href="#shop-section" className="btn-primary">
                  <ShoppingBag size={18} /> Shop Online Collection
                </a>
                <a href="#store-showcase" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} /> Explore Our Showroom
                </a>
              </div>
            </div>
            
            {/* Hero Showcase with Seamless Dual-Buffered Showroom Video */}
            <div 
              className="hero-showcase" 
              onClick={() => {
                if (video0Ref.current && video0Ref.current.paused) {
                  video0Ref.current.muted = true;
                  video0Ref.current.play().catch(() => {});
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <video 
                ref={video0Ref}
                src={STORE_VIDEOS[0].url} 
                autoPlay 
                muted 
                defaultMuted
                playsInline
                webkit-playsinline="true"
                x5-playsinline="true"
                preload="auto"
                onTimeUpdate={handleVideo0TimeUpdate}
                onEnded={transitionToVideo1}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  opacity: activeVideoIdx === 0 ? 1 : 0,
                  transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: activeVideoIdx === 0 ? 2 : 1
                }}
              />

              <video 
                ref={video1Ref}
                src={STORE_VIDEOS[1].url} 
                muted 
                defaultMuted
                playsInline
                webkit-playsinline="true"
                x5-playsinline="true"
                preload="auto"
                onTimeUpdate={handleVideo1TimeUpdate}
                onEnded={transitionToVideo0}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  opacity: activeVideoIdx === 1 ? 1 : 0,
                  transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: activeVideoIdx === 1 ? 2 : 1
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Store Metric Strip */}
      <div style={{
        background: 'rgba(212, 175, 55, 0.04)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.18)',
        padding: '1.25rem 0'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Building2 size={24} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>2-Storey Landmark Showroom</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manak Chowk Main Rd, Ratlam</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Layers size={24} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>10,000+ Ready Garments</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suits, Sherwanis, Shirts & Pants</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sparkles size={24} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>5% Privilege Cashback</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Earned on every purchase</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Award size={24} style={{ color: '#4ade80', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>100% Quality Assurance</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Central India's trusted brand</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flagship Showroom Info & Location */}
      <section id="store-showcase" style={{ padding: '3rem 0 2.5rem 0', background: 'linear-gradient(180deg, rgba(14,14,18,0.7) 0%, rgba(10,10,12,0.95) 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container">
          {/* Store Experience Info Bar */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '16px',
            padding: '1.75rem 2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(212,175,55,0.15)', border: '1px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)', flexShrink: 0 }}>
                <MapPin size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Store Address</span>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>
                  Manak Chowk Main Road
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Dhanmandi, Laxman Pura, Ratlam (M.P.)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(212,175,55,0.15)', border: '1px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)', flexShrink: 0 }}>
                <Clock size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visiting Hours</span>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>
                  10:00 AM – 9:00 PM
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Open All 7 Days a Week
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(212,175,55,0.15)', border: '1px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)', flexShrink: 0 }}>
                <Phone size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Store Contact</span>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>
                  <a href="tel:+919827332721" style={{ color: '#fff', textDecoration: 'none' }}>+91 98273 32721</a>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Call or WhatsApp anytime
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=Veer+Garments+Manak+Chowk+Ratlam+Madhya+Pradesh" 
                target="_blank" 
                rel="noreferrer"
                className="btn-primary"
                style={{ justifyContent: 'center', padding: '0.65rem 1rem', fontSize: '0.82rem', fontWeight: 700 }}
              >
                <MapPin size={15} /> Open in Google Maps
              </a>
              <a 
                href="#shop-section"
                className="btn-secondary"
                style={{ justifyContent: 'center', padding: '0.5rem 1rem', fontSize: '0.78rem' }}
              >
                Browse Online Catalog Below ↓
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* 3 Core Showroom Sections Showcase */}
      <section style={{ padding: '3.5rem 0 1.5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 2.5rem auto' }}>
            <span className="badge badge-gold" style={{ marginBottom: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Layers size={14} /> Shop By Department
            </span>
            <h2 className="font-serif" style={{ fontSize: '2.4rem', marginBottom: '0.65rem' }}>
              Explore Our <span style={{ color: 'var(--accent-gold)' }}>Collections</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Select a section below to discover tailored suiting, street silhouettes, and daily essentials.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.75rem',
            marginBottom: '1rem'
          }}>
            {primarySections.map(sec => {
              const count = products.filter(p => getProductPrimarySection(p) === sec.id).length;
              const isSelected = selectedCategory === sec.id;
              
              return (
                <div
                  key={sec.id}
                  onClick={() => {
                    if (selectedCategory === sec.id) {
                      setSelectedCategory('All');
                      setSelectedSubCategory('All');
                    } else {
                      setSelectedCategory(sec.id);
                      setSelectedSubCategory('All');
                    }
                    const el = document.getElementById('shop-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="glass-card"
                  style={{
                    padding: '2rem 1.75rem',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--accent-gold)' : '1px solid rgba(212, 175, 55, 0.25)',
                    background: isSelected ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.3s ease',
                    boxShadow: isSelected ? '0 10px 30px rgba(212, 175, 55, 0.2)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px' }}>DEPARTMENT</span>
                      <span style={{
                        background: 'rgba(212, 175, 55, 0.15)',
                        color: 'var(--accent-gold)',
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {count} Products
                      </span>
                    </div>

                    <h3 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '0.4rem', color: '#fff' }}>
                      {sec.name}
                    </h3>

                    <div style={{
                      color: 'var(--accent-gold)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginBottom: '0.85rem'
                    }}>
                      {sec.badge}
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.55', marginBottom: '1.5rem' }}>
                      {sec.desc}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: isSelected ? 'var(--accent-gold)' : '#fff'
                  }}>
                    <span>{isSelected ? 'Viewing This Department' : `Explore ${sec.name}`}</span>
                    <span>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Shop Section */}
      <section id="shop-section" style={{ padding: '3.5rem 0 5rem 0' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <h2 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {selectedCategory === 'All' ? 'All Garments' : selectedCategory}
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                {selectedCategory === 'All' 
                  ? 'Showing all items across Upper Wear, Bottom Wear, and Under Garments.'
                  : primarySections.find(s => s.id === selectedCategory)?.desc}
              </p>
            </div>

            {/* Search and Filters */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%', maxWidth: '600px' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search shirts, pants, vest, styles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>

              {/* Color filter */}
              <select 
                value={selectedColorFilter} 
                onChange={(e) => setSelectedColorFilter(e.target.value)} 
                className="form-control"
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <option value="All">All Colors</option>
                {allUniqueColors.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subcategory Style Filter Chips (Only visible when a department is selected) */}
          {selectedCategory !== 'All' && (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '2.5rem',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.5rem' }}>
                Styles in {selectedCategory}:
              </span>
              {primarySections.find(s => s.id === selectedCategory)?.subcategories.map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(sub)}
                  style={{
                    background: selectedSubCategory === sub ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedSubCategory === sub ? '#000' : 'var(--text-main)',
                    border: selectedSubCategory === sub ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '100px',
                    padding: '5px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {sub}
                </button>
              ))}

              <button
                onClick={() => { setSelectedCategory('All'); setSelectedSubCategory('All'); }}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '100px',
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="View all garments from all departments"
              >
                Clear Filter (Show All)
              </button>
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', border: '1px dashed var(--border-light)', borderRadius: '16px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No garments found matching your criteria.</p>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map(product => {
                // Calculate if out of stock
                const totalStock = product.stock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
                
                return (
                  <div key={product.id} className="glass-card product-card" onClick={() => openProductModal(product)}>
                    <div className="product-image-container">
                      {product.image_url ? (
                        <img src={`${API_BASE_URL}${product.image_url}`} alt={product.name} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121216' }}>
                          <ShoppingBag size={48} color="#333" />
                        </div>
                      )}
                      {totalStock === 0 ? (
                        <span className="badge badge-danger" style={{ position: 'absolute', top: '1rem', left: '1rem' }}>Sold Out</span>
                      ) : product.discount_percent > 0 ? (
                        <span style={{ 
                          position: 'absolute', 
                          top: '1rem', 
                          left: '1rem',
                          background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                          color: '#000',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          letterSpacing: '0.04em',
                          boxShadow: '0 4px 12px rgba(212, 175, 55, 0.45)',
                          zIndex: 2
                        }}>
                          {product.discount_percent}% OFF
                        </span>
                      ) : null}
                    </div>
                    
                    <div className="product-info">
                      <span className="product-category">{getProductPrimarySection(product)}</span>
                      <h3 className="product-title">{product.name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {product.description || 'No description available.'}
                      </p>

                      <div className="product-meta-row">
                        {product.discount_percent > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
                            <span className="product-price">
                              ₹{Math.max(1, Math.round(product.price * (1 - product.discount_percent / 100))).toLocaleString('en-IN')}
                            </span>
                            <span style={{ fontSize: '0.82rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                              ₹{product.price.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <span className="product-price">₹{product.price.toLocaleString('en-IN')}</span>
                        )}
                        
                        {/* Display color dots */}
                        <div className="color-indicator-dots">
                          {Array.from(new Set(product.stock?.map(s => s.color.trim()))).slice(0, 4).map((color, idx) => (
                            <span 
                              key={idx} 
                              className="color-dot" 
                              style={{ 
                                backgroundColor: getColorHex(color),
                                border: '1px solid rgba(255, 255, 255, 0.4)'
                              }} 
                              title={color}
                            />
                          ))}
                          {new Set(product.stock?.map(s => s.color)).size > 4 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProductModal(product);
                          }}
                          className="btn-secondary" 
                          style={{ flex: 1, padding: '0.65rem 0.4rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        >
                          <Eye size={15} /> Details
                        </button>
                        <button 
                          type="button"
                          disabled={totalStock === 0}
                          onClick={(e) => handleQuickAddToCart(e, product)}
                          className="btn-primary" 
                          style={{ flex: 1.3, padding: '0.65rem 0.4rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                        >
                          <ShoppingBag size={15} /> Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedProduct(null)}>
              <X size={20} />
            </button>

            <div className="product-detail-grid">
              {/* Product Image */}
              <div className="product-detail-image">
                {selectedProduct.image_url ? (
                  <img src={`${API_BASE_URL}${selectedProduct.image_url}`} alt={selectedProduct.name} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121216' }}>
                    <ShoppingBag size={80} color="#333" />
                  </div>
                )}
              </div>

              {/* Product Details & Purchase Controls */}
              <div className="product-detail-info">
                <span className="badge badge-gold" style={{ alignSelf: 'flex-start' }}>{getProductPrimarySection(selectedProduct)}</span>
                <h2 className="font-serif" style={{ fontSize: '2rem', marginTop: '0.75rem' }}>{selectedProduct.name}</h2>
                
                {selectedProduct.discount_percent > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', margin: '0.5rem 0 1rem' }}>
                    <span className="product-detail-price" style={{ margin: 0 }}>
                      ₹{Math.max(1, Math.round(selectedProduct.price * (1 - selectedProduct.discount_percent / 100))).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '1.15rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                      ₹{selectedProduct.price.toLocaleString('en-IN')}
                    </span>
                    <span style={{ 
                      background: 'linear-gradient(135deg, #d4af37, #b8860b)', 
                      color: '#000', 
                      fontWeight: 800, 
                      fontSize: '0.78rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(212, 175, 55, 0.3)'
                    }}>
                      {selectedProduct.discount_percent}% OFF (SAVE ₹{Math.round(selectedProduct.price * (selectedProduct.discount_percent / 100)).toLocaleString('en-IN')})
                    </span>
                  </div>
                ) : (
                  <span className="product-detail-price">₹{selectedProduct.price.toLocaleString('en-IN')}</span>
                )}
                
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                  {selectedProduct.description || 'Elevate your daily wear with this carefully crafted garment from Veer Garments.'}
                </p>

                {/* Variation selectors */}
                {selectedProduct.stock && selectedProduct.stock.length > 0 ? (
                  <>
                    {/* Color selector */}
                    <div className="variation-selector-group">
                      <h4 className="product-variation-title">Select Color: <span style={{ color: 'var(--accent-gold)' }}>{chosenColor}</span></h4>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {Array.from(new Set(selectedProduct.stock.map(s => s.color.trim()))).map((color) => {
                          const isSelected = chosenColor.toLowerCase() === color.toLowerCase();
                          const hex = getColorHex(color);
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setChosenColor(color);
                                const matches = selectedProduct.stock.filter(
                                  s => s.color.trim().toLowerCase() === color.trim().toLowerCase() && s.quantity > 0
                                );
                                if (matches.length > 0) {
                                  const sizeExists = matches.some(s => s.size === chosenSize);
                                  if (!sizeExists) {
                                    setChosenSize(matches[0].size);
                                  }
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.45rem 0.85rem',
                                borderRadius: '20px',
                                border: isSelected ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-light)',
                                background: isSelected ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.85rem'
                              }}
                            >
                              <span 
                                style={{ 
                                  width: '13px', 
                                  height: '13px', 
                                  borderRadius: '50%', 
                                  backgroundColor: hex,
                                  boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.35)',
                                  display: 'inline-block' 
                                }} 
                              />
                              <span style={{ fontWeight: isSelected ? 600 : 400 }}>{color}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Size selector */}
                    <div className="variation-selector-group">
                      <h4 className="product-variation-title">Select Size: <span style={{ color: 'var(--accent-gold)' }}>{chosenSize}</span></h4>
                      <div className="size-selector-list">
                        {Array.from(new Set(selectedProduct.stock.map(s => s.size.trim()))).map((size) => {
                          // Check if size is in stock for currently chosen color
                          const sizeMatch = availableSizesForColor.find(s => s.size.toLowerCase() === size.toLowerCase());
                          const isOutOfStock = !sizeMatch || sizeMatch.quantity <= 0;

                          return (
                            <button
                              key={size}
                              disabled={isOutOfStock}
                              onClick={() => setChosenSize(size)}
                              className={`size-selector-btn ${chosenSize === size ? 'selected' : ''}`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stock indicator */}
                    <div style={{ marginBottom: '2rem' }}>
                      {currentStockQuantity > 0 ? (
                        <span style={{ fontSize: '0.9rem', color: currentStockQuantity <= 5 ? '#e74c3c' : '#2ecc71', fontWeight: 500 }}>
                          {currentStockQuantity <= 5 ? `Only ${currentStockQuantity} items left in stock!` : 'In Stock'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: '#e74c3c', fontWeight: 500 }}>
                          Selected variation is currently Out of Stock
                        </span>
                      )}
                    </div>

                    <button
                      className="btn-primary"
                      disabled={currentStockQuantity <= 0}
                      onClick={handleAddToCartClick}
                      style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
                    >
                      {addedText ? (
                        <>
                          <Check size={18} /> Added to Cart!
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={18} /> Add to Cart
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div style={{ color: '#e74c3c', fontWeight: 500 }}>
                    Product out of stock. Check back later!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
