import React, { type CSSProperties } from 'react';

interface GridCellProps {
  id: number;
  x: number;
  y: number;
  ownerId: string | null;
  ownerColor?: string;
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

  const style: CSSProperties & { ['--claim-color']?: string } = {};
  if (isClaimed && ownerColor) {
    style.backgroundColor = ownerColor;
    style['--claim-color'] = ownerColor;
  }

  const animationClass =
    animationType === 'self'
      ? 'animate-claim-self'
      : animationType === 'remote'
      ? 'animate-claim-remote'
      : '';

  const handleClick = () => onSelect(id);
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
      aria-label={`Cell ${x}, ${y}${
        isClaimed ? (isCurrentPlayer ? ' — yours' : ' — taken') : ' — empty'
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHover({ id, x, y, ownerId, ownerColor })}
      onMouseLeave={() => onHover(null)}
      style={style}
      data-value={isStrategic ? (cellValue ?? 1) : undefined}
      className={`
        relative aspect-square rounded-[3px] transition-[transform,background-color,box-shadow] duration-150 cursor-pointer select-none
        ${!isClaimed ? 'bg-grid-cell hover:bg-grid-cell-hover hover:scale-[1.18] hover:z-10' : ''}
        ${isFrontier ? 'ring-1 ring-accent/50' : ''}
        ${isStrategic ? 'after:content-[attr(data-value)] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-[8px] after:font-bold after:text-accent-glow' : ''}
        ${isClaimed && isCurrentPlayer ? 'ring-1 ring-white/40 hover:brightness-110 hover:scale-105 hover:z-10' : ''}
        ${isClaimed && !isCurrentPlayer ? 'hover:brightness-110 hover:scale-105 hover:z-10' : ''}
        ${isClaiming ? 'ring-2 ring-accent z-20 scale-105' : ''}
        ${isHighlighted ? 'ring-2 ring-white brightness-125 scale-110 z-20' : ''}
        ${isDimmed ? 'opacity-25' : ''}
        ${animationClass}
      `}
    />
  );
});
