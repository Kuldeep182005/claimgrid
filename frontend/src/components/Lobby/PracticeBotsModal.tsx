import { useEffect } from 'react';
import { CloseIcon, BotIcon } from '../UI/Icons';

interface PracticeBotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployMultiplayer: () => void;
  onStartPractice: () => void;
}

export function PracticeBotsModal({ isOpen, onClose, onStartPractice }: PracticeBotsModalProps) {
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
      aria-labelledby="practice-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B18]/40 animate-fadeIn"
    >
      <div className="relative w-full max-w-sm bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard-xl rounded-[8px] p-5 text-[#1E1B18] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#1E1B18]">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-[4px] bg-[#EDE7DC] border border-[#1E1B18]">
              <BotIcon size={16} />
            </span>
            <h2 id="practice-title" className="font-display text-base font-black uppercase tracking-tight text-[#1E1B18]">
              PRACTICE BOT
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn-tactile-sm p-1 rounded-[4px] bg-[#FAF7F2] text-[#1E1B18] cursor-pointer"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <p className="text-xs text-[#6E675F] leading-relaxed">
          Test your claiming strategy against an automated bot before heading into live competitive matches.
        </p>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#DCD5C8]">
          <button
            type="button"
            onClick={onClose}
            className="btn-tactile-sm px-3.5 py-1.5 rounded-[5px] text-xs font-bold text-[#6E675F] hover:text-[#1E1B18] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onStartPractice}
            className="btn-tactile px-5 py-2 rounded-[6px] font-display font-black text-xs uppercase bg-[#E4572E] text-white tracking-wide cursor-pointer"
          >
            START PRACTICE
          </button>
        </div>
      </div>
    </div>
  );
}
