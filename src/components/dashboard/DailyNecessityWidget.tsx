import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DailyNecessityWidgetProps {
  spentToday: number;
  dailyCap: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  isWorkDay?: boolean;
  currencySymbol?: string;
}

export const DailyNecessityWidget: React.FC<DailyNecessityWidgetProps> = ({
  spentToday,
  dailyCap,
  remaining,
  percentage,
  isOverBudget,
  isWorkDay = true,
  currencySymbol = '$',
}) => {
  return (
    <div className="necessity-widget">
      <div className="necessity-widget-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Daily Necessity</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              background: isWorkDay ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
              color: isWorkDay ? 'var(--accent-green)' : 'var(--text-muted)',
              border: isWorkDay ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(148, 163, 184, 0.25)',
            }}
          >
            {isWorkDay ? '🎒 Work/School' : '☕ Rest Day'}
          </span>
        </div>
        <span
          style={{
            color: isOverBudget ? 'var(--accent-pink)' : 'var(--neon-yellow)',
            fontWeight: 'var(--font-weight-black)',
          }}
        >
          {currencySymbol}
          {spentToday.toFixed(2)} / {currencySymbol}
          {dailyCap.toFixed(2)}
        </span>
      </div>

      <div className="necessity-widget-bar">
        <div
          className="necessity-widget-fill"
          style={{
            width: `${percentage}%`,
            background: isOverBudget
              ? 'linear-gradient(90deg, #F43F5E, #E11D48)'
              : 'linear-gradient(90deg, #22C55E, #E8F953)',
          }}
        />
      </div>

      <div className="necessity-widget-footer">
        <span>Groceries, Lunch, Commute</span>
        <span
          style={{
            color: isOverBudget ? 'var(--accent-pink)' : 'var(--accent-green)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 'var(--font-weight-bold)',
          }}
        >
          {isOverBudget ? (
            <>
              <AlertCircle size={11} /> Over by {currencySymbol}
              {(spentToday - dailyCap).toFixed(2)}
            </>
          ) : (
            `${currencySymbol}${remaining.toFixed(2)} Remaining Today`
          )}
        </span>
      </div>
    </div>
  );
};
