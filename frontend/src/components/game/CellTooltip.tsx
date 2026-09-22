interface HoveredCellInfo {
  id: number;
  x: number;
  y: number;
  ownerId: string | null;
  ownerColor?: string;
  ownerUsername?: string;
}

interface CellTooltipProps {
  info: HoveredCellInfo | null;
  currentUserId?: string;
}

export function CellTooltip({ info, currentUserId }: CellTooltipProps) {
  if (!info) {
    return (
      <div className="h-8 px-3 rounded-[5px] bg-[#FAF7F2] border border-[#1E1B18] shadow-hard-sm text-xs text-[#6E675F] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#9C948B]" />
        <span>Hover over any tile to inspect</span>
      </div>
    );
  }

  const isClaimed = info.ownerId !== null;
  const isMine = isClaimed && info.ownerId === currentUserId;

  return (
    <div className="h-8 px-3 rounded-[5px] bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard-sm text-xs flex items-center gap-2.5 font-mono">
      <div className="flex items-center gap-1.5 text-[#1E1B18] text-[11px] font-bold">
        <span>({info.x}, {info.y})</span>
      </div>

      <span className="text-[#DCD5C8]">·</span>

      <div className="flex items-center gap-1.5">
        {isClaimed ? (
          <>
            <span
              className="w-2.5 h-2.5 rounded-[2px] border border-[#1E1B18] shrink-0"
              style={{ backgroundColor: info.ownerColor || '#E4572E' }}
            />
            <span className="text-[#1E1B18]">
              {isMine ? (
                <span className="text-[#E4572E] font-bold">Owned by you</span>
              ) : (
                <span>Owned by {info.ownerUsername || 'Opponent'}</span>
              )}
            </span>
          </>
        ) : (
          <span className="text-[#6E675F]">
            Unclaimed · Click to claim
          </span>
        )}
      </div>
    </div>
  );
}
