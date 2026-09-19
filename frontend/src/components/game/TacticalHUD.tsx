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
  isMyTurn,
  turnNumber,
  onSwitchPlayer,
}: TacticalHUDProps) {
  if (!player) return null;

  const percentage = totalCells > 0 ? ((player.cellsClaimed / totalCells) * 100).toFixed(1) : '0.0';

  const userStats = battleSession?.players?.find((p) => p.id === player.id);
  const rivalStats = battleSession?.players?.find((p) => p.id !== player.id);
  const userCells = userStats?.cellsClaimed ?? player.cellsClaimed;
  const rivalCells = rivalStats?.cellsClaimed ?? 0;
  const activeTurnNumber = turnNumber ?? battleSession?.turnNumber;

  return (
    <div className="bg-surface/80 border border-grid-line/80 hover:border-accent/40 rounded-2xl p-4 backdrop-blur-md shadow-xl flex flex-col gap-4 transition-all duration-200">
      {/* Commander Profile Header */}
      <div className="flex items-center justify-between pb-3 border-b border-grid-line/60">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white/20 hover:scale-105 transition-transform"
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
                className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
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
          className="text-xs font-mono text-text-muted hover:text-text-primary px-2.5 py-1.5 rounded-lg bg-surface-elevated/60 hover:bg-surface-elevated border border-grid-line/40 hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150 cursor-pointer"
        >
          Switch
        </button>
      </div>

      {/* Head-to-Head 2-Player Battle HUD (Part 17) */}
      {battleSession ? (
        <div className="flex flex-col gap-3">
          {/* YOU vs RIVAL Grid */}
          <div className="grid grid-cols-2 gap-2 bg-surface-elevated/60 border border-grid-line/50 rounded-xl p-3">
            {/* YOU */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }} />
                <span>YOU</span>
              </div>
              <div className="text-2xl font-black text-text-primary mt-1">
                {userCells}
                <span className="text-xs font-normal text-text-secondary ml-1">CELLS</span>
              </div>
              <div className="text-[10px] font-mono text-text-muted truncate">
                {player.username}
              </div>
            </div>

            {/* RIVAL */}
            <div className="flex flex-col text-right border-l border-grid-line/50 pl-2">
              <div className="flex items-center justify-end gap-1.5 text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <span>RIVAL</span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: rivalStats?.color ?? '#6B7280' }}
                />
              </div>
              <div className="text-2xl font-black text-text-primary mt-1">
                {rivalCells}
                <span className="text-xs font-normal text-text-secondary ml-1">CELLS</span>
              </div>
              <div className="text-[10px] font-mono text-text-muted truncate">
                {rivalStats?.username ?? (battleSession.status === 'WAITING' ? 'Waiting...' : 'Opponent')}
              </div>
            </div>
          </div>

          {/* Territory Dominance Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-text-muted">
              <span>TERRITORY CONTROL</span>
              <span>{percentage}% OF 625</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden border border-grid-line/40 flex">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${userCells + rivalCells > 0 ? (userCells / (userCells + rivalCells)) * 100 : 50}%`,
                  backgroundColor: player.color,
                }}
              />
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${userCells + rivalCells > 0 ? (rivalCells / (userCells + rivalCells)) * 100 : 50}%`,
                  backgroundColor: rivalStats?.color ?? '#374151',
                }}
              />
            </div>
          </div>

          {/* Turn Status Card */}
          <div
            className={`p-3 rounded-xl border font-mono text-xs flex items-center justify-between transition-all duration-200 ${
              battleSession.status === 'WAITING'
                ? 'bg-accent/10 border-accent/30 text-accent'
                : battleSession.status === 'FINISHED'
                ? 'bg-surface-elevated border-grid-line text-text-muted'
                : isMyTurn
                ? 'bg-success/15 border-success/50 text-success shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-warning/10 border-warning/30 text-warning'
            }`}
          >
            <div className="flex items-center gap-2 font-bold tracking-wider">
              {battleSession.status === 'WAITING' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span>WAITING FOR RIVAL</span>
                </>
              ) : battleSession.status === 'FINISHED' ? (
                <>
                  <span>🏁 BATTLE CONCLUDED</span>
                </>
              ) : isMyTurn ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-success animate-ping" />
                  <span>⚡ YOUR TURN</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <span>⏳ RIVAL TURN</span>
                </>
              )}
            </div>

            {activeTurnNumber !== undefined && battleSession.status === 'ACTIVE' && (
              <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-surface-elevated border border-grid-line/50">
                TURN {activeTurnNumber}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Legacy Solo / Global Grid Stats */
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-elevated/70 hover:bg-surface-elevated border border-grid-line/50 hover:border-accent/50 rounded-xl p-3 hover:-translate-y-0.5 transition-all duration-150 shadow-sm">
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

          <div className="bg-surface-elevated/70 hover:bg-surface-elevated border border-grid-line/50 hover:border-accent/50 rounded-xl p-3 hover:-translate-y-0.5 transition-all duration-150 shadow-sm">
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
      )}

      {/* Cooldown Visualizer */}
      <CooldownBar
        isReady={isCooldownReady}
        progress={cooldownProgress}
        remainingSeconds={remainingCooldownSeconds}
      />
    </div>
  );
}
