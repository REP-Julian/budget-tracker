import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    const container = containerRef.current;
    // Only allow pull if scrolled at the very top
    if (container && container.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    } else {
      isPulling.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply rubberband resistance
      const distance = Math.min(diff * 0.45, 95);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(50);
      try {
        await onRefresh();
      } catch (err) {
        console.warn('Refresh error:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="screen-scroll-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative' }}
    >
      {/* Pull Indicator Pill */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${pullDistance}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          overflow: 'hidden',
          transition: isPulling.current ? 'none' : 'height 0.25s ease',
          zIndex: 40,
        }}
      >
        <div
          style={{
            background: 'var(--card-elevated)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-card)',
            borderRadius: '20px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            transform: `scale(${Math.min(1, pullDistance / PULL_THRESHOLD)})`,
            opacity: Math.min(1, pullDistance / (PULL_THRESHOLD * 0.7)),
            transition: 'transform 0.15s ease',
          }}
        >
          <RefreshCw
            size={13}
            color="var(--neon-yellow)"
            className={isRefreshing ? 'spin-anim' : ''}
            style={{
              transform: isRefreshing ? 'none' : `rotate(${pullDistance * 4}deg)`,
            }}
          />
          <span>{isRefreshing ? 'Refreshing data...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull down to refresh'}</span>
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling.current ? 'none' : 'transform 0.25s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};
