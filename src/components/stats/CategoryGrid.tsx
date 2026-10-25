import React from 'react';
import { Home, BookOpen, Truck, ShoppingBag, CircleDot, PieChart } from 'lucide-react';
import { CategorySummary } from '../../services/financeEngine';

interface CategoryGridProps {
  categories: CategorySummary[];
  currencySymbol?: string;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  currencySymbol = '$',
}) => {
  const getCatIcon = (name: string, color: string) => {
    switch (name.toLowerCase()) {
      case 'rent':
        return <Home size={16} color={color} />;
      case 'education':
        return <BookOpen size={16} color={color} />;
      case 'transport':
        return <Truck size={16} color={color} />;
      case 'shop':
        return <ShoppingBag size={16} color={color} />;
      default:
        return <CircleDot size={16} color={color} />;
    }
  };

  const getCatTrend = (name: string) => {
    switch (name.toLowerCase()) {
      case 'rent':
        return { text: '↙ 2.00%', color: 'var(--accent-cyan)' };
      case 'education':
        return { text: '↗ 0.85%', color: 'var(--accent-green)' };
      case 'transport':
        return { text: '↙ 1.60%', color: 'var(--accent-pink)' };
      case 'shop':
        return { text: '↗ 0.65%', color: 'var(--accent-green)' };
      default:
        return { text: '→ 0.00%', color: 'var(--text-muted)' };
    }
  };

  if (categories.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '28px 16px',
          background: 'var(--card-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--card-border)',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-xs)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          gridColumn: '1 / -1',
        }}
      >
        <PieChart size={24} style={{ opacity: 0.5, marginBottom: '2px' }} />
        <div>No category expenses logged yet.</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Record expenses to see category percentage distribution.
        </div>
      </div>
    );
  }

  return (
    <div className="categories-2x2-grid">
      {categories.map((cat) => {
        const trend = getCatTrend(cat.category);
        return (
          <div key={cat.category} className="category-tile-card">
            <div className="cat-tile-top">
              <div
                className="cat-tile-icon"
                style={{
                  background: `${cat.color}22`,
                  border: `1px solid ${cat.color}44`,
                }}
              >
                {getCatIcon(cat.category, cat.color)}
              </div>
              <div>
                <div className="cat-tile-name">{cat.category}</div>
                <div className="cat-tile-count">{cat.count} Transactions</div>
              </div>
            </div>

            <div className="cat-tile-bottom">
              <div>
                <div className="cat-tile-amount">
                  -{currencySymbol}
                  {cat.amount.toFixed(2)}
                </div>
                <div className="cat-tile-trend" style={{ color: trend.color }}>
                  {trend.text}
                </div>
              </div>

              <div
                className="cat-tile-pct-badge"
                style={{
                  background: `${cat.color}22`,
                  color: cat.color,
                  border: `1px solid ${cat.color}44`,
                }}
              >
                {cat.percentage}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
