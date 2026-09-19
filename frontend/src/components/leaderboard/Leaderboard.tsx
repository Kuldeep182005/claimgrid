import { LeaderboardItem } from './LeaderboardItem';
import type { LeaderboardEntry } from '../../types/player';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  return (
    <div className="bg-surface/80 border border-grid-line/80 rounded-2xl p-4 backdrop-blur-md shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-grid-line/60 mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">
            LIVE FACTION STANDINGS
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-text-muted border border-grid-line/50">
          TOP {entries.length}
        </span>
      </div>

      {/* Ranked List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[360px]">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-text-muted">
            No territory claimed yet.
            <br />
            Be the first to secure a sector!
          </div>
        ) : (
          entries.map((entry) => (
            <LeaderboardItem
              key={entry.id}
              entry={entry}
              isCurrentUser={entry.id === currentUserId}
            />
          ))
        )}
      </div>
    </div>
  );
}
