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
      <div className="h-9 px-3 rounded-lg bg-surface-elevated/60 border border-grid-line text-xs text-text-muted flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
        <span>Hover a cell to see who owns it</span>
      </div>
    );
  }

  const isClaimed = info.ownerId !== null;
  const isMine = isClaimed && info.ownerId === currentUserId;

  return (
    <div className="h-9 px-3 rounded-lg bg-surface-elevated border border-grid-line text-xs flex items-center gap-3">
      <span className="text-text-secondary tabular-nums">
        Cell <span className="font-semibold text-text-primary">{info.x}, {info.y}</span>
      </span>
      <span className="text-grid-line">·</span>
      {isClaimed ? (
        <span className="flex items-center gap-2 text-text-secondary">
          <span
            className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
            style={{ backgroundColor: info.ownerColor || '#888' }}
          />
          {isMine ? (
            <span className="text-accent font-semibold">Yours</span>
          ) : (
            <span>
              Taken by <span className="text-text-primary font-semibold">{info.ownerUsername || 'a rival'}</span>
            </span>
          )}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-soft-glow" />
          Empty — yours for the taking
        </span>
      )}
    </div>
  );
}
