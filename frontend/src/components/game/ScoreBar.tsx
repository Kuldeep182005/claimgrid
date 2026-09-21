import type { GameSession } from '../../types/game';

interface ScoreBarProps {
  session: GameSession;
  currentUserId: string;
  isMyTurn: boolean;
}

/**
 * The prominent score + turn display shown directly above the board.
 * Reads like "YOU 12 — 8 RIVAL" and always shows whose move it is.
 */
export function ScoreBar({ session, currentUserId, isMyTurn }: ScoreBarProps) {
  const players = session.players ?? [];
  const maxPlayers = session.maxPlayers ?? 2;
  const emptySlots = Math.max(0, maxPlayers - players.length);

  const activeName =
    players.find((p) => p.id === session.currentPlayerId)?.username;

  let turnText: string;
  if (session.status === 'WAITING') {
    turnText = `Waiting for players — ${players.length}/${maxPlayers}`;
  } else if (session.status === 'FINISHED') {
    turnText = 'Game over';
  } else if (isMyTurn) {
    turnText = 'Your turn — pick any empty cell';
  } else {
    turnText = activeName ? `${activeName}'s turn` : "Opponent's turn";
  }

  return (
    <div className="mb-3 rounded-2xl bg-surface border border-grid-line p-3 sm:p-4 flex flex-col gap-3 shadow-lg shadow-black/20">
      {/* Player scores */}
      <div className="flex flex-wrap items-stretch gap-2">
        {players.map((p) => {
          const isSelf = p.id === currentUserId;
          const isActive = session.status === 'ACTIVE' && session.currentPlayerId === p.id;
          const score = p.score ?? p.cellsClaimed;

          return (
            <div
              key={p.id}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 flex-1 min-w-[130px] border transition-all duration-200 ${
                isActive
                  ? 'bg-surface-elevated border-accent shadow-[0_0_0_1px_var(--color-accent)]'
                  : 'bg-surface-elevated/60 border-grid-line'
              }`}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-semibold text-sm text-white/95 shrink-0"
                style={{ backgroundColor: p.color }}
                aria-hidden="true"
              >
                {p.username.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {isSelf ? 'You' : p.username}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-soft-glow shrink-0" aria-label="active turn" />
                  )}
                </div>
                <span className="text-xs text-text-muted">
                  {p.cellsClaimed} {p.cellsClaimed === 1 ? 'cell' : 'cells'}
                </span>
              </div>
              <span
                key={score}
                className="font-display text-2xl font-bold text-text-primary animate-score-bump tabular-nums"
              >
                {score}
              </span>
            </div>
          );
        })}

        {session.status === 'WAITING' &&
          Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-[130px] border border-dashed border-grid-line text-text-muted"
            >
              <span className="w-8 h-8 rounded-lg bg-grid-cell shrink-0" />
              <span className="text-sm">Waiting…</span>
            </div>
          ))}
      </div>

      {/* Turn line */}
      <div
        className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
          session.status === 'ACTIVE' && isMyTurn
            ? 'bg-accent/15 text-accent'
            : 'bg-grid-bg text-text-secondary'
        }`}
        aria-live="polite"
      >
        {session.status === 'ACTIVE' && isMyTurn && (
          <span className="w-2 h-2 rounded-full bg-accent animate-soft-glow" />
        )}
        {turnText}
      </div>
    </div>
  );
}
