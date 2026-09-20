import { useState } from 'react';
import { GameHeader } from '../components/game/GameHeader';
import { GameBoard } from '../components/game/GameBoard';
import { TacticalHUD } from '../components/game/TacticalHUD';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { ActivityFeed } from '../components/game/ActivityFeed';
import { CommsPanel } from '../components/game/CommsPanel';
import { HowToPlayModal } from '../components/Lobby/HowToPlayModal';
import { GameEndOverlay } from '../components/game/GameEndOverlay';
import { useGameState } from '../hooks/useGameState';
import type { Player } from '../types/player';
import type { GameSession } from '../types/game';

interface GamePageProps {
  player: Player;
  battle?: GameSession | null;
  onReturnToLobby?: () => void;
  onSwitchPlayer: () => void;
}

export function GamePage({ player, battle, onReturnToLobby, onSwitchPlayer }: GamePageProps) {
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  const {
    cells,
    leaderboard,
    playersMap,
    stats,
    battleSession,
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
    chatMessages,
    reactionAnimation,
    sendChatMessage,
    sendReaction,
  } = useGameState(player, battle?.gameId);

  const currentSession = battleSession ?? battle ?? null;
  const isMyTurn = currentSession
    ? currentSession.status === 'ACTIVE' && currentSession.currentPlayerId === player.id
    : true;

  const activePlayerName = currentSession?.currentPlayerId
    ? playersMap.get(currentSession.currentPlayerId)?.username ??
      currentSession.players?.find((p) => p.id === currentSession.currentPlayerId)?.username
    : undefined;

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
        battleCode={currentSession?.code}
        turnNumber={currentSession?.turnNumber}
        isMyTurn={isMyTurn}
        onRefreshState={reloadState}
        onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
        onReturnToLobby={onReturnToLobby}
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
        {/* Dominant Visual Centerpiece: The 25x25 (or 50x50) GameBoard */}
        <section className="flex-1 min-w-0 flex flex-col relative" aria-label="Game Board">
          {/* First-Time Player Tactical Directive Banner */}
          {player.cellsClaimed === 0 && !currentSession && (
            <div className="mb-3 px-4 py-2.5 rounded-xl bg-accent/15 border border-accent/40 backdrop-blur-md flex items-center justify-between gap-3 text-xs font-mono text-accent-glow animate-fadeIn shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping shrink-0" />
                <span className="font-bold text-text-primary uppercase tracking-wider">TACTICAL DIRECTIVE:</span>
                <span>SELECT AN UNCLAIMED SECTOR TO DEPLOY YOUR FIRST CLAIM</span>
              </div>
              <span className="text-[11px] text-text-muted hidden md:inline font-sans">
                (Click any dark cell to start)
              </span>
            </div>
          )}

          {loading && cells.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[460px] bg-surface/50 border border-grid-line/60 rounded-2xl">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-sm font-mono text-text-muted">
                {currentSession ? 'INITIALIZING AUTHORITATIVE 25×25 GRID...' : 'INITIALIZING AUTHORITATIVE GRID...'}
              </div>
            </div>
          ) : (
            <GameBoard
              cells={cells}
              currentUserId={player.id}
              playersMap={playersMap}
              claimingCellId={claimingCellId}
              lastClaimAnimation={lastClaimAnimation}
              highlightedOwnerId={hoveredPlayerId}
              isMyTurn={isMyTurn}
              gameStatus={currentSession?.status}
              activePlayerName={activePlayerName}
              playerCount={currentSession?.players?.length ?? 1}
              maxPlayers={currentSession?.maxPlayers ?? 2}
              onClaimCell={claimCell}
            />
          )}
        </section>

        {/* Tactical Control Sidebar: HUD, Live Leaderboard & Live Battlefield Telemetry */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4" aria-label="Tactical Status and Leaderboard">
          <TacticalHUD
            player={player}
            rank={currentUserRank}
            totalCells={stats.totalCells}
            isCooldownReady={cooldown.isReady}
            cooldownProgress={cooldown.progress}
            remainingCooldownSeconds={cooldown.remainingSeconds}
            battleSession={currentSession}
            isMyTurn={isMyTurn}
            turnNumber={currentSession?.turnNumber}
            onSwitchPlayer={onSwitchPlayer}
          />

          <div className="shrink-0">
            <Leaderboard
              entries={leaderboard}
              currentUserId={player.id}
              onHoverPlayer={setHoveredPlayerId}
            />
          </div>

          <CommsPanel
            messages={chatMessages}
            reaction={reactionAnimation}
            currentPlayerId={player.id}
            disabled={!currentSession || currentSession.practice || currentSession.status !== 'ACTIVE'}
            onSendMessage={sendChatMessage}
            onSendReaction={sendReaction}
          />

          {/* Dedicated Live Battlefield Telemetry Panel (non-overlapping with grid) */}
          <div className="p-3 rounded-2xl bg-surface/50 border border-grid-line/60 backdrop-blur-sm shadow-lg pointer-events-none select-none">
            <ActivityFeed items={activityFeed} />
          </div>
        </aside>
      </main>

      {/* In-Game How To Play Modal */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      {/* Game End Victory/Defeat Overlay (Part 18) */}
      {currentSession && currentSession.status === 'FINISHED' && (
        <GameEndOverlay
          player={player}
          battleSession={currentSession}
          onReturnToLobby={onReturnToLobby ?? onSwitchPlayer}
        />
      )}
    </div>
  );
}
