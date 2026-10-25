import React from 'react';
import { X, Bell, AlertTriangle, Sparkles, HandCoins, CheckCircle2 } from 'lucide-react';
import { Transaction, Loan, UserProfile } from '../../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  loans: Loan[];
  profile: UserProfile;
  currencySymbol?: string;
}

export interface SmartNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'loan' | 'tip' | 'info';
  timestamp: string;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  loans,
  profile,
  currencySymbol = '$',
}) => {
  if (!isOpen) return null;

  // Generate dynamic, live intelligent updates based on actual user data
  const notifications: SmartNotification[] = [];

  // 1. Daily Necessity Cap Check
  const todayStr = new Date().toISOString().split('T')[0];
  const todayNecessitySpend = transactions
    .filter((t) => t.type === 'expense' && t.isNecessity && t.date.startsWith(todayStr))
    .reduce((sum, t) => sum + t.amount, 0);

  if (todayNecessitySpend > profile.dailyNecessityCap) {
    notifications.push({
      id: 'cap-exceeded',
      title: 'Daily Necessity Cap Exceeded',
      message: `You spent ${currencySymbol}${todayNecessitySpend.toFixed(2)} on essentials today, exceeding your ${currencySymbol}${profile.dailyNecessityCap.toFixed(2)} target.`,
      type: 'alert',
      timestamp: 'Today',
    });
  } else if (todayNecessitySpend > 0) {
    notifications.push({
      id: 'cap-status',
      title: 'Daily Necessity Status',
      message: `${currencySymbol}${todayNecessitySpend.toFixed(2)} spent out of ${currencySymbol}${profile.dailyNecessityCap.toFixed(2)} allowance.`,
      type: 'tip',
      timestamp: 'Today',
    });
  }

  // 2. Uncollected Loans Alert
  const pendingLoans = loans.filter((l) => l.status === 'active' || l.status === 'partial');
  const totalReceivable = pendingLoans.reduce((sum, l) => sum + l.remainingAmount, 0);

  if (pendingLoans.length > 0) {
    notifications.push({
      id: 'pending-loans',
      title: `${pendingLoans.length} Outstanding Loan(s)`,
      message: `You have ${currencySymbol}${totalReceivable.toFixed(2)} waiting to be collected from borrowers.`,
      type: 'loan',
      timestamp: 'Active',
    });
  }

  // 3. Welcome / Status notice
  notifications.push({
    id: 'db-sync',
    title: 'Cloud Sync Operational',
    message: profile.email
      ? `Encrypted session active for ${profile.email}. Syncing to Supabase PostgreSQL.`
      : 'Local offline storage active. Sign in via profile to backup to cloud.',
    type: 'info',
    timestamp: 'System',
  });

  return (
    <div className="auth-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="auth-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--role-accent-bg, rgba(232, 249, 83, 0.15))',
                color: 'var(--role-accent-color, var(--neon-yellow))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Activity & Alerts</h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Real-time notifications & financial insights</div>
            </div>
          </div>
          <button type="button" className="icon-circle-btn" onClick={onClose} style={{ width: '36px', height: '36px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Notifications List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: '14px',
                borderRadius: '16px',
                background: 'var(--card-surface)',
                border:
                  n.type === 'alert'
                    ? '1px solid rgba(244, 63, 94, 0.3)'
                    : n.type === 'loan'
                    ? '1px solid var(--role-accent-border, rgba(232, 249, 83, 0.25))'
                    : '1px solid var(--card-border)',
                display: 'flex',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    n.type === 'alert'
                      ? 'rgba(244, 63, 94, 0.15)'
                      : n.type === 'loan'
                      ? 'var(--role-accent-bg, rgba(232, 249, 83, 0.15))'
                      : 'rgba(56, 189, 248, 0.15)',
                  color:
                    n.type === 'alert'
                      ? 'var(--accent-pink)'
                      : n.type === 'loan'
                      ? 'var(--role-accent-color, var(--neon-yellow))'
                      : 'var(--accent-blue)',
                }}
              >
                {n.type === 'alert' && <AlertTriangle size={18} />}
                {n.type === 'loan' && <HandCoins size={18} />}
                {n.type === 'tip' && <Sparkles size={18} />}
                {n.type === 'info' && <CheckCircle2 size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{n.title}</div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{n.timestamp}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {n.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
