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
  onRefreshState: () => void;
}

export function GameHeader({
  connectionState,
  latencyMs,
  onlineCount,
  claimedCells,
  totalCells,
  onRefreshState,
}: GameHeaderProps) {
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      sound.playCooldownReady();
    }
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
              50×50 TERRITORY WAR
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="hidden md:flex items-center gap-3 bg-surface-elevated/70 border border-grid-line/60 rounded-xl px-3 py-1.5 text-xs font-mono">
          <span className="text-text-muted">GRID SECURED:</span>
          <div className="w-28 h-2 bg-surface rounded-full overflow-hidden border border-grid-line/50">
            <div
              style={{ width: `${percentage}%` }}
              className="h-full bg-accent rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(99,102,241,0.6)]"
            />
          </div>
          <span className="font-bold text-text-primary">
            {claimedCells} <span className="text-text-muted font-normal">/ {totalCells} ({percentage}%)</span>
          </span>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-2.5">
          {/* Online Players Counter */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated/80 border border-grid-line text-xs font-mono text-text-secondary"
            title="Connected Commanders"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>{onlineCount}</span>
            <span className="text-[10px] text-text-muted hidden sm:inline">ONLINE</span>
          </div>

          {/* Connection Status Pill */}
          <ConnectionPill state={connectionState} latencyMs={latencyMs} />

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            title={isMuted ? 'Unmute Tactical Audio' : 'Mute Tactical Audio'}
            className="p-1.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-elevated border border-grid-line/60 text-text-muted hover:text-text-primary transition-all cursor-pointer"
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
            className="p-1.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-elevated border border-grid-line/60 text-text-muted hover:text-text-primary transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
