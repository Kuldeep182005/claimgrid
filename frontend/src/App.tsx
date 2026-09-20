import { useState, useEffect } from 'react';
import { JoinScreen } from './components/Lobby/JoinScreen';
import { GamePage } from './pages/GamePage';
import { api } from './services/api';
import type { Player } from './types/player';
import type { GameSession } from './types/game';

const STORAGE_KEY = 'claimgrid_player';
const BATTLE_KEY = 'claimgrid_battle';

function getInitialPlayer(): Player | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Player;
      if (parsed && parsed.id && parsed.username) {
        return parsed;
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

function getInitialBattle(): GameSession | null {
  try {
    const stored = sessionStorage.getItem(BATTLE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as GameSession;
      if (parsed && parsed.gameId) {
        return parsed;
      }
    }
  } catch {
    sessionStorage.removeItem(BATTLE_KEY);
  }
  return null;
}

function App() {
  const [player, setPlayer] = useState<Player | null>(getInitialPlayer);
  const [battle, setBattle] = useState<GameSession | null>(getInitialBattle);

  // Reconcile stored battle on initial mount
  useEffect(() => {
    const battleId = battle?.gameId;
    if (!battleId) return;

    api.fetchBattleState(battleId)
      .then((state) => {
        setBattle({
          gameId: state.gameId,
          code: state.code,
          status: state.status,
          playerCount: state.players.length,
          currentPlayerId: state.currentPlayerId,
          turnNumber: state.turnNumber,
          turnLimit: state.turnLimit,
          player1Score: state.player1Score,
          player2Score: state.player2Score,
          winnerId: state.winnerId,
          startedAt: state.startedAt,
          finishedAt: state.finishedAt,
          practice: state.practice,
          players: state.players,
        });
      })
      .catch(() => {
        sessionStorage.removeItem(BATTLE_KEY);
        setBattle(null);
      });
  }, [battle?.gameId]);

  const handleStartBattle = (activePlayer: Player, session: GameSession) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activePlayer));
      sessionStorage.setItem(BATTLE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
    setPlayer(activePlayer);
    setBattle(session);
  };

  const handleReturnToLobby = async () => {
    if (battle?.practice && player) {
      try {
        await api.endPracticeGame(battle.gameId, player.id);
      } catch (error: unknown) {
        console.error('Failed to stop practice battle:', error);
      }
    }
    try {
      sessionStorage.removeItem(BATTLE_KEY);
    } catch {
      // ignore
    }
    setBattle(null);
  };

  const handleSwitchPlayer = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(BATTLE_KEY);
    } catch {
      // ignore
    }
    setPlayer(null);
    setBattle(null);
  };

  return (
    <>
      {player && battle ? (
        <GamePage
          player={player}
          battle={battle}
          onReturnToLobby={handleReturnToLobby}
          onSwitchPlayer={handleSwitchPlayer}
        />
      ) : (
        <JoinScreen
          savedPlayer={player}
          onStartBattle={handleStartBattle}
          onSwitchPlayer={handleSwitchPlayer}
        />
      )}
    </>
  );
}

export default App;
