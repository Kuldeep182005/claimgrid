import { useState } from 'react';
import type { ChatMessage, ReactionAnimation } from '../../hooks/useGameState';
import type { ReactionType } from '../../types/websocket';

interface CommsPanelProps {
  messages: ChatMessage[];
  reaction: ReactionAnimation | null;
  currentPlayerId: string;
  disabled?: boolean;
  onSendMessage: (message: string) => boolean;
  onSendReaction: (reaction: ReactionType) => boolean;
}

const reactions: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: 'THUMBS_UP', emoji: '👍', label: 'Thumbs up' },
  { type: 'THUMBS_DOWN', emoji: '👎', label: 'Thumbs down' },
  { type: 'LAUGH', emoji: '😂', label: 'Laugh' },
  { type: 'CRY', emoji: '😭', label: 'Cry' },
];

export function CommsPanel({
  messages,
  reaction,
  currentPlayerId,
  disabled = false,
  onSendMessage,
  onSendReaction,
}: CommsPanelProps) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (onSendMessage(draft)) setDraft('');
  };

  return (
    <section className="relative rounded-2xl bg-surface/70 border border-grid-line/60 backdrop-blur-sm shadow-lg p-3" aria-label="Match communications">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">COMMS</span>
        <span className="text-[10px] font-mono text-text-muted/70">{disabled ? 'PRACTICE OFFLINE' : 'LIVE'}</span>
      </div>

      <div className="relative h-36 overflow-y-auto space-y-1.5 pr-1" aria-live="polite">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] font-mono text-text-muted/60">
            No transmissions yet
          </div>
        ) : messages.map((entry) => (
          <div key={entry.id} className="text-[11px] leading-tight">
            <span className="font-bold text-accent">{entry.playerId === currentPlayerId ? 'YOU' : entry.playerName}</span>
            <span className="text-text-muted mx-1">·</span>
            <span className="text-text-primary break-words">{entry.message}</span>
          </div>
        ))}
      </div>

      {reaction && (
        <div key={reaction.id} className="pointer-events-none absolute right-5 top-8 z-10 flex flex-col items-center comms-reaction" aria-label={`${reaction.playerName} sent a reaction`}>
          <span className="text-5xl">{reactions.find((item) => item.type === reaction.reaction)?.emoji}</span>
          <span className="text-[9px] font-mono text-text-muted">{reaction.playerName}</span>
        </div>
      )}

      {!disabled && (
        <>
          <div className="flex gap-1.5 mt-2">
            <input
              value={draft}
              maxLength={120}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Transmit message..."
              className="min-w-0 flex-1 rounded-lg bg-surface-elevated border border-grid-line px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
              aria-label="Chat message"
            />
            <button type="button" onClick={submit} disabled={!draft.trim()} className="rounded-lg border border-accent/50 px-2.5 text-[10px] font-mono font-bold text-accent hover:bg-accent/10 disabled:opacity-40">
              SEND
            </button>
          </div>
          <div className="flex gap-1.5 mt-2" aria-label="Quick reactions">
            {reactions.map((item) => (
              <button
                key={item.type}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => onSendReaction(item.type)}
                className="flex-1 rounded-lg border border-grid-line bg-surface-elevated py-1.5 text-lg leading-none hover:border-accent/60 hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </>
      )}

      <style>{`
        .comms-reaction { animation: comms-reaction-float 1.4s ease-out both; }
        @keyframes comms-reaction-float {
          0% { opacity: 0; transform: translateY(12px) scale(.7) rotate(-8deg); }
          18% { opacity: 1; transform: translateY(0) scale(1.12) rotate(3deg); }
          75% { opacity: 1; transform: translateY(-12px) scale(1); }
          100% { opacity: 0; transform: translateY(-28px) scale(.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .comms-reaction { animation: comms-reaction-reduced 1.4s ease-out both; }
          @keyframes comms-reaction-reduced { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>
    </section>
  );
}
