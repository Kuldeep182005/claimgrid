import { memo, useState, useCallback } from 'react';
import { GridCell } from './GridCell';
import { CellTooltip } from './CellTooltip';
import type { Cell } from '../../types/game';

interface GameBoardProps {
  cells: Cell[];
  currentUserId?: string;
  playersMap: Map<string, { username: string; color: string }>;
  claimingCellId: number | null;
  lastClaimAnimation: { cellId: number; isSelf: boolean; timestamp: number } | null;
  highlightedOwnerId?: string | null;
  isMyTurn?: boolean;
  onClaimCell: (cellId: number) => void;
}

export const GameBoard = memo(function GameBoard({
  cells,
  currentUserId,
  playersMap,
  claimingCellId,
  lastClaimAnimation,
  highlightedOwnerId,
  isMyTurn = true,
  onClaimCell,
}: GameBoardProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [hoveredCell, setHoveredCell] = useState<{
    id: number;
    x: number;
    y: number;
    ownerId: string | null;
    ownerColor?: string;
    ownerUsername?: string;
  } | null>(null);

  const gridSize = cells.length === 625 ? 25 : 50;

  const handleZoomIn = () => setZoom((z) => Math.min(2, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.75, Math.round((z - 0.25) * 100) / 100));
  const handleResetZoom = () => setZoom(1);

  const handleCellHover = useCallback(
    (info: { id: number; x: number; y: number; ownerId: string | null; ownerColor?: string } | null) => {
      if (!info) {
        setHoveredCell(null);
        return;
      }
      const owner = info.ownerId ? playersMap.get(info.ownerId) : undefined;
      setHoveredCell({
        ...info,
        ownerUsername: owner?.username,
        ownerColor: owner?.color || info.ownerColor,
      });
    },
    [playersMap]
  );

  const ownedByCurrent = new Set(
    cells.filter((cell) => cell.ownerId === currentUserId).map((cell) => `${cell.x},${cell.y}`)
  );
  const isFrontier = (cell: Cell) => {
    if (cell.ownerId !== null || !isMyTurn || !currentUserId) return false;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if ((dx !== 0 || dy !== 0) && ownedByCurrent.has(`${cell.x + dx},${cell.y + dy}`)) return true;
      }
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-surface border border-grid-line rounded-2xl p-3 sm:p-4 shadow-xl shadow-black/20 relative">
      {/* Inspector + zoom */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex-1 min-w-[240px]">
          <CellTooltip info={hoveredCell} currentUserId={currentUserId} />
        </div>

        <div className="flex items-center gap-1 bg-surface-elevated border border-grid-line rounded-lg p-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.75}
            aria-label="Zoom out"
            className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 rounded-md hover:bg-grid-cell active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary rounded-md hover:bg-grid-cell active:scale-95 transition-all cursor-pointer tabular-nums"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
            aria-label="Zoom in"
            className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 rounded-md hover:bg-grid-cell active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* The grid — the star of the screen */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-1 min-h-[420px]">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
            width: 'min(78vh, 88vw, 760px)',
            height: 'min(78vh, 88vw, 760px)',
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
          className={`grid gap-[2px] p-2 bg-grid-bg border border-grid-line rounded-xl select-none relative transition-opacity duration-200 ${
            !isMyTurn ? 'opacity-80' : ''
          }`}
        >
          {cells.map((cell) => {
            const ownerInfo = cell.ownerId ? playersMap.get(cell.ownerId) : undefined;
            const isMine = currentUserId ? cell.ownerId === currentUserId : false;
            const isClaiming = claimingCellId === cell.id;
            const isHighlighted = highlightedOwnerId ? cell.ownerId === highlightedOwnerId : false;
            const isDimmed = highlightedOwnerId ? cell.ownerId !== null && cell.ownerId !== highlightedOwnerId : false;

            let animType: 'self' | 'remote' | null = null;
            if (lastClaimAnimation && lastClaimAnimation.cellId === cell.id) {
              animType = lastClaimAnimation.isSelf ? 'self' : 'remote';
            }

            return (
              <GridCell
                key={cell.id}
                id={cell.id}
                x={cell.x}
                y={cell.y}
                ownerId={cell.ownerId}
                ownerColor={ownerInfo?.color}
                cellType={cell.cellType}
                cellValue={cell.cellValue}
                isFrontier={isFrontier(cell)}
                isCurrentPlayer={isMine}
                isClaiming={isClaiming}
                isHighlighted={isHighlighted}
                isDimmed={isDimmed}
                animationType={animType}
                onSelect={onClaimCell}
                onHover={handleCellHover}
              />
            );
          })}
        </div>
      </div>

      {/* Quiet legend */}
      <div className="pt-3 flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-grid-cell border border-grid-line" />
            Empty
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-accent" />
            Yours
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px] bg-danger" />
            Others
          </span>
        </div>
        <span className="tabular-nums">
          {gridSize} × {gridSize}
        </span>
      </div>
    </div>
  );
});
