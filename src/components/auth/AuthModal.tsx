import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { databaseApi } from '../../lib/database';
import { UserProfile } from '../../types';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Mail, Lock, User, Phone, Shield, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import '../../styles/auth.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleRedirecting, setGoogleRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [identifier, setIdentifier] = useState(''); // username or email for signin
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [role, setRole] = useState('Primary Earner');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setGoogleRedirecting(true);

      // Create OAuth URL with deep link redirect
      const isTauriApp = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || Boolean((window as any).isTauri));
      const redirectUri = isTauriApp
        ? 'budgettracker://auth-callback'
        : window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true, // Don't redirect the WebView
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Explicitly start Android Intent.ACTION_VIEW via native Rust bridge
        // This guarantees Android OS dispatches to the system default browser (Chrome, Brave, Samsung Internet)
        if (isTauriApp) {
          try {
            await invoke('open_in_external_browser', { url: data.url });
          } catch (invokeErr) {
            console.warn('Native browser dispatch failed, fallback openUrl:', invokeErr);
            try {
              await openUrl(data.url);
            } catch {
              window.open(data.url, '_system');
            }
          }
        } else {
          window.location.href = data.url;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      setErrorMsg(msg);
      setGoogleRedirecting(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      let loginEmail = identifier.trim();

      // If user provided a username instead of an email, look up their email from bt_profiles
      if (!loginEmail.includes('@')) {
        const { data, error } = await supabase
          .from('bt_profiles')
          .select('email')
          .eq('username', loginEmail.toLowerCase())
          .maybeSingle();

        if (error || !data?.email) {
          throw new Error('Username not found. Please verify or use email.');
        }
        loginEmail = data.email;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Fetch or hydrate profile
        let userProfile = await databaseApi.fetchRemoteProfile(authData.user.id);
        const meta = authData.user.user_metadata || {};
        const googleName = meta.full_name || meta.name || loginEmail.split('@')[0];
        const googleAvatar = meta.avatar_url || meta.picture;
        const googleUsername = meta.user_name || loginEmail.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '');

        if (!userProfile) {
          userProfile = {
            id: authData.user.id,
            username: googleUsername,
            fullName: googleName,
            email: authData.user.email || loginEmail,
            contactNumber: meta.contact_number || '',
            role: meta.role || 'Primary Earner',
            theme: 'dark',
            currency: 'PHP',
            dailyNecessityCap: 500,
            activeScheduleDays: [1, 2, 4, 5, 6],
            restDayNecessityCap: 150,
            avatarUrl: googleAvatar || undefined,
          };
          await databaseApi.upsertRemoteProfile(userProfile);
        } else {
          userProfile = {
            ...userProfile,
            fullName: userProfile.fullName || googleName,
            avatarUrl: userProfile.avatarUrl || googleAvatar || undefined,
          };
        }
        onAuthSuccess(userProfile);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!username.trim() || !email.trim() || !password.trim()) {
        throw new Error('Please fill in all required fields.');
      }

      // Check if username already exists
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      const { data: existingUser } = await supabase
        .from('bt_profiles')
        .select('username')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        throw new Error(`Username @${cleanUsername} is already taken.`);
      }

      // 1. Supabase Auth signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: fullName.trim(),
            contact_number: contactNumber.trim(),
            role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Insert into bt_profiles database table
        const newProfile: UserProfile = {
          id: authData.user.id,
          username: cleanUsername,
          fullName: fullName.trim() || cleanUsername,
          email: email.trim(),
          contactNumber: contactNumber.trim(),
          role,
          theme: 'dark',
          currency: 'USD',
          dailyNecessityCap: 60,
        };

        const success = await databaseApi.upsertRemoteProfile(newProfile);
        if (!success) {
          console.warn('bt_profiles record could not be written directly; session will fallback to memory');
        }

        onAuthSuccess(newProfile);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal-sheet">
        {/* Header Tabs */}
        <div className="auth-header-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
          >
            Create Account
          </button>
        </div>

        {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}
        {googleRedirecting && !errorMsg && (
          <div
            className="auth-info-banner"
            style={{
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#d4af37',
              marginBottom: '14px',
              textAlign: 'center',
            }}
          >
            Authorizing in browser... Return here once signed in to continue.
          </div>
        )}

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="auth-form-body">
            <div className="auth-intro">
              <h3>Welcome Back</h3>
              <p>Sign in with your username or registered email.</p>
            </div>

            <div className="auth-input-group">
              <label>Username or Email</label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-field-icon" />
                <input
                  type="text"
                  placeholder="Username or your@email.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                />
              </svg>
              Continue with Google
            </button>

            <button type="button" className="auth-close-link" onClick={onClose}>
              Continue as Guest (Offline Only)
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="auth-form-body">
            <div className="auth-intro">
              <h3>Create Your Account</h3>
              <p>Your details sync automatically with Supabase & profile.</p>
            </div>

            <div className="auth-grid-two">
              <div className="auth-input-group">
                <label>Username</label>
                <div className="auth-input-wrapper">
                  <span style={{ fontSize: '13px', color: 'var(--neon-yellow)', fontWeight: 800 }}>@</span>
                  <input
                    type="text"
                    placeholder="julian"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Full Name</label>
                <div className="auth-input-wrapper">
                  <User size={16} className="auth-field-icon" />
                  <input
                    type="text"
                    placeholder="Julian Agustino"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-input-group">
              <label>Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-field-icon" />
                <input
                  type="email"
                  placeholder="julian@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-input-group">
                <label>Contact Number</label>
                <div className="auth-input-wrapper">
                  <Phone size={16} className="auth-field-icon" />
                  <input
                    type="tel"
                    placeholder="+63 912 345 6789"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Role</label>
                <div className="auth-input-wrapper">
                  <Shield size={16} className="auth-field-icon" />
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="Primary Earner">Primary Earner</option>
                    <option value="Household Admin">Household Admin</option>
                    <option value="Personal Saver">Personal Saver</option>
                    <option value="Student">Student</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-primary-btn" disabled={loading}>
              <Sparkles size={16} />
              {loading ? 'Creating...' : 'Create Account & Sync to DB'}
            </button>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                />
              </svg>
              Sign Up with Google
            </button>

            <button type="button" className="auth-close-link" onClick={onClose}>
              Cancel / Back to App
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
