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

  const isBattle = !!currentSession;
  const isWaiting = currentSession?.status === 'WAITING';

  return (
    <div className="min-h-screen bg-[#F2EDE4] text-[#1E1B18] flex flex-col font-sans select-none">
      {/* Printed tabletop header */}
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

      {/* Status banner toast — restrained printed notification */}
      {statusMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className={[
              'px-3.5 py-1.5 rounded-[4px] border-2 border-[#1E1B18] shadow-hard text-xs font-mono font-bold',
              statusMessage.type === 'success'
                ? 'bg-[#EDE7DC] text-[#2A6F4E]'
                : statusMessage.type === 'warning'
                ? 'bg-[#EDE7DC] text-[#D97724]'
                : 'bg-[#EDE7DC] text-[#D13428]',
            ].join(' ')}
          >
            {statusMessage.text}
          </div>
        </div>
      )}

      {/* Main Board Arena */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col gap-3 sm:gap-4">
        {/* Waiting lobby banner */}
        {isWaiting && (
          <div className="bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard-sm rounded-[6px] py-2 px-4 text-center text-xs font-display font-bold text-[#1E1B18] animate-pulse">
            WAITING FOR OPPONENT TO JOIN ({currentSession?.players?.length ?? 1}/{currentSession?.maxPlayers ?? 2})…
          </div>
        )}

        {/* Score & Territory Plates (dominant above the board) */}
        <TacticalHUD
          player={player}
          rank={leaderboard.find((e) => e.id === player.id)?.rank}
          totalCells={stats.totalCells}
          isCooldownReady={cooldown.isReady}
          cooldownProgress={cooldown.progress}
          remainingCooldownSeconds={cooldown.remainingSeconds}
          battleSession={currentSession}
          isMyTurn={isMyTurn}
          turnNumber={currentSession?.turnNumber}
          onSwitchPlayer={onSwitchPlayer}
        />

        {/* The Grid — Visual Centerpiece */}
        <section className="flex-1 min-w-0 flex flex-col items-center justify-center my-auto" aria-label="Game Board">
          {loading && cells.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[380px]">
              <span className="font-mono text-xs font-bold text-[#6E675F] bg-[#FAF7F2] px-3 py-1.5 border border-[#1E1B18] shadow-hard-sm rounded-[4px]">
                INITIALIZING BOARD TILES…
              </span>
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

        {/* Below the board: Secondary Tournament Roster & Comms */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto w-full items-start">
          {/* Leaderboard — shown in lobby or >2 players */}
          {(!isBattle || (currentSession?.players?.length ?? 0) > 2) && (
            <div className="w-full sm:w-1/2">
              <Leaderboard
                entries={leaderboard}
                currentUserId={player.id}
                onHoverPlayer={setHoveredPlayerId}
              />
            </div>
          )}

          {/* Comms & Activity */}
          <div className="flex flex-col gap-2.5 w-full flex-1">
            {isBattle && (
              <CommsPanel
                messages={chatMessages}
                reaction={reactionAnimation}
                currentPlayerId={player.id}
                disabled={!currentSession || currentSession.practice || currentSession.status !== 'ACTIVE'}
                onSendMessage={sendChatMessage}
                onSendReaction={sendReaction}
              />
            )}

            <ActivityFeed items={activityFeed} />
          </div>
        </div>
      </main>

      {/* Rules Modal */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      {/* Game End Overlay */}
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
