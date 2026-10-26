import React from 'react';
import { AlertCircle, PiggyBank } from 'lucide-react';

interface DailyNecessityWidgetProps {
  spentToday: number;
  dailyCap: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  isWorkDay?: boolean;
  currencySymbol?: string;
  savings?: {
    todaySaved: number;
    weekSaved: number;
    monthSaved: number;
  };
}

export const DailyNecessityWidget: React.FC<DailyNecessityWidgetProps> = ({
  spentToday,
  dailyCap,
  remaining,
  percentage,
  isOverBudget,
  isWorkDay = true,
  currencySymbol = '$',
  savings,
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

      {/* Savings Tracker Breakdown */}
      {savings && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <PiggyBank size={13} color="var(--accent-green)" />
              Daily Allowance Savings
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Discipline Tracker
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
            }}
          >
            <div
              style={{
                background: 'var(--card-elevated, rgba(255, 255, 255, 0.03))',
                borderRadius: 'var(--radius-md)',
                padding: '7px 4px',
                textAlign: 'center',
                border: '1px solid var(--card-border)',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                Today
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--accent-green)',
                  marginTop: '2px',
                }}
              >
                {currencySymbol}
                {savings.todaySaved.toFixed(0)}
              </div>
            </div>

            <div
              style={{
                background: 'var(--card-elevated, rgba(255, 255, 255, 0.03))',
                borderRadius: 'var(--radius-md)',
                padding: '7px 4px',
                textAlign: 'center',
                border: '1px solid var(--card-border)',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                Past 7 Days
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--neon-yellow)',
                  marginTop: '2px',
                }}
              >
                {currencySymbol}
                {savings.weekSaved.toFixed(0)}
              </div>
            </div>

            <div
              style={{
                background: 'var(--card-elevated, rgba(255, 255, 255, 0.03))',
                borderRadius: 'var(--radius-md)',
                padding: '7px 4px',
                textAlign: 'center',
                border: '1px solid var(--card-border)',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                Past 30 Days
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#38BDF8',
                  marginTop: '2px',
                }}
              >
                {currencySymbol}
                {savings.monthSaved.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
