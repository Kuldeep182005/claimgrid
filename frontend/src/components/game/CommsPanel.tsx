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

const reactions: Array<{ type: ReactionType; label: string }> = [
  { type: 'THUMBS_UP', label: 'GG' },
  { type: 'LAUGH', label: 'NICE' },
  { type: 'THUMBS_DOWN', label: 'OOPS' },
  { type: 'CRY', label: 'WELL PLAYED' },
];

export function CommsPanel({
  messages,
  currentPlayerId,
  disabled = false,
  onSendMessage,
  onSendReaction,
}: CommsPanelProps) {
  const [draft, setDraft] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const submit = () => {
    if (onSendMessage(draft)) setDraft('');
  };

  const visibleMessages = isExpanded ? messages : messages.slice(-2);
  const hasMessages = messages.length > 0;

  return (
    <section className="bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard-sm rounded-[6px] p-2.5 flex flex-col gap-2 w-full text-xs" aria-label="Match chat">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between pb-1 border-b border-[#DCD5C8]">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 font-display text-xs font-bold text-[#1E1B18] cursor-pointer hover:underline"
        >
          <span>MATCH COMMS</span>
          <span className="text-[10px] font-mono text-[#6E675F]">
            ({messages.length})
          </span>
          <span className="text-[10px] text-[#6E675F]">{isExpanded ? '▲' : '▼'}</span>
        </button>

        {/* Reaction Stamps */}
        <div className="flex items-center gap-1">
          {reactions.map((r) => (
            <button
              key={r.type}
              type="button"
              disabled={disabled}
              onClick={() => onSendReaction(r.type)}
              className="btn-tactile-sm px-1.5 py-0.5 rounded-[3px] bg-[#EDE7DC] text-[9px] font-mono font-bold text-[#1E1B18] cursor-pointer disabled:opacity-40"
              title={`Send stamp: ${r.label}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        className={`overflow-y-auto space-y-1 font-mono text-[11px] transition-all ${
          isExpanded ? 'max-h-36' : 'max-h-14'
        }`}
        aria-live="polite"
      >
        {!hasMessages ? (
          <div className="text-[#6E675F] text-[10px]">No messages exchanged</div>
        ) : (
          visibleMessages.map((m) => {
            const isSelf = m.playerId === currentPlayerId;
            return (
              <div
                key={m.id}
                className={[
                  'px-2 py-0.5 rounded-[3px] flex items-baseline gap-1.5',
                  isSelf ? 'bg-[#E4572E]/10' : 'bg-[#EDE7DC]',
                ].join(' ')}
              >
                <span className="font-bold text-[10px] text-[#1E1B18] shrink-0">
                  {m.playerName}:
                </span>
                <span className="text-[#1E1B18] break-all">{m.message}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-1.5"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={disabled ? 'Chat available in active match' : 'Type message...'}
          maxLength={100}
          disabled={disabled}
          className="flex-1 px-2.5 py-1 bg-[#FFFFFF] border border-[#1E1B18] rounded-[4px] text-xs font-mono text-[#1E1B18] placeholder:text-[#9C948B] focus:outline-none focus:ring-1 focus:ring-[#1E1B18] disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          className="btn-tactile-sm px-3 py-1 bg-[#1E1B18] text-[#FAF7F2] font-display font-bold text-xs rounded-[4px] disabled:opacity-40 cursor-pointer"
        >
          SEND
        </button>
      </form>
    </section>
  );
}
