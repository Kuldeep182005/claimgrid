import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import { getWsBaseUrl } from '../../config';
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
  const [selectedPlayers, setSelectedPlayers] = useState<2 | 4>(2);
  const [joinedPlayersCount, setJoinedPlayersCount] = useState<number>(1);
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
    setJoinedPlayersCount(1);
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
      const session = await api.createGame(player.id, selectedPlayers);
      setCreatedSession(session);
      setJoinedPlayersCount(1);
      setView('CREATE');
      sound.playClaimSuccess();

      // Connect WebSocket to wait for all players
      const wsBase = getWsBaseUrl();
      const wsUrl = `${wsBase}/ws/game?playerId=${player.id}&gameId=${session.gameId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerGameEvent;
          if (data.type === 'PLAYER_JOINED') {
            setJoinedPlayersCount((prev) => Math.min(selectedPlayers, prev + 1));
            sound.playClaimSuccess();
          } else if (data.type === 'GAME_STARTED') {
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
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
      const msg = err instanceof Error ? err.message : 'Could not create the game. Try again.';
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
      setError('Enter a valid game code');
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
      const msg = err instanceof Error ? err.message : 'Could not join that game';
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

  const title =
    view === 'CREATE'
      ? (createdSession ? 'Share the code' : 'Create game')
      : view === 'JOIN'
      ? 'Join game'
      : 'Multiplayer';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative w-full max-w-sm bg-surface border border-grid-line rounded-2xl p-6 shadow-2xl shadow-black/50 flex flex-col gap-5 animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 id="battle-modal-title" className="font-display text-xl font-semibold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">{error}</p>
        )}

        {/* View 1: SELECT */}
        {view === 'SELECT' && (
          <div className="flex flex-col gap-5">
            <div>
              <span className="block text-xs font-medium text-text-muted mb-2">Players</span>
              <div className="grid grid-cols-2 gap-2">
                {([2, 4] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    id={`select-${count}-players`}
                    onClick={() => setSelectedPlayers(count)}
                    className={`py-3 rounded-lg font-display text-lg font-semibold transition-all cursor-pointer border ${
                      selectedPlayers === count
                        ? 'bg-accent text-[#231b09] border-accent'
                        : 'bg-surface-elevated border-grid-line text-text-secondary hover:text-text-primary hover:border-grid-line'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateBattle}
              disabled={loading}
              className="w-full py-3.5 rounded-lg font-display font-semibold text-base bg-accent hover:bg-accent-glow text-[#231b09] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create game'}
            </button>

            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span className="flex-1 h-px bg-grid-line" />
              or
              <span className="flex-1 h-px bg-grid-line" />
            </div>

            <button
              type="button"
              onClick={() => { setView('JOIN'); setError(null); }}
              disabled={loading}
              className="w-full py-3.5 rounded-lg font-medium text-base bg-surface-elevated border border-grid-line hover:border-accent/50 text-text-primary active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              Join with a code
            </button>
          </div>
        )}

        {/* View 2: CREATE (waiting) */}
        {view === 'CREATE' && createdSession && (
          <div className="flex flex-col gap-5 text-center">
            <p className="text-sm text-text-secondary">
              Send this code to a friend. The game starts automatically when everyone joins.
            </p>

            <button
              type="button"
              onClick={handleCopyCode}
              className="group relative py-5 rounded-xl bg-surface-elevated border border-grid-line hover:border-accent/60 transition-all cursor-pointer"
              aria-label="Copy game code"
            >
              <span className="font-display text-4xl font-bold tracking-[0.25em] text-accent">
                {createdSession.code}
              </span>
              <span className="block mt-1.5 text-xs text-text-muted">
                {copied ? 'Copied' : 'Tap to copy'}
              </span>
            </button>

            <div className="flex items-center justify-center gap-2.5 text-sm text-text-secondary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              {selectedPlayers === 4
                ? `Waiting for players — ${joinedPlayersCount}/4`
                : 'Waiting for opponent...'}
            </div>

            <button
              type="button"
              onClick={() => { setView('SELECT'); setCreatedSession(null); }}
              className="text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* View 3: JOIN */}
        {view === 'JOIN' && (
          <form onSubmit={handleJoinBattle} className="flex flex-col gap-4">
            <div>
              <label htmlFor="battle-code-input" className="block text-xs font-medium text-text-muted mb-2">
                Game code
              </label>
              <input
                id="battle-code-input"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="ABC123"
                autoFocus
                disabled={loading}
                className="w-full px-4 py-4 bg-surface-elevated border border-grid-line rounded-lg text-text-primary text-center font-display text-3xl font-bold tracking-[0.25em] placeholder:text-text-muted/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-all uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={loading || joinCode.trim().length < 4}
              className="w-full py-3.5 rounded-lg font-display font-semibold text-base bg-accent hover:bg-accent-glow text-[#231b09] active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? 'Joining...' : 'Join game'}
            </button>

            <button
              type="button"
              onClick={() => { setView('SELECT'); setError(null); }}
              className="text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
