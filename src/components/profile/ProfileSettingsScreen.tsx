import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Moon,
  Sun,
  Cloud,
  Database,
  ArrowLeft,
  Check,
  Globe,
  CalendarDays,
  Camera,
  Trash2,
  Bot,
  Key,
  Server,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { WORLD_CURRENCIES, getCurrencySymbol } from '../../lib/currencies';
import { AiClientService, AiModelOption } from '../../services/aiClientService';
import '../../styles/profile.css';

interface ProfileSettingsScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onResetData?: () => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onBack: () => void;
  pendingSyncCount?: number;
}

export const ProfileSettingsScreen: React.FC<ProfileSettingsScreenProps> = ({
  profile,
  onUpdateProfile,
  onResetData,
  onOpenAuth,
  onSignOut,
  onBack,
  pendingSyncCount = 0,
}) => {
  const { theme, setTheme } = useTheme();

  const [username, setUsername] = useState(profile.username || '');
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [contactNumber, setContactNumber] = useState(profile.contactNumber);
  const [role, setRole] = useState(profile.role);
  const [currency, setCurrency] = useState(profile.currency || 'PHP');
  const [dailyCap, setDailyCap] = useState((profile.dailyNecessityCap || 500).toString());
  const [restCap, setRestCap] = useState((profile.restDayNecessityCap !== undefined ? profile.restDayNecessityCap : 150).toString());
  const [activeDays, setActiveDays] = useState<number[]>(profile.activeScheduleDays || [1, 2, 4, 5, 6]);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile.avatarUrl);
  const [aiBaseUrl, setAiBaseUrl] = useState(profile.aiBaseUrl || '');
  const [aiApiKey, setAiApiKey] = useState(profile.aiApiKey || '');
  const [aiModel, setAiModel] = useState(profile.aiModel || '');
  const [detectedModels, setDetectedModels] = useState<AiModelOption[]>([]);
  const [isDetectingModels, setIsDetectingModels] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: keep compressed data URI under 2MB for fast local IDB storage
    if (file.size > 5 * 1024 * 1024) {
      alert('Please choose an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarUrl(base64);
      onUpdateProfile({ ...profile, avatarUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatarUrl(undefined);
    onUpdateProfile({ ...profile, avatarUrl: undefined });
  };

  const toggleDay = (dayIndex: number) => {
    setActiveDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleDetectModels = async () => {
    if (!aiBaseUrl.trim()) {
      setDetectError('Please provide a Base URL first (e.g. https://openrouter.ai/api/v1).');
      return;
    }
    setIsDetectingModels(true);
    setDetectError(null);
    try {
      const list = await AiClientService.fetchAvailableModels(aiBaseUrl, aiApiKey);
      setDetectedModels(list);
      if (list.length > 0) {
        // Auto select first (first model is free if any free model exists)
        if (!aiModel || !list.some((m) => m.id === aiModel)) {
          setAiModel(list[0].id);
        }
      } else {
        setDetectError('No models returned from provider.');
      }
    } catch (err: any) {
      setDetectError(err.message || 'Failed to detect models.');
    } finally {
      setIsDetectingModels(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      username,
      fullName,
      email,
      contactNumber,
      role,
      theme,
      currency,
      dailyNecessityCap: parseFloat(dailyCap) || 500,
      activeScheduleDays: activeDays,
      restDayNecessityCap: parseFloat(restCap) || 150,
      avatarUrl,
      aiBaseUrl: aiBaseUrl.trim() || undefined,
      aiApiKey: aiApiKey.trim() || undefined,
      aiModel: aiModel.trim() || undefined,
    };
    onUpdateProfile(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="profile-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="icon-circle-btn" onClick={onBack} title="Back">
          <ArrowLeft size={16} />
        </button>
        <div style={{ fontSize: '15px', fontWeight: 800 }}>Profile & Settings</div>
        <button
          className="pill-badge"
          style={{
            background: isSaved ? 'rgba(34, 197, 94, 0.2)' : 'var(--neon-yellow)',
            color: isSaved ? 'var(--accent-green)' : 'var(--neon-yellow-text)',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 14px',
          }}
          onClick={handleSave}
        >
          {isSaved ? <Check size={12} /> : 'Save'}
        </button>
      </div>

      {/* Profile Hero Avatar */}
      <div className="profile-hero-card">
        {/* Hidden file input for local photo picking */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          style={{ display: 'none' }}
        />

        <div
          className="profile-avatar-circle"
          onClick={() => fileInputRef.current?.click()}
          title="Tap to change profile picture"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="profile-avatar-img" />
          ) : (
            getInitials(fullName || username || 'U')
          )}
          <div className="avatar-badge-edit">
            <Camera size={12} />
          </div>
        </div>

        {avatarUrl && (
          <button
            type="button"
            onClick={handleRemoveImage}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-pink)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '-4px',
              marginBottom: '6px',
            }}
          >
            <Trash2 size={11} /> Remove photo
          </button>
        )}

        <div className="profile-name-text">{fullName || 'Set Name'}</div>
        <div style={{ fontSize: '12px', color: 'var(--neon-yellow)', marginTop: '2px', fontWeight: 700 }}>
          {username ? `@${username}` : 'No username'}
        </div>
        <div className="profile-role-pill">{role}</div>
      </div>

      <form onSubmit={handleSave}>
        {/* Section 1: Personal Details */}
        <div className="section-group-label">Personal Information</div>
        <div className="settings-card-group">
          <div className="settings-row-item">
            <div className="settings-row-left">
              <div className="settings-row-icon">
                <User size={15} />
              </div>
              <div>
                <div className="settings-field-title">Username</div>
                <input
                  type="text"
                  className="input-field"
                  style={{ padding: '6px 10px', fontSize: '13px', marginTop: '4px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. julian"
                  required
                />
              </div>
            </div>
          </div>

          <div className="settings-row-item">
            <div className="settings-row-left">
              <div className="settings-row-icon">
                <User size={15} />
              </div>
              <div>
                <div className="settings-field-title">Full Name</div>
                <input
                  type="text"
                  className="input-field"
                  style={{ padding: '6px 10px', fontSize: '13px', marginTop: '4px' }}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="settings-row-item">
            <div className="settings-row-left">
              <div className="settings-row-icon">
                <Mail size={15} />
              </div>
              <div>
                <div className="settings-field-title">Email Address</div>
                <input
                  type="email"
                  className="input-field"
                  style={{ padding: '6px 10px', fontSize: '13px', marginTop: '4px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="settings-row-item">
            <div className="settings-row-left">
              <div className="settings-row-icon">
                <Phone size={15} />
              </div>
              <div>
                <div className="settings-field-title">Contact Number</div>
                <input
                  type="tel"
                  className="input-field"
                  style={{ padding: '6px 10px', fontSize: '13px', marginTop: '4px' }}
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="settings-row-item">
            <div className="settings-row-left">
              <div className="settings-row-icon">
                <Shield size={15} />
              </div>
              <div>
                <div className="settings-field-title">Role / Profile Scope</div>
                <select
                  className="input-field"
                  style={{ padding: '6px 10px', fontSize: '13px', marginTop: '4px' }}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Primary Earner">Primary Earner</option>
                  <option value="Household Admin">Household Admin</option>
                  <option value="Personal Saver">Personal Saver</option>
                  <option value="Student">Student</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Appearance & System Theme */}
        <div className="section-group-label">System Appearance</div>
        <div className="settings-card-group">
          <div className="settings-row-item">
            <div className="settings-row-left">
              <div className="settings-row-icon">
                {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
              </div>
              <div>
                <div className="settings-field-title">System Theme</div>
                <div className="settings-field-desc">Custom CSS Token System</div>
              </div>
            </div>

            <div className="theme-switch-container">
              <button
                type="button"
                className={`theme-switch-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => {
                  setTheme('dark');
                  onUpdateProfile({ ...profile, theme: 'dark' });
                }}
              >
                <Moon size={12} /> Dark
              </button>
              <button
                type="button"
                className={`theme-switch-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => {
                  setTheme('light');
                  onUpdateProfile({ ...profile, theme: 'light' });
                }}
              >
                <Sun size={12} /> Light
              </button>
            </div>
          </div>

          <div className="settings-row-item">
            <div className="settings-row-left" style={{ flex: 1 }}>
              <div className="settings-row-icon">
                <Globe size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="settings-field-title">Default Currency</div>
                <div className="settings-field-desc">Used across balance, wallets & transactions</div>
                <select
                  className="input-field"
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    marginTop: '8px',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                  value={currency}
                  onChange={(e) => {
                    const newCurr = e.target.value;
                    setCurrency(newCurr);
                    onUpdateProfile({ ...profile, currency: newCurr });
                  }}
                >
                  {WORLD_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active Schedule & Dual Necessity Cap */}
          <div className="settings-row-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="settings-row-left" style={{ marginBottom: '8px' }}>
              <div className="settings-row-icon">
                <CalendarDays size={15} />
              </div>
              <div>
                <div className="settings-field-title">Work & School Schedule</div>
                <div className="settings-field-desc">Tap active days to assign higher daily allowance</div>
              </div>
            </div>

            {/* Days pills grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '6px',
                marginTop: '4px',
                marginBottom: '12px',
              }}
            >
              {[
                { label: 'Mon', index: 1 },
                { label: 'Tue', index: 2 },
                { label: 'Wed', index: 3 },
                { label: 'Thu', index: 4 },
                { label: 'Fri', index: 5 },
                { label: 'Sat', index: 6 },
                { label: 'Sun', index: 0 },
              ].map((day) => {
                const isActive = activeDays.includes(day.index);
                return (
                  <button
                    key={day.index}
                    type="button"
                    onClick={() => toggleDay(day.index)}
                    style={{
                      background: isActive ? 'var(--role-accent-bg, rgba(232, 249, 83, 0.15))' : 'var(--card-elevated)',
                      border: isActive ? '1px solid var(--role-accent-border, #E8F953)' : '1px solid var(--card-border)',
                      color: isActive ? 'var(--role-accent-color, var(--text-primary))' : 'var(--text-muted)',
                      borderRadius: '10px',
                      padding: '8px 2px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{day.label}</span>
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: isActive ? 'var(--accent-green)' : 'transparent',
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Dual Cap Inputs */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <div
                style={{
                  flex: 1,
                  background: 'var(--card-elevated)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '10px',
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🎒 Work/School Cap
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--role-accent-color, var(--text-primary))' }}>
                    {getCurrencySymbol(currency)}
                  </span>
                  <input
                    type="number"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '15px',
                      fontWeight: 800,
                      width: '100%',
                      outline: 'none',
                    }}
                    value={dailyCap}
                    onChange={(e) => setDailyCap(e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  background: 'var(--card-elevated)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '10px',
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  ☕ Rest/Off-Day Cap
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--role-accent-color, var(--text-primary))' }}>
                    {getCurrencySymbol(currency)}
                  </span>
                  <input
                    type="number"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '15px',
                      fontWeight: 800,
                      width: '100%',
                      outline: 'none',
                    }}
                    value={restCap}
                    onChange={(e) => setRestCap(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: AI Assistant Configuration */}
        <div className="section-group-label">AI Assistant (Custom Base URL & Model)</div>
        <div className="settings-card-group">
          <div className="settings-row-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div className="settings-row-left" style={{ width: '100%' }}>
              <div className="settings-row-icon" style={{ color: 'var(--neon-yellow)' }}>
                <Server size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="settings-field-title">Custom Base URL</div>
                <div className="settings-field-desc">OpenAI / OpenRouter / Local Ollama base endpoint</div>
              </div>
            </div>
            <input
              type="url"
              className="settings-input"
              style={{ width: '100%', fontSize: '13px' }}
              placeholder="e.g. https://openrouter.ai/api/v1 or https://api.openai.com/v1"
              value={aiBaseUrl}
              onChange={(e) => setAiBaseUrl(e.target.value)}
            />
          </div>

          <div className="settings-row-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div className="settings-row-left" style={{ width: '100%' }}>
              <div className="settings-row-icon" style={{ color: 'var(--accent-pink)' }}>
                <Key size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="settings-field-title">API Key</div>
                <div className="settings-field-desc">Stored privately on your device only</div>
              </div>
            </div>
            <input
              type="password"
              className="settings-input"
              style={{ width: '100%', fontSize: '13px' }}
              placeholder="sk-..."
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
            />
          </div>

          <div className="settings-row-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div className="settings-row-left">
                <div className="settings-row-icon" style={{ color: 'var(--accent-blue, #38BDF8)' }}>
                  <Bot size={15} />
                </div>
                <div>
                  <div className="settings-field-title">Model Name</div>
                  <div className="settings-field-desc">Auto-detected or manually typed</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetectModels}
                disabled={isDetectingModels}
                style={{
                  background: 'var(--card-elevated)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: isDetectingModels ? 'wait' : 'pointer',
                }}
              >
                <RefreshCw size={12} className={isDetectingModels ? 'ai-spin' : ''} />
                {isDetectingModels ? 'Detecting...' : 'Auto Detect'}
              </button>
            </div>

            {detectedModels.length > 0 ? (
              <select
                className="settings-select"
                style={{ width: '100%', fontSize: '13px' }}
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
              >
                <option value="">-- Select auto-detected model --</option>
                {detectedModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.isFree ? `🎁 [FREE] ${m.name}` : m.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="settings-input"
                style={{ width: '100%', fontSize: '13px' }}
                placeholder="e.g. meta-llama/llama-3.2-3b-instruct:free or gpt-4o-mini"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
              />
            )}

            {detectError && (
              <div style={{ fontSize: '11px', color: 'var(--accent-pink)', marginTop: '2px' }}>
                ⚠️ {detectError}
              </div>
            )}
            {detectedModels.length > 0 && (
              <div style={{ fontSize: '11px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> Detected {detectedModels.length} models. Free models placed first.
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Supabase & Sync Status */}
        <div className="section-group-label">Account & Cloud Sync</div>
        <div className="settings-card-group">
          <div className="settings-row-item">
            <div className="settings-row-left">
              <div className="settings-row-icon" style={{ color: 'var(--accent-green)' }}>
                <Cloud size={15} />
              </div>
              <div>
                <div className="settings-field-title">
                  {profile.email ? `Signed In (${profile.email})` : 'Guest Account'}
                </div>
                <div className="settings-field-desc">
                  {profile.email ? 'Connected to Supabase PostgreSQL' : 'Local only, sign in to sync cloud'}
                </div>
              </div>
            </div>
            {profile.email && onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                style={{
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: 'var(--accent-pink)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            ) : onOpenAuth ? (
              <button
                type="button"
                onClick={onOpenAuth}
                style={{
                  background: 'var(--neon-yellow)',
                  color: 'var(--neon-yellow-text)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            ) : (
              <span style={{ color: 'var(--accent-green)', fontSize: '11px', fontWeight: 700 }}>
                Connected
              </span>
            )}
          </div>

          <div className="settings-row-item">
            <div className="settings-row-left">
              <div className="settings-row-icon">
                <Database size={15} />
              </div>
              <div>
                <div className="settings-field-title">IndexedDB Offline Queue</div>
                <div className="settings-field-desc">
                  {pendingSyncCount} pending offline changes
                </div>
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Local Active</span>
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '16px' }}>
          <Check size={16} /> Save Profile Changes
        </button>

        {onResetData && (
          <button
            type="button"
            onClick={onResetData}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-pink)',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗑️ Clear Local Cache & Reset Clean
          </button>
        )}
      </form>
    </div>
  );
};
