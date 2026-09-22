import { useState, useRef, useMemo, useCallback, useEffect } from 'react';

const GRID_SIZE = 10;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

const COLOR_A = '#E4572E'; // Vermillion / Tomato Red
const COLOR_B = '#1F3A5F'; // Deep Ink Blue

type CellOwner = 'A' | 'B' | null;

interface SimulatedCell {
  id: number;
  x: number;
  y: number;
  owner: CellOwner;
  isNew?: boolean;
}

function getInitialCells(reducedMotion: boolean): SimulatedCell[] {
  return Array.from({ length: TOTAL_CELLS }, (_, i) => {
    const x = i % GRID_SIZE;
    const y = Math.floor(i / GRID_SIZE);
    let owner: CellOwner = null;
    if (reducedMotion) {
      if (x + y < 7) owner = 'A';
      else if (x + y > 11) owner = 'B';
    }
    return { id: i, x, y, owner };
  });
}

export function HeroGrid() {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const [cells, setCells] = useState<SimulatedCell[]>(() =>
    getInitialCells(prefersReducedMotion)
  );

  const [lastClaimedId, setLastClaimedId] = useState<number | null>(null);
  const [turn, setTurn] = useState<'A' | 'B'>('A');

  // Scores
  const scoreA = useMemo(() => cells.filter((c) => c.owner === 'A').length, [cells]);
  const scoreB = useMemo(() => cells.filter((c) => c.owner === 'B').length, [cells]);

  const timerRef = useRef<number | null>(null);
  const isResettingRef = useRef<boolean>(false);

  // Find candidate adjacent cells for a player
  const getCandidateMoves = useCallback((owner: 'A' | 'B', currentCells: SimulatedCell[]) => {
    const owned = currentCells.filter((c) => c.owner === owner);
    const candidates: number[] = [];

    if (owned.length === 0) {
      if (owner === 'A') {
        candidates.push(2 * GRID_SIZE + 2, 2 * GRID_SIZE + 3, 3 * GRID_SIZE + 2);
      } else {
        candidates.push(7 * GRID_SIZE + 7, 7 * GRID_SIZE + 6, 6 * GRID_SIZE + 7);
      }
      return candidates;
    }

    const unownedSet = new Set(currentCells.filter((c) => c.owner === null).map((c) => c.id));

    for (const cell of owned) {
      const neighbors = [
        cell.x > 0 ? cell.id - 1 : null,
        cell.x < GRID_SIZE - 1 ? cell.id + 1 : null,
        cell.y > 0 ? cell.id - GRID_SIZE : null,
        cell.y < GRID_SIZE - 1 ? cell.id + GRID_SIZE : null,
      ];

      for (const n of neighbors) {
        if (n !== null && unownedSet.has(n) && !candidates.includes(n)) {
          candidates.push(n);
        }
      }
    }

    return candidates;
  }, []);

  // Main simulation step
  const stepSimulation = useCallback(() => {
    if (isResettingRef.current) return;

    setCells((prev) => {
      const unownedCount = prev.filter((c) => c.owner === null).length;

      // End of match condition
      if (unownedCount <= 26) {
        isResettingRef.current = true;
        timerRef.current = window.setTimeout(() => {
          setCells((c) => c.map((cell) => ({ ...cell, owner: null, isNew: false })));
          setLastClaimedId(null);
          setTurn('A');
          isResettingRef.current = false;
        }, 1600);
        return prev;
      }

      const currentTurn = turn;
      let candidates = getCandidateMoves(currentTurn, prev);

      if (candidates.length === 0) {
        const anyUnclaimed = prev.filter((c) => c.owner === null).map((c) => c.id);
        if (anyUnclaimed.length === 0) return prev;
        candidates = anyUnclaimed;
      }

      const chosenId = candidates[Math.floor(Math.random() * candidates.length)];
      setLastClaimedId(chosenId);
      setTurn((t) => (t === 'A' ? 'B' : 'A'));

      return prev.map((cell) => {
        if (cell.id === chosenId) {
          return { ...cell, owner: currentTurn, isNew: true };
        }
        return cell.isNew ? { ...cell, isNew: false } : cell;
      });
    });
  }, [turn, getCandidateMoves]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      stepSimulation();
    }, 450);

    return () => clearInterval(interval);
  }, [prefersReducedMotion, stepSimulation]);

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Miniature Score Plate */}
      <div className="flex items-center justify-between w-full max-w-[280px] px-2 py-1 bg-[#FAF7F2] border-2 border-[#1E1B18] rounded-[5px] shadow-hard-sm text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[1px] border border-[#1E1B18] bg-[#E4572E] shrink-0" />
          <span className="font-bold text-[#1E1B18]">P1</span>
          <span className="font-extrabold text-[#1E1B18] tabular-nums font-display">{scoreA}</span>
        </div>

        <span className="text-[10px] font-bold text-[#6E675F]">LIVE DEMO</span>

        <div className="flex items-center gap-1.5 flex-row-reverse">
          <span className="w-2.5 h-2.5 rounded-[1px] border border-[#1E1B18] bg-[#1F3A5F] pattern-hatch shrink-0" />
          <span className="font-bold text-[#1E1B18]">P2</span>
          <span className="font-extrabold text-[#1E1B18] tabular-nums font-display">{scoreB}</span>
        </div>
      </div>

      {/* Miniature Tabletop Grid */}
      <div className="p-2 rounded-[8px] bg-[#EDE7DC] border-2 border-[#1E1B18] shadow-hard">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            width: '260px',
            height: '260px',
          }}
        >
          {cells.map((cell) => {
            const isA = cell.owner === 'A';
            const isB = cell.owner === 'B';
            const isClaimed = isA || isB;
            const isJustClaimed = cell.id === lastClaimedId;

            return (
              <div
                key={cell.id}
                className={[
                  'aspect-square rounded-[2px] transition-all duration-75',
                  !isClaimed && 'bg-[#FAF7F2] border border-[#DCD5C8]',
                  isA && 'border border-[#1E1B18]/30',
                  isB && 'border border-[#1E1B18]/30 pattern-hatch',
                  isJustClaimed && 'animate-claim-cell',
                ].filter(Boolean).join(' ')}
                style={{
                  backgroundColor: isA ? COLOR_A : isB ? COLOR_B : undefined,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
