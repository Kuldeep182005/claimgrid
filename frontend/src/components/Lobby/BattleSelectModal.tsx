import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import type { GameSession } from '../../types/game';
import type { Player } from '../../types/player';
import type { ServerGameEvent } from '../../types/websocket';

interface BattleSelectModalProps {
  isOpen: boolean;
  player: Player;
  onClose: () => void;
  onEnterBattle: (session: GameSession) => void;
}

export function BattleSelectModal({ isOpen, player, onClose, onEnterBattle }: BattleSelectModalProps) {
  const [view, setView] = useState<'SELECT' | 'CREATE' | 'JOIN'>('SELECT');
  const [createdSession, setCreatedSession] = useState<GameSession | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const handleClose = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setView('SELECT');
    setCreatedSession(null);
    setJoinCode('');
    setError(null);
    setCopied(false);
    onClose();
  };

  // Close with escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Handle Create Battle
  const handleCreateBattle = async () => {
    try {
      setLoading(true);
      setError(null);
      const session = await api.createGame(player.id);
      setCreatedSession(session);
      setView('CREATE');
      sound.playClaimSuccess();

      // Connect WebSocket to wait for opponent
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/game?playerId=${player.id}&gameId=${session.gameId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerGameEvent;
          if (data.type === 'GAME_STARTED') {
            sound.playClaimSuccess();
            onEnterBattle({
              ...session,
              status: 'ACTIVE',
              currentPlayerId: data.currentPlayerId,
              turnNumber: data.turnNumber,
            });
          }
        } catch {
          // ignore
        }
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create battle session';
      setError(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  // Handle Join Battle
  const handleJoinBattle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setError('Enter a valid battle code');
      sound.playError();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const session = await api.joinGame(cleanCode, player.id);
      sound.playClaimSuccess();
      onEnterBattle(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join battle';
      setError(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = useCallback(() => {
    if (!createdSession) return;
    navigator.clipboard.writeText(createdSession.code);
    setCopied(true);
    sound.playClaimSuccess();
    window.setTimeout(() => setCopied(false), 2500);
  }, [createdSession]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md bg-surface/95 border border-accent/60 rounded-2xl p-6 sm:p-8 shadow-2xl glow-accent flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-grid-line/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent flex items-center justify-center text-accent">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 id="battle-modal-title" className="text-lg font-black tracking-wide text-text-primary uppercase">
                {view === 'CREATE' ? 'BATTLE READY' : view === 'JOIN' ? 'JOIN BATTLE' : '2-PLAYER BATTLE'}
              </h2>
              <span className="text-xs font-mono text-accent">
                25 × 25 GRID • TURN-BASED COMBAT
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close battle modal"
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated border border-transparent hover:border-grid-line transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-mono flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* View 1: SELECT (Choose Create or Join) */}
        {view === 'SELECT' && (
          <div className="space-y-4">
            <p className="text-xs font-mono text-text-secondary">
              Deploy to a private 2-player sector. Create a room and share the code, or join an existing battle code.
            </p>

            <button
              type="button"
              onClick={handleCreateBattle}
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wider uppercase bg-accent hover:bg-accent-glow text-white shadow-lg hover:shadow-accent/40 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>CREATE BATTLE</span>
              </div>
              <span className="text-xs font-mono opacity-80">Host 25×25</span>
            </button>

            <button
              type="button"
              onClick={() => { setView('JOIN'); setError(null); }}
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wider uppercase bg-surface-elevated hover:bg-surface-elevated/80 border border-grid-line/80 hover:border-accent text-text-primary shadow-sm hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>JOIN BATTLE</span>
              </div>
              <span className="text-xs font-mono text-text-muted">Enter Code</span>
            </button>
          </div>
        )}

        {/* View 2: CREATE (Waiting for opponent) */}
        {view === 'CREATE' && createdSession && (
          <div className="space-y-5 text-center">
            <div className="p-4 rounded-xl bg-surface-elevated/90 border border-accent/40 space-y-3">
              <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
                SHARE THIS BATTLE CODE
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-accent selection:bg-accent selection:text-black">
                {createdSession.code}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="py-2 px-4 rounded-lg font-mono text-xs uppercase tracking-wider bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 hover:border-accent active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    COPIED TO CLIPBOARD!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    COPY BATTLE CODE
                  </>
                )}
              </button>
            </div>

            {/* Radar waiting indicator */}
            <div className="flex flex-col items-center gap-2 text-xs font-mono text-text-secondary py-2">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-accent/30 animate-ping" />
                <div className="w-4 h-4 rounded-full bg-accent animate-pulse" />
              </div>
              <p className="font-bold text-text-primary uppercase tracking-wider">
                WAITING FOR OPPONENT TO JOIN...
              </p>
              <p className="text-text-muted text-[11px]">
                Both commanders will deploy to the battlefield automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={() => { setView('SELECT'); setCreatedSession(null); }}
              className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel Battle
            </button>
          </div>
        )}

        {/* View 3: JOIN (Enter code) */}
        {view === 'JOIN' && (
          <form onSubmit={handleJoinBattle} className="space-y-4">
            <div>
              <label htmlFor="battle-code-input" className="block text-xs font-mono font-medium text-text-muted uppercase tracking-wider mb-2">
                ENTER 6-CHARACTER BATTLE CODE
              </label>
              <input
                id="battle-code-input"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="e.g. X7K92P"
                autoFocus
                disabled={loading}
                className="w-full px-4 py-3 bg-surface-elevated border border-grid-line rounded-xl text-text-primary text-center font-mono text-2xl font-bold tracking-widest placeholder:text-text-muted/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || joinCode.trim().length < 4}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wider uppercase bg-accent hover:bg-accent-glow text-white shadow-lg hover:shadow-accent/40 active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Joining Battle...' : 'ENTER BATTLEFIELD'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setView('SELECT'); setError(null); }}
                className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Back to Battle Options
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
