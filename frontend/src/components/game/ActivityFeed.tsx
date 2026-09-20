import type { ActivityItem } from '../../hooks/useGameState';

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="space-y-1.5 pointer-events-none select-none">
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted px-1 flex items-center justify-between">
        <span>LIVE BATTLEFIELD TELEMETRY</span>
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-2 rounded-lg bg-surface/40 border border-grid-line/40 text-[11px] font-mono text-text-muted/60 text-center">
          Awaiting telemetry signals...
        </div>
      ) : (
        <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="px-3 py-1.5 rounded-lg bg-surface/90 border border-grid-line/80 backdrop-blur-md shadow-md text-xs font-mono flex items-center gap-2 animate-fadeIn transition-all"
          >
            {item.type === 'CLAIM' && (
              <>
                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.8)] shrink-0" />
                <span className="font-bold text-success text-[10px] tracking-wider uppercase shrink-0">
                  YOUR CLAIM
                </span>
              </>
            )}
            {item.type === 'REMOTE_CLAIM' && (
              <>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || '#6366F1' }}
                />
                <span className="font-bold text-accent text-[10px] tracking-wider uppercase shrink-0">
                  INCOMING
                </span>
              </>
            )}
            {item.type === 'JOIN' && (
              <>
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                <span className="font-bold text-text-muted text-[10px] tracking-wider uppercase shrink-0">
                  DEPLOYED
                </span>
              </>
            )}
            {item.type === 'LEAVE' && (
              <>
                <span className="w-2 h-2 rounded-full bg-text-muted shrink-0" />
                <span className="font-bold text-text-muted text-[10px] tracking-wider uppercase shrink-0">
                  SIGNAL LOST
                </span>
              </>
            )}

            <span className="text-text-primary text-[11px] leading-tight truncate">
              {item.message}
            </span>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
