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
  claimedCells,
  totalCells,
  battleCode,
  turnNumber,
  isMyTurn,
  onRefreshState,
  onOpenHowToPlay,
  onReturnToLobby,
}: GameHeaderProps) {
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [copied, setCopied] = useState<boolean>(false);

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      sound.playCooldownReady();
    }
  };

  const handleCopyCode = () => {
    if (!battleCode) return;
    navigator.clipboard.writeText(battleCode);
    setCopied(true);
    sound.playClaimSuccess();
    window.setTimeout(() => setCopied(false), 2000);
  };

  const percentage = totalCells > 0 ? ((claimedCells / totalCells) * 100).toFixed(1) : '0';

  return (
    <header className="bg-surface/90 border-b border-grid-line/80 px-4 py-3 backdrop-blur-md sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.6)]">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-text-primary flex items-center gap-1.5">
              CLAIM<span className="text-accent">GRID</span>
            </span>
            <span className="text-[10px] font-mono text-text-muted hidden sm:inline-block">
              {battleCode ? `BATTLE SECTOR • 25×25 GRID` : `50×50 TERRITORY WAR`}
            </span>
          </div>
        </div>

        {/* Battle Code Badge & Turn Indicator */}
        {battleCode && (
          <div className="flex items-center gap-2.5">
            {/* Battle Code Pill */}
            <button
              type="button"
              onClick={handleCopyCode}
              title="Click to copy battle code"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-accent/40 text-accent text-xs font-mono font-bold hover:bg-accent/10 hover:border-accent active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <span className="text-[10px] text-text-muted font-normal">CODE:</span>
              <span>{battleCode}</span>
              <span className="text-[10px] opacity-75">{copied ? '✓' : '📋'}</span>
            </button>

            {/* Turn Banner */}
            {turnNumber !== undefined && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border shadow-sm transition-all duration-300 ${
                  isMyTurn
                    ? 'bg-success/15 text-success border-success/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse'
                    : 'bg-warning/15 text-warning border-warning/40'
                }`}
              >
                <span>{isMyTurn ? '⚡ YOUR TURN' : '⏳ RIVAL TURN'}</span>
                <span className="text-[10px] opacity-75 font-normal">#{turnNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Global Progress Bar */}
        <div className="hidden lg:flex items-center gap-3 bg-surface-elevated/70 border border-grid-line/60 rounded-xl px-3 py-1.5 text-xs font-mono">
          <span className="text-text-muted">GRID SECURED:</span>
          <div className="w-24 h-2 bg-surface rounded-full overflow-hidden border border-grid-line/50">
            <div
              style={{ width: `${percentage}%` }}
              className="h-full bg-accent rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(99,102,241,0.6)]"
            />
          </div>
          <span className="font-bold text-text-primary">
            {claimedCells} <span className="text-text-muted font-normal">/ {totalCells}</span>
          </span>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-2">
          {/* Online Commanders Counter */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated/80 border border-grid-line text-xs font-mono text-text-secondary shadow-sm"
            title="Battle presence"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
            <span className="font-bold text-text-primary">{onlineCount}</span>
            <span className="text-[10px] text-text-muted uppercase hidden sm:inline">
              ONLINE
            </span>
          </div>

          {/* Connection Status Pill */}
          <ConnectionPill state={connectionState} latencyMs={latencyMs} />

          {/* How To Play Manual Button */}
          {onOpenHowToPlay && (
            <button
              type="button"
              onClick={onOpenHowToPlay}
              title="Tactical Deployment Briefing (How To Play)"
              className="px-2.5 py-1.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-elevated border border-grid-line/60 hover:border-accent/60 text-text-muted hover:text-text-primary transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
            >
              <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">MANUAL</span>
            </button>
          )}

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            title={isMuted ? 'Unmute Tactical Audio' : 'Mute Tactical Audio'}
            className="p-1.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-elevated border border-grid-line/60 hover:border-accent/40 text-text-muted hover:text-text-primary transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer"
          >
            {isMuted ? (
              <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          {/* Manual Snapshot Sync */}
          <button
            type="button"
            onClick={onRefreshState}
            title="Resync Grid Snapshot"
            className="p-1.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-elevated border border-grid-line/60 hover:border-accent/40 text-text-muted hover:text-text-primary transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Exit / Return to Lobby Button */}
          {onReturnToLobby && (
            <button
              type="button"
              onClick={onReturnToLobby}
              title="Return to Lobby"
              className="px-2.5 py-1.5 rounded-lg bg-surface-elevated/70 hover:bg-danger/20 border border-grid-line/60 hover:border-danger/60 text-text-muted hover:text-danger transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer text-xs font-mono font-bold flex items-center gap-1"
            >
              <span>EXIT</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
