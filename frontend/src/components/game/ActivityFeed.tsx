import type { ActivityItem } from '../../hooks/useGameState';

interface ActivityFeedProps {
  items: ActivityItem[];
}

const LABELS: Record<ActivityItem['type'], { text: string; className: string; dot: string }> = {
  CLAIM: { text: 'You', className: 'text-success', dot: 'bg-success' },
  REMOTE_CLAIM: { text: 'Move', className: 'text-accent', dot: 'bg-accent' },
  JOIN: { text: 'Joined', className: 'text-text-secondary', dot: 'bg-accent' },
  LEAVE: { text: 'Left', className: 'text-text-muted', dot: 'bg-text-muted' },
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-text-muted px-1 flex items-center justify-between">
        <span>Recent moves</span>
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-soft-glow" />
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-2.5 rounded-lg bg-grid-bg border border-grid-line text-xs text-text-muted text-center">
          Nothing yet — moves will show up here
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const label = LABELS[item.type];
            const dot = item.type === 'REMOTE_CLAIM' && item.color ? undefined : label.dot;
            return (
              <div
                key={item.id}
                className="px-3 py-1.5 rounded-lg bg-surface border border-grid-line text-xs flex items-center gap-2 animate-fadeIn"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${dot ?? ''}`}
                  style={dot ? undefined : { backgroundColor: item.color || 'var(--color-accent)' }}
                />
                <span className={`font-semibold shrink-0 ${label.className}`}>{label.text}</span>
                <span className="text-text-secondary leading-tight truncate">{item.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
