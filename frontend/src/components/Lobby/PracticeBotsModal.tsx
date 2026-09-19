import { useEffect, useRef } from 'react';

interface PracticeBotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployMultiplayer: () => void;
}

export function PracticeBotsModal({ isOpen, onClose, onDeployMultiplayer }: PracticeBotsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-briefing-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-surface/95 border border-accent/60 rounded-2xl p-6 sm:p-8 shadow-2xl glow-accent flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-grid-line/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent flex items-center justify-center text-accent">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 id="practice-briefing-title" className="text-lg font-black tracking-wide text-text-primary uppercase">
                PRACTICE VS BOTS
              </h2>
              <span className="text-xs font-mono text-accent">
                COMING NEXT • PHASE 8 TARGET
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close practice briefing"
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-transparent hover:border-grid-line transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tactical Explanation */}
        <div className="space-y-3 text-xs font-mono text-text-secondary leading-relaxed">
          <div className="p-3 rounded-xl bg-surface-elevated/80 border border-grid-line/80 space-y-2">
            <div className="text-text-primary font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              GameSession Architecture Ready
            </div>
            <p className="font-sans text-xs text-text-secondary">
              Phase 7 has successfully established the 25×25 private battle session engine with isolated WebSocket channels and turn-locking.
            </p>
            <p className="font-sans text-xs text-text-secondary">
              Phase 8 will introduce server-authoritative AI commanders (<span className="text-accent font-semibold">Scout, Expander, Aggressor</span>) that plug directly into this same GameSession architecture.
            </p>
          </div>

          <p className="font-sans text-xs text-text-muted">
            For now, challenge other live commanders using private battle codes!
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-grid-line/60">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-grid-line/60 transition-all cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onDeployMultiplayer}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-accent hover:bg-accent-glow text-white shadow-md hover:shadow-accent/40 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            Play 2-Player Battle
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
