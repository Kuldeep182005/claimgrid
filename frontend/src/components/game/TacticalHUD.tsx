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
  isCooldownReady,
  cooldownProgress,
  remainingCooldownSeconds,
  battleSession,
  isMyTurn = true,
  turnNumber,
}: TacticalHUDProps) {
  if (!player) return null;

  const activeTurnNumber = turnNumber ?? battleSession?.turnNumber;
  const players = battleSession?.players ?? [];
  const opponent = players.find((p) => p.id !== player.id);

  const totalClaimed = players.reduce((acc, p) => acc + p.cellsClaimed, 0);

  // Lead calculation for 1v1
  const cellDiff = opponent ? player.cellsClaimed - opponent.cellsClaimed : 0;
  const leadLabel =
    cellDiff > 0 ? `+${cellDiff} LEAD` : cellDiff < 0 ? `${Math.abs(cellDiff)} BEHIND` : 'TIED';

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl mx-auto">
      {/* 1v1 PLOT-Style Score Plates */}
      {battleSession && players.length === 2 && opponent ? (
        <div className="flex flex-col gap-2">
          {/* Main Plates Row */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            {/* YOU Plate */}
            <div
              className={[
                'bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard rounded-[6px] p-2 sm:p-2.5 flex items-center justify-between transition-all',
                isMyTurn ? 'ring-2 ring-[#E0A526]' : 'opacity-90',
              ].filter(Boolean).join(' ')}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-[2px] border border-[#1E1B18] shrink-0"
                  style={{ backgroundColor: player.color || '#E4572E' }}
                  title="Player 1 Ink (Solid)"
                />
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[11px] font-bold text-[#1E1B18] uppercase tracking-wide truncate">
                    {player.username}
                  </span>
                  <span className="text-[9px] text-[#6E675F] font-bold">YOU</span>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display font-extrabold text-2xl sm:text-3xl tabular-nums text-[#1E1B18]">
                  {player.cellsClaimed}
                </span>
                <span className="text-[9px] font-bold text-[#6E675F]">CELLS</span>
              </div>
            </div>

            {/* Center: Turn & Differential */}
            <div className="flex flex-col items-center justify-center px-1 sm:px-2 min-w-[72px]">
              <span className="font-mono text-[10px] font-bold text-[#1E1B18] bg-[#EDE7DC] px-2 py-0.5 rounded-[3px] border border-[#1E1B18]">
                {activeTurnNumber ? `TURN ${activeTurnNumber}` : 'VS'}
              </span>
              <span className="text-[10px] font-bold text-[#6E675F] mt-1 tabular-nums">
                {leadLabel}
              </span>
            </div>

            {/* OPPONENT Plate */}
            <div
              className={[
                'bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard rounded-[6px] p-2 sm:p-2.5 flex items-center justify-between transition-all',
                !isMyTurn && battleSession.status === 'ACTIVE' ? 'ring-2 ring-[#E0A526]' : 'opacity-90',
              ].filter(Boolean).join(' ')}
            >
              <div className="flex items-baseline gap-1">
                <span className="font-display font-extrabold text-2xl sm:text-3xl tabular-nums text-[#1E1B18]">
                  {opponent.cellsClaimed}
                </span>
                <span className="text-[9px] font-bold text-[#6E675F]">CELLS</span>
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-right">
                <span
                  className="w-3.5 h-3.5 rounded-[2px] border border-[#1E1B18] pattern-hatch shrink-0"
                  style={{ backgroundColor: opponent.color || '#1F3A5F' }}
                  title="Opponent Ink (Hatched)"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-[#1E1B18] uppercase tracking-wide truncate">
                    {opponent.username}
                  </span>
                  <span className="text-[9px] text-[#6E675F] font-bold">RIVAL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Territory Comparison Bar */}
          {totalClaimed > 0 && (
            <div className="w-full h-2 rounded-[2px] bg-[#FAF7F2] border border-[#1E1B18] overflow-hidden flex shadow-hard-sm">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${(player.cellsClaimed / totalClaimed) * 100}%`,
                  backgroundColor: player.color || '#E4572E',
                }}
              />
              <div
                className="h-full pattern-hatch transition-all duration-200"
                style={{
                  width: `${(opponent.cellsClaimed / totalClaimed) * 100}%`,
                  backgroundColor: opponent.color || '#1F3A5F',
                }}
              />
            </div>
          )}
        </div>
      ) : battleSession && players.length > 2 ? (
        /* Multi-player roster plates (4 players) */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {players.map((p, idx) => {
            const isSelf = p.id === player.id;
            const isTurn = battleSession.status === 'ACTIVE' && battleSession.currentPlayerId === p.id;
            return (
              <div
                key={p.id}
                className={[
                  'bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard rounded-[6px] p-2 flex items-center justify-between',
                  isTurn ? 'ring-2 ring-[#E0A526]' : 'opacity-90',
                ].filter(Boolean).join(' ')}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-3 h-3 rounded-[2px] border border-[#1E1B18] shrink-0 ${
                      idx === 0 ? '' : idx === 1 ? 'pattern-hatch' : idx === 2 ? 'pattern-dots' : 'pattern-stripes'
                    }`}
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-[11px] font-bold text-[#1E1B18] truncate">
                    {p.username}{isSelf && ' *'}
                  </span>
                </div>
                <span className="font-display font-extrabold text-lg tabular-nums text-[#1E1B18] ml-2">
                  {p.cellsClaimed}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        /* Practice / Solo mode Score Plate */
        <div className="bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard rounded-[6px] px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-[2px] border border-[#1E1B18] shrink-0"
              style={{ backgroundColor: player.color || '#E4572E' }}
            />
            <span className="text-xs font-bold text-[#1E1B18] uppercase tracking-wide">
              {player.username}
            </span>
            <span className="text-[10px] font-bold text-[#6E675F] bg-[#EDE7DC] px-1.5 py-0.5 rounded border border-[#1E1B18]">
              PRACTICE
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-black text-2xl tabular-nums text-[#1E1B18]">
              {player.cellsClaimed}
            </span>
            <span className="text-[9px] font-bold text-[#6E675F]">CELLS</span>
          </div>
        </div>
      )}

      {/* Turn Status & Cooldown strip */}
      <div className="bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard-sm rounded-[6px] px-3 py-1.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isMyTurn ? 'bg-[#E4572E] animate-pulse' : 'bg-[#6E675F]'
            }`}
          />
          <span className="font-display font-bold text-xs tracking-wide uppercase text-[#1E1B18] truncate">
            {isMyTurn
              ? 'YOUR TURN — CLAIM A CELL'
              : battleSession?.status === 'ACTIVE'
              ? "OPPONENT'S TURN — WATCH THE BOARD"
              : 'READY — PICK A TILE'}
          </span>
        </div>

        <CooldownBar
          isReady={isCooldownReady}
          progress={cooldownProgress}
          remainingSeconds={remainingCooldownSeconds}
        />
      </div>
    </div>
  );
}
