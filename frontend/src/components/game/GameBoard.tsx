import { useState, useCallback } from 'react';
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
  gameStatus?: 'WAITING' | 'ACTIVE' | 'FINISHED';
  onClaimCell: (cellId: number) => void;
}

export function GameBoard({
  cells,
  currentUserId,
  playersMap,
  claimingCellId,
  lastClaimAnimation,
  highlightedOwnerId,
  isMyTurn = true,
  gameStatus,
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

  const activeAnimation = lastClaimAnimation;

  return (
    <div className="flex flex-col h-full bg-surface/60 border border-grid-line/80 rounded-2xl p-4 backdrop-blur-md shadow-2xl relative overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-grid-line/60 mb-3">
        {/* Cell Inspector Tooltip */}
        <div className="flex-1 min-w-[280px]">
          <CellTooltip info={hoveredCell} currentUserId={currentUserId} />
        </div>

        {/* Viewport Zoom Controls with micro-interactions */}
        <div className="flex items-center gap-1.5 bg-surface-elevated/80 border border-grid-line rounded-lg p-1 shadow-sm">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.75}
            title="Zoom Out"
            className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 rounded hover:bg-surface hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset Zoom (100%)"
            className="px-2 py-1 text-xs font-mono text-text-secondary hover:text-text-primary rounded hover:bg-surface hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150 cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
            title="Zoom In"
            className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 rounded hover:bg-surface hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Prominent Turn Directive Banner (Part 16) */}
      {gameStatus && (
        <div
          className={`w-full py-2 px-4 rounded-xl text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-between border mb-3 transition-all duration-300 ${
            gameStatus === 'WAITING'
              ? 'bg-accent/15 border-accent/40 text-accent'
              : gameStatus === 'FINISHED'
              ? 'bg-surface-elevated border-grid-line text-text-muted'
              : isMyTurn
              ? 'bg-success/20 border-success/60 text-success shadow-[0_0_12px_rgba(16,185,129,0.25)] animate-pulse'
              : 'bg-warning/15 border-warning/40 text-warning'
          }`}
        >
          <div className="flex items-center gap-2">
            {isMyTurn && gameStatus === 'ACTIVE' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-success animate-ping" />
                <span>⚡ YOUR TURN — CLAIM AN UNOWNED SECTOR</span>
              </>
            ) : gameStatus === 'WAITING' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-ping" />
                <span>📡 WAITING FOR OPPONENT TO JOIN...</span>
              </>
            ) : gameStatus === 'FINISHED' ? (
              <>
                <span>🏁 BATTLE CONCLUDED</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                <span>⏳ OPPONENT'S TURN — AWAITING RIVAL MOVE...</span>
              </>
            )}
          </div>
          <span className="text-[11px] font-normal opacity-80">
            {cells.filter((c) => c.ownerId !== null).length} / {cells.length} Claimed
          </span>
        </div>
      )}

      {/* Grid Canvas Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 min-h-[420px]">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
            width: 'min(78vh, 78vw, 760px)',
            height: 'min(78vh, 78vw, 760px)',
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
          className={`grid gap-[2px] p-2.5 bg-surface-elevated/40 border border-grid-line rounded-lg shadow-inner select-none relative ${
            !isMyTurn ? 'opacity-90' : ''
          }`}
        >
          {cells.map((cell) => {
            const ownerInfo = cell.ownerId ? playersMap.get(cell.ownerId) : undefined;
            const isMine = currentUserId ? cell.ownerId === currentUserId : false;
            const isClaiming = claimingCellId === cell.id;
            const isHighlighted = highlightedOwnerId ? cell.ownerId === highlightedOwnerId : false;
            const isDimmed = highlightedOwnerId ? (cell.ownerId !== null && cell.ownerId !== highlightedOwnerId) : false;

            let animType: 'self' | 'remote' | null = null;
            if (activeAnimation && activeAnimation.cellId === cell.id) {
              animType = activeAnimation.isSelf ? 'self' : 'remote';
            }

            return (
              <GridCell
                key={cell.id}
                id={cell.id}
                x={cell.x}
                y={cell.y}
                ownerId={cell.ownerId}
                ownerColor={ownerInfo?.color}
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

      {/* Subtle bottom legend */}
      <div className="pt-2 border-t border-grid-line/40 flex items-center justify-between text-[11px] font-mono text-text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-grid-cell border border-grid-line" />
            Neutral Sector
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-accent ring-1 ring-white/60" />
            Your Territory
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-danger/80" />
            Rival Factions
          </span>
        </div>
        <span>{gridSize} × {gridSize} ({cells.length} SECTORS)</span>
      </div>
    </div>
  );
}
