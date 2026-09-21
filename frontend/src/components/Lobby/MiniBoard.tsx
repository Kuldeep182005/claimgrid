import { useEffect, useState } from 'react';

const SIZE = 8;
const TOTAL = SIZE * SIZE;
const YOU = '#e8b44b';
const RIVAL = '#6c8cff';

type Owner = 0 | 1 | 2; // 0 neutral, 1 you, 2 rival

/**
 * A small, self-playing board shown on the home screen. Two players quietly
 * fill the grid, then it resets — a 2-second explanation of the whole game.
 */
export function MiniBoard() {
  const [cells, setCells] = useState<Owner[]>(() => Array(TOTAL).fill(0));

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let order = shuffled();
    let step = 0;
    let turn: Owner = 1;

    const tick = () => {
      setCells((prev) => {
        if (step >= order.length) {
          // brief pause then reset
          order = shuffled();
          step = 0;
          turn = 1;
          return Array(TOTAL).fill(0);
        }
        const next = [...prev];
        next[order[step]] = turn;
        step += 1;
        turn = turn === 1 ? 2 : 1;
        return next;
      });
    };

    if (reduce) {
      // Show a settled, representative board without looping animation.
      const settled: Owner[] = Array(TOTAL).fill(0);
      shuffled().forEach((idx, i) => {
        if (i < TOTAL * 0.75) settled[idx] = i % 2 === 0 ? 1 : 2;
      });
      setCells(settled);
      return;
    }

    const interval = setInterval(tick, 130);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="grid gap-1 p-2.5 rounded-xl bg-surface border border-grid-line shadow-xl shadow-black/40"
      style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {cells.map((owner, i) => (
        <span
          key={i}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-[5px] transition-colors duration-300"
          style={{
            backgroundColor: owner === 1 ? YOU : owner === 2 ? RIVAL : 'var(--color-grid-cell)',
          }}
        />
      ))}
    </div>
  );
}

function shuffled(): number[] {
  const arr = Array.from({ length: TOTAL }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
