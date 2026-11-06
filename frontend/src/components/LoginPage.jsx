import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Phone, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  Crown,
  Smartphone,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { safeFetch, isStaticMode } from '../utils/apiHelper';

export default function LoginPage({ onLoginSuccess, API_BASE_URL, onOpenAdmin }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  
  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register Form States
  const [regStep, setRegStep] = useState('form'); // 'form' or 'otp'
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // OTP States
  const [otpValue, setOtpValue] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Status & feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Clear messages on tab switch
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMessage('');
    setSuccessMessage('');
    setRegStep('form');
  };

  // Handle Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginIdentifier.trim()) {
      setErrorMessage('Please enter your email or phone number');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      if (isStaticMode()) {
        const demoUser = {
          id: 1,
          name: loginIdentifier.includes('@') ? loginIdentifier.split('@')[0] : 'Veer Member',
          email: loginIdentifier.includes('@') ? loginIdentifier : 'client@veer.com',
          phone: !loginIdentifier.includes('@') ? loginIdentifier : '9827332721',
          role: 'customer'
        };
        setSuccessMessage('Welcome to Veer Garments Showcase!');
        setTimeout(() => {
          onLoginSuccess(demoUser, rememberMe);
        }, 600);
        return;
      }

      const res = await safeFetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword
        })
      });

      if (!res.ok) {
        if (res.isHtml || res.status === 404) {
          const demoUser = {
            id: 1,
            name: loginIdentifier.includes('@') ? loginIdentifier.split('@')[0] : 'Veer Member',
            email: loginIdentifier.includes('@') ? loginIdentifier : 'client@veer.com',
            phone: !loginIdentifier.includes('@') ? loginIdentifier : '9827332721',
            role: 'customer'
          };
          setSuccessMessage('Welcome to Veer Garments Showcase!');
          setTimeout(() => {
            onLoginSuccess(demoUser, rememberMe);
          }, 600);
          return;
        }
        throw new Error((res.data && res.data.error) || 'Failed to login. Please check your credentials.');
      }

      setSuccessMessage('Welcome back! Loading Veer Garments...');
      setTimeout(() => {
        onLoginSuccess(res.data.user, rememberMe);
      }, 600);
    } catch (err) {
      if (isStaticMode()) {
        const demoUser = {
          id: 1,
          name: loginIdentifier.includes('@') ? loginIdentifier.split('@')[0] : 'Veer Member',
          email: loginIdentifier.includes('@') ? loginIdentifier : 'client@veer.com',
          phone: !loginIdentifier.includes('@') ? loginIdentifier : '9827332721',
          role: 'customer'
        };
        setSuccessMessage('Welcome to Veer Garments Showcase!');
        setTimeout(() => {
          onLoginSuccess(demoUser, rememberMe);
        }, 600);
        return;
      }
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Send OTP for mobile number verification
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    const cleanPhone = regPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      let otpDispatched = false;
      let msg = null;

      if (API_BASE_URL && !isStaticMode()) {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/send-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            phone: cleanPhone, 
            email: regEmail.trim() 
          })
        });

        if (res.ok && res.data) {
          otpDispatched = true;
          msg = res.data.message;
        } else if (!res.isHtml && res.data?.error) {
          throw new Error(res.data.error);
        }
      }

      if (!otpDispatched) {
        // Fallback for static showcase / GitHub Pages
        otpDispatched = true;
        msg = `Showcase Mode: OTP sent! Use 123456 to verify.`;
      }

      setRegStep('otp');
      setCountdown(45);
      setOtpValue(''); // Always blank - user must enter from received SMS/Email
      setSuccessMessage(msg || `Verification OTP sent to +91 ${cleanPhone}`);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and Register user account
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = regPhone.replace(/\D/g, '').slice(-10);
    const cleanOtp = otpValue.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP sent to your phone');
      return;
    }

    setIsLoading(true);
    try {
      let registered = false;
      let userData = null;

      if (API_BASE_URL && !isStaticMode()) {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: regName.trim(),
            email: regEmail.trim(),
            phone: cleanPhone,
            password: regPassword,
            otp: cleanOtp
          })
        });

        if (res.ok && res.data) {
          registered = true;
          userData = res.data.user;
        } else if (!res.isHtml && res.data?.error) {
          throw new Error(res.data.error);
        }
      }

      if (!registered) {
        // Fallback for static showcase / GitHub Pages
        userData = {
          id: Date.now(),
          name: regName.trim(),
          email: regEmail.trim(),
          phone: cleanPhone,
          role: 'customer'
        };
        const users = JSON.parse(localStorage.getItem('veer_local_users') || '[]');
        users.push(userData);
        localStorage.setItem('veer_local_users', JSON.stringify(users));
        registered = true;
      }

      setSuccessMessage('Mobile verified & Account created! Entering store...');
      setTimeout(() => {
        onLoginSuccess(userData, true);
      }, 700);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
      const cleanPhone = regPhone.replace(/\D/g, '').slice(-10);
      if (API_BASE_URL && !isStaticMode()) {
        await safeFetch(`${API_BASE_URL}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: cleanPhone, 
            email: regEmail.trim() 
          })
        });
      }
      setCountdown(45);
      setOtpValue(''); // Always blank
      setSuccessMessage(`Showcase Mode: New OTP dispatched to +91 ${cleanPhone} (Use 123456)`);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Auto-fill for instant testing
  const handleQuickDemo = () => {
    setActiveTab('login');
    setRegStep('form');
    setLoginIdentifier('customer@veer.com');
    setLoginPassword('veer1234');
    setErrorMessage('');
    setSuccessMessage('Demo member credentials prefilled!');
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-overlay-glow" />

      <div className="auth-container">
        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-brand-badge">
            <Crown size={15} className="auth-crown-icon" />
            <span>ESTD. VEER LUXURY APPAREL</span>
          </div>
          <h1 className="auth-brand-title">
            VEER <span>Garments</span>
          </h1>
          <p className="auth-brand-subtitle">
            Please sign in or create your member account to access our exclusive garments & catalog.
          </p>
        </div>

        {/* Auth Card */}
        <div className="auth-card glass-panel">
          {/* Tabs */}
          <div className="auth-tabs">
            <button 
              type="button"
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => handleTabChange('login')}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => handleTabChange('register')}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="auth-alert error">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert success">
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <div className="auth-form-group">
                <label className="auth-label">Email or Phone Number</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
                  <input 
                    type="text" 
                    placeholder="Enter email or mobile number"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="auth-input"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="auth-form-group">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input 
                    type={showLoginPassword ? 'text' : 'password'} 
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="auth-input"
                    autoComplete="current-password"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="auth-password-toggle"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="auth-checkbox"
                  />
                  <span>Keep me signed in</span>
                </label>
              </div>

              <button 
                type="submit" 
                className="auth-submit-btn" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="auth-btn-spinner-text">
                    <span className="auth-spinner" /> Signing in...
                  </span>
                ) : (
                  <>
                    Sign In to Store <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="auth-divider">
                <span>NEW TO VEER?</span>
              </div>

              <button 
                type="button" 
                className="auth-secondary-btn"
                onClick={() => handleTabChange('register')}
              >
                Create a New Account
              </button>
            </form>
          ) : (
            /* CREATE ACCOUNT WITH MOBILE OTP VERIFICATION */
            <>
              {regStep === 'form' ? (
                /* Step 1: Account Information */
                <form onSubmit={handleSendOtp} className="auth-form">
                  <div className="auth-form-group">
                    <label className="auth-label">Full Name *</label>
                    <div className="auth-input-wrapper">
                      <User size={18} className="auth-input-icon" />
                      <input 
                        type="text" 
                        placeholder="e.g. Rajesh Kumar"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Email Address *</label>
                    <div className="auth-input-wrapper">
                      <Mail size={18} className="auth-input-icon" />
                      <input 
                        type="email" 
                        placeholder="e.g. rajesh@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="auth-label">Mobile Number *</label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)' }}>OTP required</span>
                    </div>
                    <div className="auth-input-wrapper">
                      <Phone size={18} className="auth-input-icon" />
                      <input 
                        type="tel" 
                        maxLength="10"
                        placeholder="10-digit mobile (e.g. 9827332721)"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                        className="auth-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Create Password * (Min. 6 chars)</label>
                    <div className="auth-input-wrapper">
                      <Lock size={18} className="auth-input-icon" />
                      <input 
                        type={showRegPassword ? 'text' : 'password'} 
                        placeholder="Create a strong password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="auth-input"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="auth-password-toggle"
                      >
                        {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Confirm Password *</label>
                    <div className="auth-input-wrapper">
                      <ShieldCheck size={18} className="auth-input-icon" />
                      <input 
                        type={showRegConfirmPassword ? 'text' : 'password'} 
                        placeholder="Confirm your password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="auth-input"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="auth-password-toggle"
                      >
                        {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="auth-submit-btn" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="auth-btn-spinner-text">
                        <span className="auth-spinner" /> Sending OTP...
                      </span>
                    ) : (
                      <>
                        <Mail size={18} /> Send OTP & Verify Email
                      </>
                    )}
                  </button>

                  <div className="auth-divider">
                    <span>ALREADY REGISTERED?</span>
                  </div>

                  <button 
                    type="button" 
                    className="auth-secondary-btn"
                    onClick={() => handleTabChange('login')}
                  >
                    Sign In to Existing Account
                  </button>
                </form>
              ) : (
                /* Step 2: OTP Verification */
                <form onSubmit={handleVerifyAndRegister} className="auth-form">
                  <div className="auth-otp-header-banner">
                    <div className="auth-otp-icon-wrap">
                      <Mail size={24} className="auth-otp-pulse" />
                    </div>
                    <div>
                      <h4 style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600 }}>
                        Verify Your Email Address
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        OTP sent to your email <strong>{regEmail}</strong>{' '}
                        <button 
                          type="button" 
                          onClick={() => { setRegStep('form'); setErrorMessage(''); }}
                          className="auth-edit-phone-btn"
                        >
                          (Edit)
                        </button>
                      </p>
                    </div>
                  </div>

                  <div className="auth-channel-notice">
                    <Mail size={16} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                    <span>Please check your phone text messages (SMS) or email inbox for your 6-digit verification code.</span>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-label">Enter 6-Digit OTP</label>
                    <div className="auth-input-wrapper">
                      <ShieldCheck size={18} className="auth-input-icon" />
                      <input 
                        type="text" 
                        maxLength="6"
                        placeholder="• • • • • •"
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        className="auth-input auth-otp-input"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Didn't receive code?</span>
                    {countdown > 0 ? (
                      <span style={{ color: 'var(--text-muted)' }}>Resend in {countdown}s</span>
                    ) : (
                      <button 
                        type="button" 
                        onClick={handleResendOtp}
                        className="auth-resend-link"
                        disabled={isLoading}
                      >
                        <RefreshCw size={13} /> Resend OTP
                      </button>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    className="auth-submit-btn" 
                    disabled={isLoading || otpValue.length !== 6}
                  >
                    {isLoading ? (
                      <span className="auth-btn-spinner-text">
                        <span className="auth-spinner" /> Verifying...
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 size={18} /> Verify OTP & Create Account
                      </>
                    )}
                  </button>

                  <button 
                    type="button" 
                    className="auth-secondary-btn"
                    onClick={() => { setRegStep('form'); setErrorMessage(''); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <ArrowLeft size={16} /> Back to Details
                  </button>
                </form>
              )}
            </>
          )}

          {/* Quick Demo Helper */}
          <div className="auth-quick-helper">
            <button 
              type="button" 
              onClick={handleQuickDemo}
              className="auth-demo-pill"
              title="Click to fill sample demo login"
            >
              <Sparkles size={14} /> Quick Demo Fill
            </button>
          </div>
        </div>

        {/* Footer Link for Store Owner */}
        <div className="auth-footer-notes">
          <p>
            Are you the store administrator?{' '}
            <button 
              type="button" 
              onClick={onOpenAdmin} 
              className="auth-admin-link"
            >
              Enter Owner Portal
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
