import { useEffect } from 'react';

interface PracticeBotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployMultiplayer: () => void;
  onStartPractice: () => void;
}

export function PracticeBotsModal({ isOpen, onClose, onDeployMultiplayer, onStartPractice }: PracticeBotsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm bg-surface border border-grid-line rounded-2xl p-6 shadow-2xl shadow-black/50 flex flex-col gap-5 animate-pop-in">
        <div className="flex items-center justify-between">
          <h2 id="practice-title" className="font-display text-xl font-semibold text-text-primary">
            Practice
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

        <p className="text-sm text-text-secondary leading-relaxed">
          Play a quick solo match against a bot to learn the ropes. Same rules, same turns — no pressure. When you&apos;re ready, invite a friend for a real match.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onStartPractice}
            className="w-full py-3.5 rounded-lg font-display font-semibold text-base bg-accent hover:bg-accent-glow text-[#231b09] active:scale-[0.98] transition-all cursor-pointer"
          >
            Start practice
          </button>
          <button
            type="button"
            onClick={onDeployMultiplayer}
            className="w-full py-3 rounded-lg font-medium text-sm bg-surface-elevated border border-grid-line hover:border-accent/50 text-text-primary active:scale-[0.98] transition-all cursor-pointer"
          >
            Play against a friend instead
          </button>
        </div>
      </div>
    </div>
  );
}
