import { useState, useId } from 'react';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import { HowToPlayModal } from './HowToPlayModal';
import { PracticeBotsModal } from './PracticeBotsModal';
import { BattleSelectModal } from './BattleSelectModal';
import { MiniBoard } from './MiniBoard';
import type { Player } from '../../types/player';
import type { GameSession } from '../../types/game';

interface JoinScreenProps {
  savedPlayer?: Player | null;
  onStartBattle: (player: Player, session: GameSession) => void;
  onSwitchPlayer?: () => void;
}

export function JoinScreen({ savedPlayer, onStartBattle, onSwitchPlayer }: JoinScreenProps) {
  const [username, setUsername] = useState(savedPlayer?.username ?? '');
  const [activePlayer, setActivePlayer] = useState<Player | null>(savedPlayer ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [isBattleModalOpen, setIsBattleModalOpen] = useState(false);
  const usernameInputId = useId();

  const [prevSavedPlayer, setPrevSavedPlayer] = useState(savedPlayer);
  if (savedPlayer !== prevSavedPlayer) {
    setPrevSavedPlayer(savedPlayer);
    setUsername(savedPlayer?.username ?? '');
    setActivePlayer(savedPlayer ?? null);
  }

  const validate = (name: string): string | null => {
    if (name.length < 2 || name.length > 30) return 'Pick a name between 2 and 30 characters';
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return 'Letters, numbers, _ . - only';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    const validationError = validate(cleanUsername);
    if (validationError) {
      setError(validationError);
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
      sound.playClaimSuccess();
      setIsBattleModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setError(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = async () => {
    const cleanUsername = username.trim();
    const validationError = validate(cleanUsername);
    if (validationError) {
      setIsPracticeModalOpen(false);
      setError(validationError);
      sound.playError();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const playerToUse = savedPlayer && savedPlayer.username.toLowerCase() === cleanUsername.toLowerCase()
        ? savedPlayer
        : await api.createPlayer(cleanUsername);
      const session = await api.createPracticeGame(playerToUse.id);
      setActivePlayer(playerToUse);
      setIsPracticeModalOpen(false);
      sound.playClaimSuccess();
      onStartBattle(playerToUse, session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start practice. Try again.';
      setError(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  const openPractice = () => {
    if (validate(username.trim())) {
      setError('Enter your name first, then practice');
      sound.playError();
      return;
    }
    setIsPracticeModalOpen(true);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-5">
      <main className="relative z-10 w-full max-w-sm flex flex-col items-center animate-fadeIn">
        {/* Logo + tagline */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-text-primary">
            Claim<span className="text-accent">Grid</span>
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Claim the grid. Outsmart your opponent.
          </p>
        </div>

        {/* Animated mini board — shows the game at a glance */}
        <div className="mb-8">
          <MiniBoard />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div>
            <label htmlFor={usernameInputId} className="sr-only">Your name</label>
            <div className="relative">
              <input
                id={usernameInputId}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                disabled={loading}
                autoFocus
                maxLength={30}
                className="w-full px-4 py-3.5 bg-surface border border-grid-line rounded-lg text-text-primary text-center text-base placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-all"
              />
              {savedPlayer && onSwitchPlayer && (
                <button
                  type="button"
                  onClick={onSwitchPlayer}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="text-center text-xs text-danger animate-fadeIn" role="alert">
              {error}
            </p>
          )}

          {/* Primary: PLAY */}
          <button
            type="submit"
            disabled={loading || username.trim().length < 2}
            className="w-full py-3.5 rounded-lg font-display font-semibold text-base bg-accent hover:bg-accent-glow text-[#231b09] shadow-lg shadow-black/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#231b09]/40 border-t-[#231b09] rounded-full animate-spin" />
                Setting up...
              </>
            ) : (
              'Play'
            )}
          </button>

          {/* Secondary: PRACTICE */}
          <button
            type="button"
            onClick={openPractice}
            disabled={loading}
            className="w-full py-3 rounded-lg font-medium text-sm bg-surface hover:bg-surface-elevated border border-grid-line hover:border-accent/50 text-text-primary active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer"
          >
            Practice
          </button>
        </form>

        {/* Small link: HOW TO PLAY */}
        <button
          type="button"
          onClick={() => setIsHowToPlayOpen(true)}
          className="mt-5 text-xs text-text-muted hover:text-text-secondary underline underline-offset-4 decoration-text-muted/40 transition-colors cursor-pointer"
        >
          How to play
        </button>
      </main>

      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />

      <PracticeBotsModal
        isOpen={isPracticeModalOpen}
        onClose={() => setIsPracticeModalOpen(false)}
        onStartPractice={() => void handleStartPractice()}
        onDeployMultiplayer={() => {
          setIsPracticeModalOpen(false);
          if (username.trim().length >= 2) {
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
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
