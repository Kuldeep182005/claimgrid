import { useState, useId } from 'react';
import { HeroGrid } from '../game/HeroGrid';
import { HowToPlayModal } from './HowToPlayModal';
import { PracticeBotsModal } from './PracticeBotsModal';
import { BattleSelectModal } from './BattleSelectModal';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import type { Player } from '../../types/player';
import type { GameSession } from '../../types/game';

interface JoinScreenProps {
  savedPlayer?: Player | null;
  onStartBattle: (player: Player, session: GameSession) => void;
  onSwitchPlayer?: () => void;
}

export function JoinScreen({ savedPlayer, onStartBattle, onSwitchPlayer }: JoinScreenProps) {
  const [activePlayer, setActivePlayer] = useState<Player | null>(savedPlayer ?? null);
  const [username, setUsername] = useState<string>(savedPlayer?.username ?? '');
  const [isEnteringName, setIsEnteringName] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [isBattleModalOpen, setIsBattleModalOpen] = useState(false);

  const nameInputId = useId();

  // Sync if savedPlayer changes from parent
  const [prevSaved, setPrevSaved] = useState(savedPlayer);
  if (savedPlayer !== prevSaved) {
    setPrevSaved(savedPlayer);
    setActivePlayer(savedPlayer ?? null);
    setUsername(savedPlayer?.username ?? '');
    if (savedPlayer) {
      setIsEnteringName(false);
    }
  }

  const handlePlayClick = () => {
    if (activePlayer) {
      setIsBattleModalOpen(true);
      return;
    }
    setIsEnteringName(true);
    setError(null);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();

    if (cleanUsername.length < 2 || cleanUsername.length > 30) {
      setError('Name must be between 2 and 30 characters');
      sound.playError();
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError('Letters, numbers, underscores, dashes, and periods only');
      sound.playError();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let playerToUse: Player;
      if (savedPlayer && savedPlayer.username.toLowerCase() === cleanUsername.toLowerCase()) {
        playerToUse = savedPlayer;
      } else {
        playerToUse = await api.createPlayer(cleanUsername);
      }

      setActivePlayer(playerToUse);
      setIsEnteringName(false);
      sound.playClaimSuccess();
      setIsBattleModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join';
      setError(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  const handlePracticeClick = () => {
    if (!activePlayer && !username.trim()) {
      setIsEnteringName(true);
      return;
    }
    setIsPracticeModalOpen(true);
  };

  const handleStartPracticeDirectly = async () => {
    const cleanUsername = username.trim() || activePlayer?.username || 'Player';
    try {
      setLoading(true);
      setError(null);
      const playerToUse = activePlayer ?? (await api.createPlayer(cleanUsername));
      setActivePlayer(playerToUse);
      const session = await api.createPracticeGame(playerToUse.id);
      setIsPracticeModalOpen(false);
      sound.playClaimSuccess();
      onStartBattle(playerToUse, session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start practice';
      setError(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlayer = () => {
    setActivePlayer(null);
    setUsername('');
    setIsEnteringName(true);
    onSwitchPlayer?.();
  };

  return (
    <div className="min-h-screen bg-[#F2EDE4] text-[#1E1B18] flex flex-col items-center justify-center px-4 py-8 select-none">
      <main className="w-full max-w-md flex flex-col items-center text-center my-auto gap-5">
        {/* Brand & Tabletop Title */}
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tight text-[#1E1B18]">
            CLAIMGRID
          </h1>
          <p className="text-sm font-medium text-[#6E675F] mt-1">
            Claim the grid. Outsmart your opponent.
          </p>
        </div>

        {/* Living Board Piece */}
        <HeroGrid />

        {/* Action Controls */}
        {!isEnteringName ? (
          <div className="w-full flex flex-col items-center gap-3">
            <button
              type="button"
              id="main-play-button"
              onClick={handlePlayClick}
              className="btn-tactile w-full max-w-xs py-3 px-8 rounded-[8px] font-display font-black text-sm tracking-wider bg-[#E4572E] text-white cursor-pointer uppercase"
            >
              PLAY
            </button>

            <button
              type="button"
              onClick={handlePracticeClick}
              className="btn-tactile w-full max-w-xs py-2 px-6 rounded-[8px] font-display font-bold text-xs tracking-wider bg-[#FAF7F2] text-[#1E1B18] cursor-pointer uppercase"
            >
              PRACTICE VS BOT
            </button>

            {/* Returning player info */}
            {activePlayer && (
              <div className="flex items-center gap-1.5 text-xs text-[#6E675F] bg-[#FAF7F2] px-3 py-1 rounded-[5px] border border-[#1E1B18] shadow-hard-sm mt-1">
                <span>Playing as</span>
                <span
                  className="w-2.5 h-2.5 rounded-[2px] border border-[#1E1B18]"
                  style={{ backgroundColor: activePlayer.color }}
                />
                <strong className="text-[#1E1B18] font-bold">{activePlayer.username}</strong>
                <button
                  type="button"
                  onClick={handleChangePlayer}
                  className="underline hover:text-[#1E1B18] ml-1 cursor-pointer font-medium"
                >
                  (change)
                </button>
              </div>
            )}

            {/* Secondary footer links */}
            <div className="flex items-center gap-4 text-xs font-medium text-[#6E675F] mt-1">
              <button
                type="button"
                onClick={() => setIsHowToPlayOpen(true)}
                className="hover:text-[#1E1B18] underline transition-colors cursor-pointer"
              >
                How to Play
              </button>
              {activePlayer && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={handleChangePlayer}
                    className="hover:text-[#1E1B18] underline transition-colors cursor-pointer"
                  >
                    Switch player
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Tabletop Name Entry Card */
          <form
            onSubmit={handleNameSubmit}
            className="w-full max-w-xs bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard rounded-[8px] p-4 flex flex-col gap-3 animate-fadeIn"
          >
            <div className="text-left">
              <label htmlFor={nameInputId} className="font-display text-xs font-bold uppercase text-[#1E1B18] block mb-1">
                Enter Your Player Name
              </label>
              <input
                id={nameInputId}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Commander"
                autoFocus
                maxLength={30}
                disabled={loading}
                className="w-full px-3 py-2 bg-[#FFFFFF] border-2 border-[#1E1B18] rounded-[6px] text-[#1E1B18] text-sm font-bold placeholder:text-[#9C948B] focus:outline-none focus:ring-1 focus:ring-[#1E1B18]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#D13428] font-bold text-left">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || username.trim().length < 2}
              className="btn-tactile w-full py-2.5 rounded-[6px] font-display font-black text-xs tracking-wider bg-[#E4572E] text-white disabled:opacity-40 cursor-pointer uppercase"
            >
              {loading ? 'JOINING…' : 'ENTER MATCH'}
            </button>

            {activePlayer && (
              <button
                type="button"
                onClick={() => setIsEnteringName(false)}
                className="text-xs text-[#6E675F] hover:text-[#1E1B18] cursor-pointer"
              >
                Cancel
              </button>
            )}
          </form>
        )}
      </main>

      {/* Modals */}
      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />

      <PracticeBotsModal
        isOpen={isPracticeModalOpen}
        onClose={() => setIsPracticeModalOpen(false)}
        onStartPractice={() => void handleStartPracticeDirectly()}
        onDeployMultiplayer={() => {
          setIsPracticeModalOpen(false);
          if (activePlayer) {
            setIsBattleModalOpen(true);
          } else {
            setIsEnteringName(true);
          }
        }}
      />

      {activePlayer && (
        <BattleSelectModal
          isOpen={isBattleModalOpen}
          player={activePlayer}
          onClose={() => setIsBattleModalOpen(false)}
          onEnterBattle={(session) => {
            setIsBattleModalOpen(false);
            onStartBattle(activePlayer, session);
          }}
        />
      )}
    </div>
  );
}
