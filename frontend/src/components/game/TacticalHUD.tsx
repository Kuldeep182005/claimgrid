import { CooldownBar } from './CooldownBar';
import type { Player } from '../../types/player';

interface TacticalHUDProps {
  player: Player | null;
  rank?: number;
  totalCells: number;
  isCooldownReady: boolean;
  cooldownProgress: number;
  remainingCooldownSeconds: string;
  onSwitchPlayer: () => void;
}

export function TacticalHUD({
  player,
  rank,
  totalCells,
  isCooldownReady,
  cooldownProgress,
  remainingCooldownSeconds,
  onSwitchPlayer,
}: TacticalHUDProps) {
  if (!player) return null;

  const percentage = totalCells > 0 ? ((player.cellsClaimed / totalCells) * 100).toFixed(2) : '0.00';

  return (
    <div className="bg-surface/80 border border-grid-line/80 rounded-2xl p-4 backdrop-blur-md shadow-xl flex flex-col gap-4">
      {/* Commander Profile Card */}
      <div className="flex items-center justify-between pb-3 border-b border-grid-line/60">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white/20"
            style={{ backgroundColor: player.color }}
          >
            {player.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
              COMMANDER
            </div>
            <div className="font-bold text-base text-text-primary flex items-center gap-2">
              {player.username}
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: player.color }}
                title="Faction Color"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwitchPlayer}
          title="Switch Commander"
          className="text-xs font-mono text-text-muted hover:text-text-primary px-2 py-1 rounded bg-surface-elevated/60 hover:bg-surface-elevated border border-grid-line/40 transition-colors cursor-pointer"
        >
          Switch
        </button>
      </div>

      {/* Territory & Ranking Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-elevated/70 border border-grid-line/50 rounded-xl p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            TERRITORY
          </div>
          <div className="text-2xl font-black text-text-primary mt-0.5">
            {player.cellsClaimed}
            <span className="text-xs font-normal text-text-secondary ml-1">CELLS</span>
          </div>
          <div className="text-[10px] font-mono text-accent mt-0.5">
            {percentage}% of world
          </div>
        </div>

        <div className="bg-surface-elevated/70 border border-grid-line/50 rounded-xl p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            GRID RANK
          </div>
          <div className="text-2xl font-black text-text-primary mt-0.5 flex items-baseline gap-1">
            <span className="text-warning">#{rank !== undefined ? rank : '-'}</span>
          </div>
          <div className="text-[10px] font-mono text-text-muted mt-0.5">
            Leaderboard standing
          </div>
        </div>
      </div>

      {/* Cooldown Visualizer */}
      <CooldownBar
        isReady={isCooldownReady}
        progress={cooldownProgress}
        remainingSeconds={remainingCooldownSeconds}
      />
    </div>
  );
}
