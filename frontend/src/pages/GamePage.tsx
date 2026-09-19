import { GameHeader } from '../components/game/GameHeader';
import { GameBoard } from '../components/game/GameBoard';
import { TacticalHUD } from '../components/game/TacticalHUD';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { ActivityFeed } from '../components/game/ActivityFeed';
import { useGameState } from '../hooks/useGameState';
import type { Player } from '../types/player';

interface GamePageProps {
  player: Player;
  onSwitchPlayer: () => void;
}

export function GamePage({ player, onSwitchPlayer }: GamePageProps) {
  const {
    cells,
    leaderboard,
    playersMap,
    stats,
    loading,
    claimingCellId,
    onlineCount,
    activityFeed,
    lastClaimAnimation,
    statusMessage,
    connectionState,
    latencyMs,
    cooldown,
    claimCell,
    reloadState,
  } = useGameState(player);

  const currentUserRank = leaderboard.find((e) => e.id === player.id)?.rank;

  return (
    <div className="min-h-screen bg-grid-bg flex flex-col tactical-scanline">
      {/* Header */}
      <GameHeader
        connectionState={connectionState}
        latencyMs={latencyMs}
        onlineCount={onlineCount}
        claimedCells={stats.claimedCells}
        totalCells={stats.totalCells}
        onRefreshState={reloadState}
      />

      {/* Floating Status Notification Toast */}
      {statusMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold shadow-2xl border backdrop-blur-md flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-success/20 border-success text-success shadow-success/20'
                : statusMessage.type === 'warning'
                ? 'bg-warning/20 border-warning text-warning shadow-warning/20'
                : 'bg-danger/20 border-danger text-danger shadow-danger/20'
            }`}
          >
            {statusMessage.type === 'success' && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {statusMessage.type === 'warning' && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {statusMessage.type === 'error' && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Game Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-5">
        {/* Dominant Visual Centerpiece: The 50x50 GameBoard */}
        <section className="flex-1 min-w-0 flex flex-col relative" aria-label="Game Board">
          {loading && cells.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[460px] bg-surface/50 border border-grid-line/60 rounded-2xl">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-sm font-mono text-text-muted">
                INITIALIZING AUTHORITATIVE 50×50 GRID...
              </div>
            </div>
          ) : (
            <GameBoard
              cells={cells}
              currentUserId={player.id}
              playersMap={playersMap}
              claimingCellId={claimingCellId}
              lastClaimAnimation={lastClaimAnimation}
              onClaimCell={claimCell}
            />
          )}

          {/* Floating Real-Time Activity Feed at bottom-left */}
          <aside className="absolute bottom-5 left-5 z-20 max-w-xs hidden sm:block" aria-label="Live Telemetry Feed">
            <ActivityFeed items={activityFeed} />
          </aside>
        </section>

        {/* Tactical Control Sidebar: HUD & Live Leaderboard */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4" aria-label="Tactical Status and Leaderboard">
          <TacticalHUD
            player={player}
            rank={currentUserRank}
            totalCells={stats.totalCells}
            isCooldownReady={cooldown.isReady}
            cooldownProgress={cooldown.progress}
            remainingCooldownSeconds={cooldown.remainingSeconds}
            onSwitchPlayer={onSwitchPlayer}
          />

          <div className="flex-1">
            <Leaderboard
              entries={leaderboard}
              currentUserId={player.id}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
