import type { ConnectionState } from '../../types/websocket';

interface ConnectionPillProps {
  state: ConnectionState;
  latencyMs: number | null;
}

export function ConnectionPill({ state }: ConnectionPillProps) {
  if (state === 'CONNECTED') return null;

  let dotColor = 'bg-[#E0A526]';
  let label = 'CONNECTING';

  if (state === 'RECONNECTING') {
    label = 'RECONNECTING';
  } else if (state === 'DISCONNECTED') {
    dotColor = 'bg-[#D13428]';
    label = 'OFFLINE';
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[#FAF7F2] border border-[#1E1B18] text-[10px] font-mono font-bold text-[#1E1B18] shadow-hard-sm">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor} animate-pulse`} />
      <span>{label}</span>
    </div>
  );
}
