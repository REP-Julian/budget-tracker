import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Transaction } from '../../types';

interface MonthlySpendingChartProps {
  transactions: Transaction[];
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  currencySymbol?: string;
}

const TIMEFRAMES = ['7D', '1M', '3M', '6M', '1Y', 'Customize'];

export const MonthlySpendingChart: React.FC<MonthlySpendingChartProps> = ({
  transactions,
  timeframe,
  onTimeframeChange,
  currencySymbol = '$',
}) => {
  // Aggregate real transactions by month for the last 6 months
  const now = new Date();
  const months: { month: string; key: string; income: number; expense: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7); // YYYY-MM
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    months.push({ month: monthName, key, income: 0, expense: 0 });
  }

  for (const tx of transactions) {
    const ym = tx.date.slice(0, 7);
    const target = months.find((m) => m.key === ym);
    if (target) {
      if (tx.type === 'income') target.income += tx.amount;
      if (tx.type === 'expense') target.expense += tx.amount;
    }
  }

  const currentMonthKey = now.toISOString().slice(0, 7);
  const currentMonthData = months.find((m) => m.key === currentMonthKey) || { income: 0, expense: 0 };
  const prevMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const prevMonthData = months.find((m) => m.key === prevMonthKey) || { income: 0, expense: 0 };
  const diff = currentMonthData.expense - prevMonthData.expense;

  return (
    <div className="chart-card-container">
      <div className="chart-card-header">
        <div>
          <div className="chart-card-label">Monthly Expenses</div>
          <div className="chart-card-val">
            {currencySymbol}
            {currentMonthData.expense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div
            className="chart-card-subtrend"
            style={{ color: diff <= 0 ? 'var(--accent-green)' : 'var(--accent-pink)' }}
          >
            {diff <= 0 ? '↘ ' : '↗ '}
            {currencySymbol}{Math.abs(diff).toFixed(2)} vs last month
          </div>
        </div>

        <div className="chart-card-legend">
          <span style={{ color: '#38BDF8', fontWeight: 600 }}>● Income</span>
          <span style={{ color: '#F43F5E', fontWeight: 600 }}>● Expense</span>
        </div>
      </div>

      <div style={{ width: '100%', height: 180, marginTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
            <XAxis
              dataKey="month"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div
                      style={{
                        background: '#FFFFFF',
                        color: '#0E1524',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      }}
                    >
                      <div style={{ color: '#0284C7' }}>Income: ${payload[0]?.value}</div>
                      <div style={{ color: '#E11D48' }}>Expenses: ${payload[1]?.value}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#38BDF8"
              strokeWidth={3}
              dot={{ r: 3, fill: '#38BDF8' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#F43F5E"
              strokeWidth={3}
              dot={{ r: 3, fill: '#F43F5E' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Timeframe selector pills */}
      <div className="timeframe-pill-row">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
            onClick={() => onTimeframeChange(tf)}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
};
