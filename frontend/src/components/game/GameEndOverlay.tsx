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

  const opponent = rankedPlayers.find((p) => p.id !== player.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-end-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B18]/40 animate-fadeIn"
    >
      {/* Tactile printed result plate — keeps board clearly visible behind */}
      <div className="relative w-full max-w-sm bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard-xl rounded-[8px] p-6 text-center flex flex-col gap-5">
        {/* Outcome Header */}
        <div>
          <span className="font-mono text-[10px] font-bold text-[#6E675F] tracking-wider uppercase">
            MATCH CONCLUDED
          </span>
          <h2
            id="game-end-title"
            className="font-display text-4xl font-extrabold tracking-tight text-[#1E1B18] mt-1"
          >
            {isVictory ? 'YOU WIN' : isDraw ? 'DRAW' : 'GAME OVER'}
          </h2>
          <p className="text-xs text-[#6E675F] mt-1">
            {isVictory
              ? 'Territory conquered. Full grid control secured.'
              : isDraw
              ? 'Contested battleground ended in a stalemate.'
              : 'Opponent claimed the majority share of the board.'}
          </p>
        </div>

        {/* Territory Comparison Box */}
        <div className="bg-[#EDE7DC] border-2 border-[#1E1B18] rounded-[6px] p-3 flex flex-col gap-2">
          {/* Your Territory */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-[2px] border border-[#1E1B18] shrink-0"
                style={{ backgroundColor: player.color || '#E4572E' }}
              />
              <span className="text-xs font-bold text-[#1E1B18]">Your Territory</span>
            </div>
            <span className="font-display font-extrabold text-xl tabular-nums text-[#1E1B18]">
              {player.cellsClaimed} <span className="text-[10px] text-[#6E675F]">cells</span>
            </span>
          </div>

          {/* Opponent Territory */}
          {opponent && (
            <div className="flex items-center justify-between border-t border-[#DCD5C8] pt-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-[2px] border border-[#1E1B18] pattern-hatch shrink-0"
                  style={{ backgroundColor: opponent.color || '#1F3A5F' }}
                />
                <span className="text-xs font-bold text-[#1E1B18] truncate max-w-[120px]">
                  {opponent.username}
                </span>
              </div>
              <span className="font-display font-extrabold text-xl tabular-nums text-[#1E1B18]">
                {opponent.cellsClaimed} <span className="text-[10px] text-[#6E675F]">cells</span>
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onReturnToLobby}
            className="btn-tactile w-full py-2.5 rounded-[6px] font-display font-black text-sm bg-[#E4572E] text-white tracking-wide cursor-pointer"
          >
            PLAY AGAIN
          </button>
          <button
            type="button"
            onClick={onReturnToLobby}
            className="btn-tactile w-full py-2 rounded-[6px] font-display font-bold text-xs bg-[#FAF7F2] text-[#1E1B18] cursor-pointer"
          >
            HOME
          </button>
        </div>
      </div>
    </div>
  );
}
