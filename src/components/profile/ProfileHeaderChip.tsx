import React from 'react';
import { ChevronDown, Search, Bell } from 'lucide-react';
import { UserProfile } from '../../types';

interface ProfileHeaderChipProps {
  profile: UserProfile;
  onClick: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  hasUnreadNotifications?: boolean;
}

export const ProfileHeaderChip: React.FC<ProfileHeaderChipProps> = ({
  profile,
  onClick,
  onOpenSearch,
  onOpenNotifications,
  hasUnreadNotifications = false,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="app-top-header">
      <div className="profile-chip-btn" onClick={onClick} title="Open Profile & Settings">
        <div className="profile-chip-avatar">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName || 'User'} />
          ) : (
            getInitials(profile.fullName || profile.username || 'U')
          )}
        </div>
        <div>
          <div className="profile-chip-name">
            {profile.fullName || 'User'} <ChevronDown size={11} />
          </div>
          <div className="profile-chip-role">{profile.role}</div>
        </div>
      </div>

      <div className="header-action-group">
        <button className="icon-circle-btn" onClick={onOpenSearch} aria-label="Search" title="Search Transactions & Loans">
          <Search size={15} />
        </button>
        <button
          className="icon-circle-btn"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          title="Activity & Notifications"
          style={{ position: 'relative' }}
        >
          <Bell size={15} />
          {hasUnreadNotifications && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--neon-yellow)',
                boxShadow: '0 0 6px var(--neon-yellow)',
              }}
            />
          )}
        </button>
      </div>
    </header>
  );
};
