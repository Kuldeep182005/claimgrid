import { useState } from 'react';
import { ConnectionPill } from '../UI/ConnectionPill';
import { sound } from '../../services/sound';
import type { ConnectionState } from '../../types/websocket';

interface GameHeaderProps {
  connectionState: ConnectionState;
  latencyMs: number | null;
  onlineCount: number;
  claimedCells: number;
  totalCells: number;
  battleCode?: string;
  turnNumber?: number;
  isMyTurn?: boolean;
  onRefreshState: () => void;
  onOpenHowToPlay?: () => void;
  onReturnToLobby?: () => void;
}

export function GameHeader({
  connectionState,
  latencyMs,
  onlineCount,
  battleCode,
  onRefreshState,
  onOpenHowToPlay,
  onReturnToLobby,
}: GameHeaderProps) {
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [copied, setCopied] = useState<boolean>(false);

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) sound.playCooldownReady();
  };

  const handleCopyCode = () => {
    if (!battleCode) return;
    navigator.clipboard.writeText(battleCode);
    setCopied(true);
    sound.playClaimSuccess();
    window.setTimeout(() => setCopied(false), 2000);
  };

  const iconBtn =
    'p-2 rounded-lg bg-surface-elevated/60 hover:bg-surface-elevated border border-grid-line hover:border-accent/50 text-text-muted hover:text-text-primary transition-all active:scale-95 cursor-pointer';

  return (
    <header className="bg-surface/90 border-b border-grid-line px-4 py-3 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-grid-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-text-primary">
            Claim<span className="text-accent">Grid</span>
          </span>
        </div>

        {/* Battle code */}
        {battleCode && (
          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy game code"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-grid-line hover:border-accent/50 text-sm transition-all active:scale-95 cursor-pointer"
          >
            <span className="text-xs text-text-muted">Code</span>
            <span className="font-display font-semibold tracking-wide text-accent">{battleCode}</span>
            <span className="text-xs text-text-muted">{copied ? 'copied' : 'copy'}</span>
          </button>
        )}

        {/* Status + controls */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated/60 border border-grid-line text-xs text-text-secondary"
            title="Players online"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-soft-glow shrink-0" />
            <span className="font-semibold text-text-primary tabular-nums">{onlineCount}</span>
            <span className="text-text-muted hidden sm:inline">online</span>
          </div>

          <ConnectionPill state={connectionState} latencyMs={latencyMs} />

          {onOpenHowToPlay && (
            <button type="button" onClick={onOpenHowToPlay} title="How to play" className={iconBtn}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          <button type="button" onClick={handleToggleSound} title={isMuted ? 'Unmute' : 'Mute'} className={iconBtn}>
            {isMuted ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          <button type="button" onClick={onRefreshState} title="Refresh" className={iconBtn}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {onReturnToLobby && (
            <button
              type="button"
              onClick={onReturnToLobby}
              title="Leave game"
              className="px-3 py-1.5 rounded-lg bg-surface-elevated/60 hover:bg-danger/15 border border-grid-line hover:border-danger/50 text-text-muted hover:text-danger transition-all active:scale-95 cursor-pointer text-sm font-medium"
            >
              Leave
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
