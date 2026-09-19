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
      <div className="h-9 px-3 py-1.5 rounded-lg bg-surface-elevated/80 border border-grid-line/50 text-xs font-mono text-text-muted flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
        <span>Hover over any sector to inspect coordinates and territory ownership</span>
      </div>
    );
  }

  const isClaimed = info.ownerId !== null;
  const isMine = isClaimed && info.ownerId === currentUserId;

  return (
    <div className="h-9 px-3 py-1.5 rounded-lg bg-surface-elevated border border-grid-line text-xs font-mono flex items-center gap-3 shadow-lg">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">SECTOR:</span>
        <span className="font-bold text-text-primary">
          ({info.x}, {info.y})
        </span>
        <span className="text-text-muted text-[10px]">#{info.id}</span>
      </div>

      <span className="text-grid-line">|</span>

      <div className="flex items-center gap-2">
        {isClaimed ? (
          <>
            <span 
              className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: info.ownerColor || '#888' }}
            />
            <span className="text-text-secondary">
              {isMine ? (
                <span className="text-success font-semibold">YOUR TERRITORY</span>
              ) : (
                <>OCCUPIED BY <span className="text-text-primary font-semibold">{info.ownerUsername || 'Rival'}</span></>
              )}
            </span>
          </>
        ) : (
          <span className="text-accent flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            NEUTRAL • READY TO CLAIM
          </span>
        )}
      </div>
    </div>
  );
}
