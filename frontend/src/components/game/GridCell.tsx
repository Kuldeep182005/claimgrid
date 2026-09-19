import React, { type CSSProperties } from 'react';

interface GridCellProps {
  id: number;
  x: number;
  y: number;
  ownerId: string | null;
  ownerColor?: string;
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
  isCurrentPlayer,
  isClaiming,
  isHighlighted,
  isDimmed,
  animationType,
  onSelect,
  onHover,
}: GridCellProps) {
  const isClaimed = ownerId !== null;

  const style: CSSProperties & { ['--claim-color']?: string } = {};
  if (isClaimed && ownerColor) {
    style.backgroundColor = ownerColor;
    style['--claim-color'] = ownerColor;
  }

  const animationClass = animationType === 'self'
    ? 'animate-claim-self'
    : animationType === 'remote'
    ? 'animate-claim-remote'
    : '';

  const handleClick = () => {
    onSelect(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Sector ${x}, ${y}${isClaimed ? (isCurrentPlayer ? ' (Owned by you)' : ' (Occupied)') : ' (Unclaimed)'}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHover({ id, x, y, ownerId, ownerColor })}
      onMouseLeave={() => onHover(null)}
      style={style}
      className={`
        relative aspect-square rounded-[2px] transition-all duration-150 cursor-pointer select-none
        ${!isClaimed ? 'bg-grid-cell border border-grid-line/50 hover:bg-grid-cell-hover hover:border-accent/90 hover:scale-110 hover:shadow-[0_0_8px_rgba(99,102,241,0.5)] hover:z-10' : ''}
        ${isClaimed && isCurrentPlayer ? 'ring-1 ring-white/60 hover:brightness-110 hover:scale-105 hover:z-10' : ''}
        ${isClaimed && !isCurrentPlayer ? 'hover:brightness-110 hover:scale-105 hover:z-10' : ''}
        ${isClaiming ? 'animate-pulse ring-2 ring-accent ring-offset-1 ring-offset-surface z-25 shadow-[0_0_12px_rgba(99,102,241,0.9)]' : ''}
        ${isHighlighted ? 'ring-2 ring-white brightness-125 scale-110 z-20 shadow-[0_0_12px_rgba(255,255,255,0.85)]' : ''}
        ${isDimmed ? 'opacity-30 brightness-75' : ''}
        ${animationClass}
      `}
    >
      {/* Subtle indicator for player's own cells */}
      {isClaimed && isCurrentPlayer && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-1 h-1 rounded-full bg-white opacity-80" />
        </span>
      )}
    </div>
  );
});
