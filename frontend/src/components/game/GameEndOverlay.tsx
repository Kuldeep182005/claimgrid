import type { Player } from '../../types/player';
import type { GameSession } from '../../types/game';

interface GameEndOverlayProps {
  player: Player;
  battleSession: GameSession;
  onReturnToLobby: () => void;
}

export function GameEndOverlay({ player, battleSession, onReturnToLobby }: GameEndOverlayProps) {
  const isVictory = battleSession.winnerId === player.id;
  const isDraw = battleSession.winnerId === null;

  const playerStats = battleSession.players.find((p) => p.id === player.id);
  const rivalStats = battleSession.players.find((p) => p.id !== player.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-end-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md bg-surface/95 border border-grid-line/90 rounded-2xl p-6 sm:p-8 shadow-2xl glow-accent text-center flex flex-col gap-6">
        {/* Outcome Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-2 bg-surface-elevated border border-grid-line shadow-inner">
            {isVictory ? (
              <span className="text-3xl">🏆</span>
            ) : isDraw ? (
              <span className="text-3xl">⚖️</span>
            ) : (
              <span className="text-3xl">💀</span>
            )}
          </div>

          <h2
            id="game-end-title"
            className={`text-3xl sm:text-4xl font-black font-mono tracking-wider uppercase ${
              isVictory ? 'text-success' : isDraw ? 'text-warning' : 'text-danger'
            }`}
          >
            {isVictory ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
          </h2>

          <p className="text-xs font-mono text-text-muted">
            {isVictory
              ? 'GRID SECURED • SECTOR DOMINANCE ACHIEVED'
              : isDraw
              ? 'STALEMATE • EQUAL TERRITORY CONTROL'
              : 'GRID OVERRUN • DEPLOY COUNTER-OFFENSIVE'}
          </p>
        </div>

        {/* Head-to-Head Final Stats */}
        <div className="grid grid-cols-2 gap-3 bg-surface-elevated/70 border border-grid-line/60 rounded-xl p-4">
          <div className="text-left space-y-1">
            <span className="text-[11px] font-mono text-text-muted uppercase">YOU</span>
            <div className="text-sm font-bold truncate text-text-primary">{player.username}</div>
            <div className="text-2xl font-black font-mono text-accent">
              {playerStats?.cellsClaimed ?? 0}
              <span className="text-xs font-normal text-text-muted ml-1">cells</span>
            </div>
          </div>

          <div className="text-right space-y-1 border-l border-grid-line/60 pl-3">
            <span className="text-[11px] font-mono text-text-muted uppercase">RIVAL</span>
            <div className="text-sm font-bold truncate text-text-primary">
              {rivalStats?.username ?? 'Opponent'}
            </div>
            <div className="text-2xl font-black font-mono text-text-secondary">
              {rivalStats?.cellsClaimed ?? 0}
              <span className="text-xs font-normal text-text-muted ml-1">cells</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onReturnToLobby}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wider uppercase bg-accent hover:bg-accent-glow text-white shadow-lg hover:shadow-accent/40 active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          RETURN TO LOBBY
        </button>
      </div>
    </div>
  );
}
