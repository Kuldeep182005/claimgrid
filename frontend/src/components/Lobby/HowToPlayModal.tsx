import { useState, useEffect } from 'react';
import { CloseIcon } from '../UI/Icons';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  // 5x5 interactive board demo
  const [demoCells, setDemoCells] = useState<Array<{ id: number; owner: 'neutral' | 'player' | 'rival' }>>(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      owner: i === 6 ? 'rival' : i === 18 ? 'rival' : 'neutral',
    }))
  );
  const [demoMessage, setDemoMessage] = useState('Click any unclaimed paper tile to practice claiming it.');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDemoCellClick = (id: number) => {
    const cell = demoCells[id];
    if (cell.owner !== 'neutral') {
      setDemoMessage('That cell is already claimed! Choose an empty tile.');
      return;
    }

    setDemoCells((prev) =>
      prev.map((c) => (c.id === id ? { ...c, owner: 'player' } : c))
    );
    setDemoMessage('Tile stamped with your ink! Players take alternating turns.');
  };

  const handleResetDemo = () => {
    setDemoCells(
      Array.from({ length: 25 }, (_, i) => ({
        id: i,
        owner: i === 6 ? 'rival' : i === 18 ? 'rival' : 'neutral',
      }))
    );
    setDemoMessage('Click any unclaimed paper tile to practice claiming it.');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B18]/40 animate-fadeIn"
    >
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard-xl rounded-[8px] p-5 text-[#1E1B18] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#1E1B18]">
          <div>
            <h2 id="rules-title" className="font-display text-lg font-black uppercase tracking-tight text-[#1E1B18]">
              HOW TO PLAY
            </h2>
            <span className="text-[11px] font-medium text-[#6E675F]">
              Rules of ClaimGrid Tabletop
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules"
            className="btn-tactile-sm p-1 rounded-[4px] bg-[#FAF7F2] text-[#1E1B18] cursor-pointer"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* 4 Printed Rules */}
        <div className="flex flex-col gap-2 text-xs">
          <div className="p-2.5 rounded-[5px] bg-[#EDE7DC] border border-[#1E1B18]">
            <span className="font-display font-bold text-[#1E1B18] block mb-0.5 uppercase tracking-wide">
              1. Find an Empty Cell
            </span>
            <span className="text-[#6E675F] text-[11px]">
              Scan the printed board for available neutral tiles.
            </span>
          </div>

          <div className="p-2.5 rounded-[5px] bg-[#EDE7DC] border border-[#1E1B18]">
            <span className="font-display font-bold text-[#1E1B18] block mb-0.5 uppercase tracking-wide">
              2. Claim It
            </span>
            <span className="text-[#6E675F] text-[11px]">
              Stamp your ink onto the cell. Once locked, it cannot be stolen.
            </span>
          </div>

          <div className="p-2.5 rounded-[5px] bg-[#EDE7DC] border border-[#1E1B18]">
            <span className="font-display font-bold text-[#1E1B18] block mb-0.5 uppercase tracking-wide">
              3. Expand Your Territory
            </span>
            <span className="text-[#6E675F] text-[11px]">
              Players alternate turns claiming space across the shared grid.
            </span>
          </div>

          <div className="p-2.5 rounded-[5px] bg-[#EDE7DC] border border-[#1E1B18]">
            <span className="font-display font-bold text-[#1E1B18] block mb-0.5 uppercase tracking-wide">
              4. Outscore Your Opponent
            </span>
            <span className="text-[#6E675F] text-[11px]">
              The player who controls the majority share of the board wins.
            </span>
          </div>
        </div>

        {/* Interactive 5x5 Practice Board */}
        <div className="flex flex-col items-center gap-2 p-3 bg-[#EDE7DC] border-2 border-[#1E1B18] rounded-[6px]">
          <div className="flex items-center justify-between w-full text-[10px] font-mono font-bold text-[#6E675F]">
            <span>PRACTICE STAMP</span>
            <button
              type="button"
              onClick={handleResetDemo}
              className="underline hover:text-[#1E1B18] cursor-pointer"
            >
              Reset
            </button>
          </div>

          <div
            className="grid grid-cols-5 gap-1 p-1.5 rounded-[4px] bg-[#FAF7F2] border border-[#1E1B18]"
            style={{ width: '150px', height: '150px' }}
          >
            {demoCells.map((c) => {
              const isPlayer = c.owner === 'player';
              const isRival = c.owner === 'rival';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleDemoCellClick(c.id)}
                  aria-label={`Demo tile ${c.id}`}
                  className={[
                    'aspect-square rounded-[2px] transition-all duration-75 cursor-pointer',
                    c.owner === 'neutral' && 'bg-[#FAF7F2] border border-[#DCD5C8] hover:bg-[#EAE3D5]',
                    isPlayer && 'bg-[#E4572E] border border-[#1E1B18] animate-claim-cell',
                    isRival && 'bg-[#1F3A5F] border border-[#1E1B18] pattern-hatch',
                  ].filter(Boolean).join(' ')}
                />
              );
            })}
          </div>

          <span className="text-[11px] font-mono text-center text-[#1E1B18] font-bold">
            {demoMessage}
          </span>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="btn-tactile w-full py-2.5 rounded-[6px] font-display font-black text-xs uppercase bg-[#E4572E] text-white tracking-wider cursor-pointer"
        >
          GOT IT — LET&apos;S PLAY
        </button>
      </div>
    </div>
  );
}
