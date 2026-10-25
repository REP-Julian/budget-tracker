import React from 'react';
import { CreditCard } from 'lucide-react';
import { CategorySummary } from '../../services/financeEngine';

interface CategoryDonutChartProps {
  totalAmount: number;
  monthLabel: string;
  categories: CategorySummary[];
  currencySymbol?: string;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  totalAmount,
  monthLabel,
  categories,
  currencySymbol = '$',
}) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius; // 502.65

  // Calculate cumulative offsets
  let accumulatedPercent = 0;
  const segments = categories.map((cat) => {
    const strokeDash = (cat.percentage / 100) * circumference;
    const offset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += cat.percentage;
    return {
      ...cat,
      strokeDash,
      offset,
    };
  });

  return (
    <div className="donut-wrapper">
      <svg width="220" height="220" viewBox="0 0 220 220">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx="110"
          cy="110"
          r={radius}
          stroke="var(--card-elevated)"
          strokeWidth="12"
          fill="none"
          strokeDasharray="2 4"
        />

        {/* Render segmented colored arcs */}
        {segments.map((seg) => (
          <circle
            key={seg.category}
            cx="110"
            cy="110"
            r={radius}
            stroke={seg.color}
            strokeWidth="14"
            fill="none"
            strokeDasharray={`${Math.max(0, seg.strokeDash - 4)} ${circumference}`}
            strokeDashoffset={seg.offset}
            strokeLinecap="round"
            filter="url(#glow)"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        ))}
      </svg>

      <div className="donut-center-info">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
          <CreditCard size={18} color="var(--neon-yellow)" />
        </div>
        <div className="donut-center-amt">
          {currencySymbol}
          {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="donut-center-month">{monthLabel}</div>
      </div>
    </div>
  );
};
