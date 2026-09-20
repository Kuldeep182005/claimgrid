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

  const rankedPlayers = [...(battleSession.players ?? [])].sort(
    (a, b) => (b.score ?? b.cellsClaimed) - (a.score ?? a.cellsClaimed)
  );

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

        {/* Final Standings (Supports 2 or 4 Players) */}
        <div className="flex flex-col gap-2 bg-surface-elevated/70 border border-grid-line/60 rounded-xl p-4">
          <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider text-left pb-1 border-b border-grid-line/40">
            FINAL STANDINGS
          </div>
          <div className="flex flex-col gap-2">
            {rankedPlayers.map((p, idx) => {
              const isSelf = p.id === player.id;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '4️⃣';
              const score = p.score ?? p.cellsClaimed;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                    isSelf
                      ? 'bg-surface-elevated border-accent/60 shadow-sm'
                      : 'bg-surface/50 border-grid-line/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{medal}</span>
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-1 ring-white/20"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="font-bold text-xs text-text-primary truncate">
                        {p.username}
                      </span>
                      {isSelf && (
                        <span className="text-[9px] font-mono font-black uppercase px-1 py-0.2 rounded bg-accent/20 text-accent border border-accent/30">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-mono text-text-muted">
                      {p.cellsClaimed} {p.cellsClaimed === 1 ? 'cell' : 'cells'}
                    </span>
                    <span className="font-black font-mono text-xs text-accent">
                      {score} PTS
                    </span>
                  </div>
                </div>
              );
            })}
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
