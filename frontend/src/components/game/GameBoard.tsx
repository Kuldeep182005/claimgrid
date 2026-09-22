import { memo, useState, useCallback } from 'react';
import { GridCell } from './GridCell';
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
  activePlayerName?: string;
  playerCount?: number;
  maxPlayers?: number;
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

  const gridSize = cells.length === 625 ? 25 : 50;

  // Scroll-wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => {
        const next = z + (e.deltaY < 0 ? 0.1 : -0.1);
        return Math.min(2, Math.max(0.5, Math.round(next * 100) / 100));
      });
    }
  }, []);

  const handleCellHover = useCallback(
    (_info: { id: number; x: number; y: number; ownerId: string | null; ownerColor?: string } | null) => {
      // Cell hover tracking
    },
    []
  );

  const activeAnimation = lastClaimAnimation;
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
    <div
      className="flex-1 flex items-center justify-center p-1 sm:p-2"
      onWheel={handleWheel}
    >
      {/* Physical board card on table */}
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.12s ease-out',
          width: 'min(76vh, 92vw, 680px)',
          height: 'min(76vh, 92vw, 680px)',
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
        className={[
          'grid gap-[1px] p-2 sm:p-2.5 rounded-[8px] bg-[#EDE7DC] border-2 border-[#1E1B18] shadow-hard-lg select-none transition-opacity duration-150',
          !isMyTurn && 'opacity-95',
        ].filter(Boolean).join(' ')}
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
              ownerName={ownerInfo?.username}
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
  );
});
