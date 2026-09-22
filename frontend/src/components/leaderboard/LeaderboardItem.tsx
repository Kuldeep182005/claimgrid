import type { LeaderboardEntry } from '../../types/player';

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  onHover?: (id: string | null) => void;
}

export function LeaderboardItem({ entry, isCurrentUser, onHover }: LeaderboardItemProps) {
  return (
    <div
      onMouseEnter={() => onHover?.(entry.id)}
      onMouseLeave={() => onHover?.(null)}
      className={[
        'flex items-center justify-between py-1.5 px-2.5 rounded-[5px] text-xs cursor-pointer select-none transition-all',
        isCurrentUser
          ? 'bg-[#E4572E]/10 border border-[#1E1B18] font-bold'
          : 'hover:bg-[#EAE3D5] border border-transparent',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-5 text-[11px] font-mono font-bold text-[#6E675F] shrink-0">
          #{entry.rank}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-[2px] border border-[#1E1B18] shrink-0"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-[#1E1B18] truncate">
          {entry.username} {isCurrentUser && '(You)'}
        </span>
      </div>
      <span className="font-mono font-extrabold text-[#1E1B18] text-xs ml-2 tabular-nums">
        {entry.cellsClaimed} <span className="text-[10px] text-[#6E675F] font-normal">cells</span>
      </span>
    </div>
  );
}
