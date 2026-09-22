import React, { type CSSProperties } from 'react';

interface GridCellProps {
  id: number;
  x: number;
  y: number;
  ownerId: string | null;
  ownerColor?: string;
  ownerName?: string;
  cellType?: string | null;
  cellValue?: number;
  isFrontier?: boolean;
  isCurrentPlayer: boolean;
  isClaiming: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  animationType: 'self' | 'remote' | null;
  onSelect: (id: number) => void;
  onHover: (info: { id: number; x: number; y: number; ownerId: string | null; ownerColor?: string } | null) => void;
}

export const GridCell = React.memo(function GridCell({
  id,
  x,
  y,
  ownerId,
  ownerColor,
  ownerName,
  cellType,
  cellValue,
  isFrontier,
  isCurrentPlayer,
  isClaiming,
  isHighlighted,
  isDimmed,
  animationType,
  onSelect,
  onHover,
}: GridCellProps) {
  const isClaimed = ownerId !== null;
  const isStrategic = cellType && cellType !== 'PLAIN';

  const style: CSSProperties = {};
  if (isClaimed && ownerColor) {
    style.backgroundColor = ownerColor;
  }

  const ariaLabel = `Row ${y + 1}, Column ${x + 1}, ${
    isClaimed
      ? isCurrentPlayer
        ? 'owned by you'
        : `owned by ${ownerName || 'opponent'}`
      : 'unclaimed'
  }`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(id);
        }
      }}
      onMouseEnter={() => onHover({ id, x, y, ownerId, ownerColor })}
      onMouseLeave={() => onHover(null)}
      style={style}
      data-value={isStrategic ? (cellValue ?? 1) : undefined}
      className={[
        'relative aspect-square rounded-[2px] transition-all duration-75 cursor-pointer select-none',
        // Unclaimed state: quiet paper tone with thin printed border
        !isClaimed && 'bg-[#FAF7F2] border border-[#DCD5C8] hover:bg-[#EAE3D5] hover:border-[#1E1B18]/40 active:scale-[0.96]',
        // Legal frontier cell
        isFrontier && !isClaimed && 'border-[#1E1B18]/60 shadow-[inset_0_0_0_1px_rgba(30,27,24,0.15)]',
        // Claimed state
        isClaimed && 'border border-[#1E1B18]/30',
        // Ownership patterns: solid for player, diagonal hatch for opponents
        isClaimed && !isCurrentPlayer && 'pattern-hatch',
        // Strategic score overlay
        isStrategic && 'after:content-[attr(data-value)] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-[8px] after:font-bold after:font-mono after:text-white/90',
        // Interaction focus
        isClaiming && 'ring-2 ring-[#E0A526] z-10 scale-[1.04]',
        isHighlighted && 'ring-2 ring-[#1E1B18] z-10',
        isDimmed && 'opacity-25',
        // Tactile claim animation (120ms spring stamp)
        animationType && 'animate-claim-cell z-20',
      ].filter(Boolean).join(' ')}
    />
  );
});
