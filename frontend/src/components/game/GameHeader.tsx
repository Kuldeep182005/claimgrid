import { useState } from 'react';
import { ConnectionPill } from '../UI/ConnectionPill';
import { sound } from '../../services/sound';
import { Volume2Icon, VolumeXIcon, RefreshIcon, CopyIcon, CheckIcon, BookOpenIcon, LogOutIcon } from '../UI/Icons';
import type { ConnectionState } from '../../types/websocket';

interface GameHeaderProps {
  connectionState: ConnectionState;
  latencyMs: number | null;
  onlineCount: number;
  claimedCells: number;
  totalCells: number;
  battleCode?: string;
  turnNumber?: number;
  isMyTurn?: boolean;
  onRefreshState: () => void;
  onOpenHowToPlay?: () => void;
  onReturnToLobby?: () => void;
}

export function GameHeader({
  connectionState,
  latencyMs,
  battleCode,
  onRefreshState,
  onOpenHowToPlay,
  onReturnToLobby,
}: GameHeaderProps) {
  const [isMuted, setIsMuted] = useState<boolean>(sound.isMuted());
  const [copied, setCopied] = useState<boolean>(false);

  const handleToggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      sound.playCooldownReady();
    }
  };

  const handleCopyCode = () => {
    if (!battleCode) return;
    navigator.clipboard.writeText(battleCode);
    setCopied(true);
    sound.playClaimSuccess();
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full px-4 py-3 flex items-center justify-between border-b-2 border-[#1E1B18] bg-[#FAF7F2]">
      {/* Brand & Match Code */}
      <div className="flex items-center gap-3">
        <span className="font-display font-black text-lg tracking-tight text-[#1E1B18]">
          CLAIMGRID
        </span>

        {battleCode && (
          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy match code"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] bg-[#EDE7DC] border border-[#1E1B18] text-xs font-mono font-bold text-[#1E1B18] shadow-hard-sm hover:bg-[#EAE3D5] cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]"
          >
            <span>{battleCode}</span>
            {copied ? <CheckIcon size={13} className="text-[#2A6F4E]" /> : <CopyIcon size={13} />}
          </button>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <ConnectionPill state={connectionState} latencyMs={latencyMs} />

        {onOpenHowToPlay && (
          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="btn-tactile-sm flex items-center gap-1 px-2.5 py-1 rounded-[5px] bg-[#FAF7F2] text-xs font-bold text-[#1E1B18] cursor-pointer"
            title="View Rules"
          >
            <BookOpenIcon size={14} />
            <span className="hidden sm:inline">Rules</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleSound}
          title={isMuted ? 'Unmute' : 'Mute'}
          className="btn-tactile-sm p-1.5 rounded-[5px] bg-[#FAF7F2] text-[#1E1B18] cursor-pointer"
        >
          {isMuted ? <VolumeXIcon size={15} /> : <Volume2Icon size={15} />}
        </button>

        <button
          type="button"
          onClick={onRefreshState}
          title="Sync Board"
          className="btn-tactile-sm p-1.5 rounded-[5px] bg-[#FAF7F2] text-[#1E1B18] cursor-pointer"
        >
          <RefreshIcon size={15} />
        </button>

        {onReturnToLobby && (
          <button
            type="button"
            onClick={onReturnToLobby}
            className="btn-tactile-sm flex items-center gap-1 px-2.5 py-1 rounded-[5px] bg-[#FAF7F2] text-xs font-bold text-[#1E1B18] cursor-pointer hover:bg-[#D13428] hover:text-white"
            title="Exit Match"
          >
            <LogOutIcon size={14} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        )}
      </div>
    </header>
  );
}
