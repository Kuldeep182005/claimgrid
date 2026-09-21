import { useState, useEffect } from 'react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const YOU = '#e8b44b';
const RIVAL = '#6c8cff';

const steps: Array<{ title: string; body: string }> = [
  { title: 'Claim a cell', body: 'On your turn, tap any empty cell to make it yours.' },
  { title: 'Take turns', body: 'You and your opponent alternate turns, one claim at a time.' },
  { title: 'Grow your lead', body: 'Every cell you claim is a point. Most cells wins.' },
];

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const [demoCells, setDemoCells] = useState<Array<'neutral' | 'you' | 'rival'>>(() =>
    Array.from({ length: 25 }, (_, i) => (i === 6 || i === 18 ? 'rival' : 'neutral'))
  );
  const [hint, setHint] = useState('Tap any empty cell to try it');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const claim = (i: number) => {
    if (demoCells[i] !== 'neutral') {
      setHint('That one is taken — pick an empty cell');
      return;
    }
    setDemoCells((prev) => prev.map((c, idx) => (idx === i ? 'you' : c)));
    setHint('Nice — that cell is yours now');
  };

  const reset = () => {
    setDemoCells(Array.from({ length: 25 }, (_, i) => (i === 6 || i === 18 ? 'rival' : 'neutral')));
    setHint('Tap any empty cell to try it');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface border border-grid-line rounded-2xl p-6 shadow-2xl shadow-black/50 flex flex-col gap-6 animate-pop-in">
        <div className="flex items-center justify-between">
          <h2 id="how-title" className="font-display text-xl font-semibold text-text-primary">
            How to play
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ol className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent font-display font-semibold text-sm flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                <p className="text-sm text-text-secondary">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Interactive try-it board */}
        <div className="rounded-xl bg-grid-bg border border-grid-line p-4 flex flex-col items-center gap-3">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Try it</span>
            <button type="button" onClick={reset} className="text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer">
              Reset
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {demoCells.map((owner, i) => (
              <button
                key={i}
                type="button"
                onClick={() => claim(i)}
                aria-label={`Cell ${i + 1}`}
                className="w-10 h-10 rounded-md transition-transform active:scale-90 cursor-pointer"
                style={{
                  backgroundColor:
                    owner === 'you' ? YOU : owner === 'rival' ? RIVAL : 'var(--color-grid-cell)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: YOU }} /> You</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: RIVAL }} /> Opponent</span>
          </div>
          <p className="text-xs text-text-secondary" aria-live="polite">{hint}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-lg font-display font-semibold text-base bg-accent hover:bg-accent-glow text-[#231b09] active:scale-[0.98] transition-all cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
