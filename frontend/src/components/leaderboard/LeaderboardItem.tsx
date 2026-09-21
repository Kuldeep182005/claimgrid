import type { LeaderboardEntry } from '../../types/player';

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  onHover?: (id: string | null) => void;
}

export function LeaderboardItem({ entry, isCurrentUser, onHover }: LeaderboardItemProps) {
  const isTop3 = entry.rank <= 3;

  return (
    <div
      onMouseEnter={() => onHover?.(entry.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 text-sm cursor-pointer select-none ${
        isCurrentUser
          ? 'bg-accent/10 border-accent/50 hover:border-accent'
          : 'bg-surface-elevated/40 border-grid-line hover:bg-surface-elevated hover:border-accent/40'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`w-6 text-center shrink-0 tabular-nums font-semibold ${
            isTop3 ? 'text-accent' : 'text-text-muted'
          }`}
        >
          {entry.rank}
        </span>
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/20 group-hover:scale-110 transition-transform"
          style={{ backgroundColor: entry.color }}
        />
        <span
          className={`truncate transition-colors ${
            isCurrentUser ? 'text-text-primary font-semibold' : 'text-text-secondary group-hover:text-text-primary'
          }`}
        >
          {entry.username}
          {isCurrentUser && <span className="ml-1.5 text-xs text-accent font-normal">you</span>}
        </span>
      </div>

      <div className="text-right shrink-0 ml-2 tabular-nums">
        <span className="font-semibold text-text-primary group-hover:text-accent transition-colors">
          {entry.cellsClaimed}
        </span>
        <span className="text-xs text-text-muted ml-1">pts</span>
      </div>
    </div>
  );
}
