import { useState, useEffect, useRef } from 'react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // 5x5 playable simulator state inside modal
  const [demoCells, setDemoCells] = useState<Array<{ id: number; owner: 'neutral' | 'player' | 'rival' }>>(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      owner: i === 6 ? 'rival' : i === 18 ? 'rival' : 'neutral',
    }))
  );
  const [demoCooldown, setDemoCooldown] = useState(0);
  const [demoMessage, setDemoMessage] = useState('Click any neutral sector below to test your Claim Cannon');

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

  // Handle ticking demo cooldown
  useEffect(() => {
    if (demoCooldown <= 0) return;
    const interval = setInterval(() => {
      setDemoCooldown((c) => {
        if (c <= 1) {
          setDemoMessage('⚡ Claim Cannon reloaded! Ready to fire.');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [demoCooldown]);

  const handleDemoCellClick = (id: number) => {
    if (demoCooldown > 0) {
      setDemoMessage(`Recharging: wait ${demoCooldown}s before next claim!`);
      return;
    }

    const cell = demoCells[id];
    if (cell.owner !== 'neutral') {
      setDemoMessage('Sector already occupied! Select neutral territory.');
      return;
    }

    setDemoCells((prev) =>
      prev.map((c) => (c.id === id ? { ...c, owner: 'player' } : c))
    );
    setDemoCooldown(3);
    setDemoMessage('Territory captured! 3.0s server cooldown initiated.');
  };

  const handleResetDemo = () => {
    setDemoCells(
      Array.from({ length: 25 }, (_, i) => ({
        id: i,
        owner: i === 6 ? 'rival' : i === 18 ? 'rival' : 'neutral',
      }))
    );
    setDemoCooldown(0);
    setDemoMessage('Click any neutral sector below to test your Claim Cannon');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface/95 border border-grid-line/90 rounded-2xl p-6 sm:p-8 shadow-2xl glow-accent flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-grid-line/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent flex items-center justify-center text-accent">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 id="briefing-title" className="text-xl font-black tracking-wide text-text-primary uppercase">
                TACTICAL DEPLOYMENT BRIEFING
              </h2>
              <span className="text-xs font-mono text-text-muted">
                FIELD MANUAL • 25 × 25 BATTLEFIELD RULES
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close briefing"
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-transparent hover:border-grid-line transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 5 Core Rules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
          <div className="bg-surface-elevated/70 border border-grid-line/60 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-accent" />
              1. OBJECTIVE
            </div>
            <p className="text-text-secondary leading-relaxed font-sans text-xs">
              Dominate the 25×25 sector battlefield (625 total cells). Out-claim your rival commander to achieve victory when the grid is full.
            </p>
          </div>

          <div className="bg-surface-elevated/70 border border-grid-line/60 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-success" />
              2. CLAIM CANNON
            </div>
            <p className="text-text-secondary leading-relaxed font-sans text-xs">
              Click any neutral sector to claim it. Claims are atomically locked by PostgreSQL—server authority prevents conflict.
            </p>
          </div>

          <div className="bg-surface-elevated/70 border border-grid-line/60 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-warning" />
              3. TURN SYSTEM & COOLDOWN
            </div>
            <p className="text-text-secondary leading-relaxed font-sans text-xs">
              Commanders alternate turns. On your turn, deploy your claim within cooldown limits. Turn automatically passes to rival.
            </p>
          </div>

          <div className="bg-surface-elevated/70 border border-grid-line/60 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-danger" />
              4. PRIVATE BATTLES
            </div>
            <p className="text-text-secondary leading-relaxed font-sans text-xs">
              Create a battle and share your 6-character code with any opponent. Both devices synchronize in real-time over WebSockets.
            </p>
          </div>

          <div className="sm:col-span-2 bg-surface-elevated/70 border border-grid-line/60 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-accent-glow" />
              5. HEAD-TO-HEAD HUD
            </div>
            <p className="text-text-secondary leading-relaxed font-sans text-xs">
              Live HUD tracks your claimed sectors vs rival territory in real time. Hover your opponent on the scoreboard to spotlight their claimed sectors.
            </p>
          </div>
        </div>

        {/* Interactive Mini Demo Grid */}
        <div className="bg-surface-elevated/90 border border-grid-line rounded-xl p-4 flex flex-col items-center gap-3">
          <div className="w-full flex items-center justify-between text-xs font-mono text-text-muted">
            <span className="text-text-primary font-bold uppercase tracking-wider">
              INTERACTIVE CANNON SIMULATOR
            </span>
            <button
              type="button"
              onClick={handleResetDemo}
              className="text-[11px] text-accent hover:underline cursor-pointer"
            >
              Reset Simulation
            </button>
          </div>

          {/* 5x5 playable grid */}
          <div className="grid grid-cols-5 gap-1.5 p-2 bg-grid-bg rounded-lg border border-grid-line/60">
            {demoCells.map((cell) => {
              const isPlayer = cell.owner === 'player';
              const isRival = cell.owner === 'rival';
              return (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => handleDemoCellClick(cell.id)}
                  aria-label={`Demo sector ${cell.id}`}
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-md text-[10px] font-mono font-bold flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    isPlayer
                      ? 'bg-accent text-white border-2 border-white shadow-md animate-pulse'
                      : isRival
                      ? 'bg-danger/80 text-white border border-danger/40'
                      : 'bg-surface hover:bg-surface-elevated border border-grid-line/80 hover:border-accent/60 hover:scale-105 active:scale-95 text-text-muted'
                  }`}
                >
                  {isPlayer ? 'YOU' : isRival ? 'RIV' : cell.id}
                </button>
              );
            })}
          </div>

          {/* Cannon status display */}
          <div className="w-full flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${demoCooldown > 0 ? 'bg-warning animate-ping' : 'bg-success'}`} />
              <span className="text-text-secondary">{demoMessage}</span>
            </div>
            {demoCooldown > 0 && (
              <span className="px-2 py-0.5 rounded bg-warning/20 text-warning font-bold border border-warning/30">
                {demoCooldown}.0s
              </span>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-grid-line/40">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-accent hover:bg-accent-glow text-white shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            ENTER THE BATTLEFIELD
          </button>
        </div>
      </div>
    </div>
  );
}
