import type { LeaderboardEntry } from '../../types/player';

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

export function LeaderboardItem({ entry, isCurrentUser }: LeaderboardItemProps) {
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
      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 text-xs font-mono ${
        isCurrentUser
          ? 'bg-accent/10 border-accent/60 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
          : 'bg-surface-elevated/40 border-grid-line/50 hover:bg-surface-elevated/80'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-8 text-[11px] shrink-0 ${rankColor}`}>
          {rankBadge}
        </span>

        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/30"
          style={{ backgroundColor: entry.color }}
        />

        <span className={`truncate font-medium ${isCurrentUser ? 'text-text-primary font-bold' : 'text-text-secondary'}`}>
          {entry.username}
          {isCurrentUser && <span className="ml-1.5 text-[10px] text-accent font-normal">(YOU)</span>}
        </span>
      </div>

      <div className="text-right shrink-0 ml-2">
        <span className="font-bold text-text-primary text-sm">
          {entry.cellsClaimed}
        </span>
        <span className="text-[10px] text-text-muted ml-1">pts</span>
      </div>
    </div>
  );
}
