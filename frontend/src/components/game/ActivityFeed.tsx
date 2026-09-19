import type { ActivityItem } from '../../hooks/useGameState';

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5 pointer-events-none">
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted px-1">
        LIVE SECTOR TELEMETRY
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="px-3 py-1.5 rounded-lg bg-surface/90 border border-grid-line/80 backdrop-blur-md shadow-md text-xs font-mono flex items-center gap-2 animate-fadeIn transition-all"
          >
            {item.type === 'CLAIM' && (
              <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            )}
            {item.type === 'REMOTE_CLAIM' && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color || '#6366F1' }}
              />
            )}
            {item.type === 'JOIN' && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
            {item.type === 'LEAVE' && (
              <span className="w-2 h-2 rounded-full bg-text-muted" />
            )}

            <span className="text-text-primary text-[11px] leading-tight truncate">
              {item.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
