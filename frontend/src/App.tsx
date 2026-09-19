import { useState } from 'react';
import { JoinScreen } from './components/Lobby/JoinScreen';
import { GamePage } from './pages/GamePage';
import type { Player } from './types/player';

const STORAGE_KEY = 'claimgrid_player';

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

function App() {
  const [player, setPlayer] = useState<Player | null>(getInitialPlayer);

  const handleJoined = (newPlayer: Player) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlayer));
    } catch {
      // ignore
    }
    setPlayer(newPlayer);
  };

  const handleSwitchPlayer = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setPlayer(null);
  };

  return (
    <>
      {player ? (
        <GamePage player={player} onSwitchPlayer={handleSwitchPlayer} />
      ) : (
        <JoinScreen onJoined={handleJoined} />
      )}
    </>
  );
}

export default App;
