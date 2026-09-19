import type { LeaderboardEntry } from '../../types/player';

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  onHover?: (id: string | null) => void;
}

export function LeaderboardItem({ entry, isCurrentUser, onHover }: LeaderboardItemProps) {
  let rankBadge = `${entry.rank}`;
  let rankColor = 'text-text-secondary';

  if (entry.rank === 1) {
    rankBadge = '🥇 #1';
    rankColor = 'text-amber-400 font-bold';
  } else if (entry.rank === 2) {
    rankBadge = '🥈 #2';
    rankColor = 'text-slate-300 font-bold';
  } else if (entry.rank === 3) {
    rankBadge = '🥉 #3';
    rankColor = 'text-amber-600 font-bold';
  } else {
    rankBadge = `#${entry.rank}`;
  }

  return (
    <div
      onMouseEnter={() => onHover?.(entry.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 text-xs font-mono cursor-pointer select-none ${
        isCurrentUser
          ? 'bg-accent/10 border-accent/60 shadow-[0_0_12px_rgba(99,102,241,0.25)] hover:border-accent hover:shadow-[0_0_16px_rgba(99,102,241,0.4)] hover:-translate-y-0.5'
          : 'bg-surface-elevated/40 border-grid-line/50 hover:bg-surface-elevated/90 hover:border-accent/60 hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-8 text-[11px] shrink-0 transition-colors ${rankColor}`}>
          {rankBadge}
        </span>

        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/30 group-hover:scale-110 group-hover:ring-white/80 transition-all"
          style={{ backgroundColor: entry.color }}
        />

        <span className={`truncate font-medium transition-colors ${isCurrentUser ? 'text-text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary'}`}>
          {entry.username}
          {isCurrentUser && <span className="ml-1.5 text-[10px] text-accent font-normal">(YOU)</span>}
        </span>
      </div>

      <div className="text-right shrink-0 ml-2">
        <span className="font-bold text-text-primary group-hover:text-accent text-sm transition-colors">
          {entry.cellsClaimed}
        </span>
        <span className="text-[10px] text-text-muted ml-1">pts</span>
      </div>
    </div>
  );
}
