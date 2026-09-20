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

      {/* Multi-Player / 2-4 Player Battle HUD */}
      {battleSession ? (
        <div className="flex flex-col gap-3">
          {/* Battle Header & Round Status */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
              COMMANDERS ({battleSession.players?.length ?? 1}/{battleSession.maxPlayers ?? 2})
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-elevated border border-grid-line/50 text-text-secondary">
              ROUND {activeTurnNumber ?? 1} / {battleSession.turnLimit ?? 40}
            </span>
          </div>

          {/* Dynamic Player Roster (Supports 2 or 4 Players) */}
          <div className="flex flex-col gap-1.5">
            {battleSession.players?.map((p) => {
              const isSelf = p.id === player.id;
              const isPlayerTurn = battleSession.status === 'ACTIVE' && battleSession.currentPlayerId === p.id;
              const score = p.score ?? p.cellsClaimed;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                    isPlayerTurn
                      ? isSelf
                        ? 'bg-success/15 border-success/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-warning/10 border-warning/50'
                      : isSelf
                      ? 'bg-surface-elevated/80 border-accent/40'
                      : 'bg-surface-elevated/40 border-grid-line/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-1 ring-white/20"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-text-primary truncate">
                          {p.username}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] font-mono font-black uppercase px-1 py-0.2 rounded bg-accent/20 text-accent border border-accent/30">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        {p.cellsClaimed} {p.cellsClaimed === 1 ? 'cell' : 'cells'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPlayerTurn && (
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isSelf
                            ? 'bg-success/20 text-success border border-success/40 animate-pulse'
                            : 'bg-warning/20 text-warning border border-warning/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelf ? 'bg-success animate-ping' : 'bg-warning'}`} />
                        {isSelf ? 'YOUR TURN' : 'ACTIVE'}
                      </span>
                    )}
                    <div className="text-right">
                      <div className="text-xs font-black font-mono text-text-primary">
                        {score} <span className="text-[9px] font-normal text-text-muted">PTS</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty slots placeholders if match is waiting */}
            {battleSession.status === 'WAITING' &&
              Array.from({ length: Math.max(0, (battleSession.maxPlayers ?? 2) - (battleSession.players?.length ?? 0)) }).map((_, idx) => (
                <div
                  key={`empty-slot-${idx}`}
                  className="flex items-center justify-between p-2 rounded-xl border border-dashed border-grid-line/60 bg-surface/20 text-text-muted text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-grid-line animate-pulse" />
                    <span>Slot {(battleSession.players?.length ?? 0) + idx + 1}: Waiting...</span>
                  </div>
                  <span className="text-[10px] text-text-muted/60 uppercase">OPEN</span>
                </div>
              ))}
          </div>

          {/* Multi-Segment Territory Dominance Bar */}
          <div className="space-y-1 mt-1">
            <div className="flex justify-between text-[10px] font-mono text-text-muted">
              <span>TERRITORY CONTROL</span>
              <span>{percentage}% OF 625</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-elevated overflow-hidden border border-grid-line/40 flex">
              {(() => {
                const totalClaimed = (battleSession.players ?? []).reduce((acc, p) => acc + p.cellsClaimed, 0);
                if (totalClaimed === 0) {
                  return (
                    <div
                      className="h-full w-full bg-grid-line/40"
                      title="No cells claimed yet"
                    />
                  );
                }
                return (battleSession.players ?? []).map((p) => {
                  const pct = (p.cellsClaimed / totalClaimed) * 100;
                  return (
                    <div
                      key={p.id}
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: p.color,
                      }}
                      title={`${p.username}: ${p.cellsClaimed} cells (${pct.toFixed(1)}%)`}
                    />
                  );
                });
              })()}
            </div>
          </div>

          {/* Prominent Turn Status Card */}
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
                  <span>WAITING FOR PLAYERS ({battleSession.players?.length ?? 1}/{battleSession.maxPlayers ?? 2})</span>
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
                  <span>
                    ⏳ {battleSession.players?.find((p) => p.id === battleSession.currentPlayerId)?.username?.toUpperCase() ?? 'OPPONENT'}'S TURN
                  </span>
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
