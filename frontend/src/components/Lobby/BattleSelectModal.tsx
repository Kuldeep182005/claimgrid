import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import { getWsBaseUrl } from '../../config';
import { CloseIcon, CopyIcon, CheckIcon } from '../UI/Icons';
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
  const [selectedPlayers, setSelectedPlayers] = useState<2 | 4>(2);
  const [joinedPlayersCount, setJoinedPlayersCount] = useState<number>(1);
  const [createdSession, setCreatedSession] = useState<GameSession | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const handleClose = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setCreatedSession(null);
    setJoinedPlayersCount(1);
    setJoinCode('');
    setError(null);
    setCopied(false);
    onClose();
  }, [onClose]);

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
  }, [isOpen, handleClose]);

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
            sound.playClaimSuccess();
            setJoinedPlayersCount((prev) => {
              const nextCount = prev + 1;
              if (nextCount >= selectedPlayers) {
                sound.playClaimSuccess();
                ws.close();
                wsRef.current = null;
                onEnterBattle(session);
              }
              return nextCount;
            });
          } else if (data.type === 'GAME_STARTED') {
            sound.playClaimSuccess();
            ws.close();
            wsRef.current = null;
            onEnterBattle(session);
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('Lobby WS error:', err);
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create battle';
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
    if (!cleanCode) return;

    try {
      setLoading(true);
      setError(null);
      const session = await api.joinGame(cleanCode, player.id);
      sound.playClaimSuccess();
      onEnterBattle(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired battle code';
      setError(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdSession) return;
    navigator.clipboard.writeText(createdSession.code);
    setCopied(true);
    sound.playClaimSuccess();
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B18]/40 animate-fadeIn"
    >
      <div className="relative w-full max-w-sm bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard-xl rounded-[8px] p-5 text-[#1E1B18] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#1E1B18]">
          <div>
            <h2 id="modal-title" className="font-display text-lg font-black uppercase tracking-tight text-[#1E1B18]">
              {createdSession ? 'MATCH ROOM' : 'MULTIPLAYER'}
            </h2>
            <span className="text-[11px] font-medium text-[#6E675F]">
              {createdSession ? 'Waiting for players' : 'Create or enter a match'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="btn-tactile-sm p-1 rounded-[4px] bg-[#FAF7F2] text-[#1E1B18] cursor-pointer"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {error && (
          <div className="p-2 rounded-[4px] bg-[#EDE7DC] border border-[#D13428] text-[#D13428] text-xs font-mono font-bold text-center">
            {error}
          </div>
        )}

        {!createdSession ? (
          <div className="flex flex-col gap-4">
            {/* Create Game Section */}
            <div className="flex flex-col gap-2.5">
              <span className="font-display text-xs font-bold text-[#1E1B18] uppercase tracking-wide">
                CREATE GAME
              </span>

              {/* Player count selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="select-2-players"
                  onClick={() => setSelectedPlayers(2)}
                  className={[
                    'btn-tactile-sm py-2 px-3 rounded-[6px] font-display font-bold text-xs uppercase cursor-pointer',
                    selectedPlayers === 2
                      ? 'bg-[#E4572E] text-white'
                      : 'bg-[#FAF7F2] text-[#1E1B18]',
                  ].join(' ')}
                >
                  2 Players
                </button>
                <button
                  type="button"
                  id="select-4-players"
                  onClick={() => setSelectedPlayers(4)}
                  className={[
                    'btn-tactile-sm py-2 px-3 rounded-[6px] font-display font-bold text-xs uppercase cursor-pointer',
                    selectedPlayers === 4
                      ? 'bg-[#E4572E] text-white'
                      : 'bg-[#FAF7F2] text-[#1E1B18]',
                  ].join(' ')}
                >
                  4 Players
                </button>
              </div>

              <button
                type="button"
                onClick={handleCreateBattle}
                disabled={loading}
                className="btn-tactile w-full py-2.5 px-4 rounded-[6px] font-display font-black text-xs tracking-wider bg-[#1E1B18] text-[#FAF7F2] uppercase cursor-pointer disabled:opacity-50"
              >
                {loading ? 'CREATING…' : 'CREATE MATCH'}
              </button>
            </div>

            {/* Subtle Divider */}
            <div className="relative flex items-center justify-center my-0.5">
              <div className="w-full border-t border-[#DCD5C8]" />
              <span className="absolute bg-[#FAF7F2] px-2 text-[10px] font-mono font-bold text-[#6E675F]">
                OR
              </span>
            </div>

            {/* Join Game Section */}
            <form onSubmit={handleJoinBattle} className="flex flex-col gap-2">
              <span className="font-display text-xs font-bold text-[#1E1B18] uppercase tracking-wide">
                JOIN GAME
              </span>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="CODE"
                  disabled={loading}
                  className="flex-1 px-3 py-1.5 bg-[#FFFFFF] border-2 border-[#1E1B18] rounded-[6px] text-[#1E1B18] font-mono text-sm font-bold placeholder:text-[#9C948B] focus:outline-none focus:ring-1 focus:ring-[#1E1B18] uppercase tracking-widest text-center"
                />
                <button
                  type="submit"
                  disabled={loading || joinCode.trim().length < 4}
                  className="btn-tactile px-4 py-1.5 rounded-[6px] font-display font-black text-xs uppercase bg-[#FAF7F2] text-[#1E1B18] disabled:opacity-40 cursor-pointer"
                >
                  {loading ? '…' : 'JOIN'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Waiting Room */
          <div className="flex flex-col gap-4 py-1">
            {/* Shareable Code Plate */}
            <div className="p-3.5 rounded-[6px] bg-[#EDE7DC] border-2 border-[#1E1B18] shadow-hard-sm text-center flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6E675F]">
                SHARE MATCH CODE
              </span>
              <span className="font-display text-3xl font-black tracking-widest text-[#1E1B18] select-all">
                {createdSession.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn-tactile-sm flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#FAF7F2] text-xs font-bold text-[#1E1B18] cursor-pointer mt-1"
              >
                {copied ? <CheckIcon size={13} className="text-[#2A6F4E]" /> : <CopyIcon size={13} />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Player Slots */}
            <div className="flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex items-center gap-2 text-[#1E1B18] p-2 rounded-[4px] bg-[#FAF7F2] border border-[#1E1B18]">
                <span
                  className="w-3 h-3 rounded-[2px] border border-[#1E1B18] shrink-0"
                  style={{ backgroundColor: player.color || '#E4572E' }}
                />
                <span className="font-bold">{player.username}</span>
                <span className="text-[#6E675F] text-[10px]">(You)</span>
              </div>

              {Array.from({ length: selectedPlayers - 1 }).map((_, i) => {
                const isOccupied = i + 2 <= joinedPlayersCount;
                return (
                  <div
                    key={`slot-${i}`}
                    className="flex items-center gap-2 text-[#6E675F] p-2 rounded-[4px] border border-dashed border-[#1E1B18] bg-[#FAF7F2]/60"
                  >
                    <span
                      className={`w-3 h-3 rounded-[2px] border border-[#1E1B18] shrink-0 ${
                        isOccupied ? 'bg-[#1F3A5F] pattern-hatch' : 'border-[#9C948B] animate-pulse'
                      }`}
                    />
                    <span>
                      {isOccupied ? `Player ${i + 2} joined` : 'Waiting for opponent…'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Cancel Button */}
            <div className="text-center pt-1 border-t border-[#DCD5C8]">
              <button
                type="button"
                onClick={() => {
                  if (wsRef.current) {
                    wsRef.current.close();
                    wsRef.current = null;
                  }
                  setCreatedSession(null);
                }}
                className="text-xs font-medium text-[#6E675F] hover:text-[#1E1B18] underline cursor-pointer"
              >
                Cancel Match
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
