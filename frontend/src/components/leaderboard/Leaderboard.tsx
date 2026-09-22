import { LeaderboardItem } from './LeaderboardItem';
import type { LeaderboardEntry } from '../../types/player';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  onHoverPlayer?: (playerId: string | null) => void;
}

export function Leaderboard({ entries, currentUserId, onHoverPlayer }: LeaderboardProps) {
  if (entries.length === 0) return null;

  return (
    <div
      onMouseLeave={() => onHoverPlayer?.(null)}
      className="bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard rounded-[8px] p-3 flex flex-col gap-1 w-full"
    >
      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-[#DCD5C8]">
        <span className="font-display text-xs font-black uppercase tracking-wider text-[#1E1B18]">
          Tournament Standings
        </span>
        <span className="text-[10px] text-[#6E675F] font-bold">TERRITORY</span>
      </div>
      <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
        {entries.map((entry) => (
          <LeaderboardItem
            key={entry.id}
            entry={entry}
            isCurrentUser={entry.id === currentUserId}
            onHover={onHoverPlayer}
          />
        ))}
      </div>
    </div>
  );
}
