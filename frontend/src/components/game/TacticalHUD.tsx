import { CooldownBar } from './CooldownBar';
import type { Player } from '../../types/player';
import type { GameSession } from '../../types/game';

interface TacticalHUDProps {
  player: Player | null;
  rank?: number;
  totalCells: number;
  isCooldownReady: boolean;
  cooldownProgress: number;
  remainingCooldownSeconds: string;
  battleSession?: GameSession | null;
  isMyTurn?: boolean;
  turnNumber?: number;
  onSwitchPlayer: () => void;
}

export function TacticalHUD({
  player,
  rank,
  totalCells,
  isCooldownReady,
  cooldownProgress,
  remainingCooldownSeconds,
  battleSession,
  turnNumber,
  onSwitchPlayer,
}: TacticalHUDProps) {
  if (!player) return null;

  const percentage = totalCells > 0 ? ((player.cellsClaimed / totalCells) * 100).toFixed(1) : '0.0';
  const activeTurnNumber = turnNumber ?? battleSession?.turnNumber;

  return (
    <div className="bg-surface border border-grid-line rounded-2xl p-4 flex flex-col gap-4 shadow-lg shadow-black/20">
      {/* Profile */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-semibold text-white/95 ring-2 ring-white/10"
            style={{ backgroundColor: player.color }}
          >
            {player.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-text-muted">Playing as</div>
            <div className="font-display font-semibold text-base text-text-primary">{player.username}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwitchPlayer}
          className="text-sm text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg bg-surface-elevated/60 hover:bg-surface-elevated border border-grid-line hover:border-accent/50 active:scale-95 transition-all cursor-pointer"
        >
          Switch
        </button>
      </div>

      {battleSession ? (
        <div className="flex items-center justify-between rounded-xl bg-surface-elevated/60 border border-grid-line px-3.5 py-3">
          <div>
            <div className="text-xs text-text-muted">Your territory</div>
            <div className="font-display text-2xl font-bold text-text-primary tabular-nums">
              {player.cellsClaimed}
              <span className="text-sm font-normal text-text-secondary ml-1">
                cell{player.cellsClaimed === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          {battleSession.status === 'ACTIVE' && activeTurnNumber !== undefined && (
            <div className="text-right">
              <div className="text-xs text-text-muted">Round</div>
              <div className="font-display text-2xl font-bold text-accent tabular-nums">
                {activeTurnNumber}
                {battleSession.turnLimit ? (
                  <span className="text-sm font-normal text-text-muted">/{battleSession.turnLimit}</span>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-elevated/60 border border-grid-line rounded-xl p-3">
            <div className="text-xs text-text-muted">Cells</div>
            <div className="font-display text-2xl font-bold text-text-primary mt-0.5 tabular-nums">
              {player.cellsClaimed}
            </div>
            <div className="text-xs text-accent mt-0.5">{percentage}% of the map</div>
          </div>
          <div className="bg-surface-elevated/60 border border-grid-line rounded-xl p-3">
            <div className="text-xs text-text-muted">Rank</div>
            <div className="font-display text-2xl font-bold text-accent mt-0.5 tabular-nums">
              #{rank !== undefined ? rank : '—'}
            </div>
            <div className="text-xs text-text-muted mt-0.5">on the board</div>
          </div>
        </div>
      )}

      <CooldownBar
        isReady={isCooldownReady}
        progress={cooldownProgress}
        remainingSeconds={remainingCooldownSeconds}
      />
    </div>
  );
}
