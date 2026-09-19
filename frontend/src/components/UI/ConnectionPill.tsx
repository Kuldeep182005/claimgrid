import type { ConnectionState } from '../../types/websocket';

interface ConnectionPillProps {
  state: ConnectionState;
  latencyMs: number | null;
}

export function ConnectionPill({ state, latencyMs }: ConnectionPillProps) {
  let dotColor = 'bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]';
  let label = 'LIVE';
  let badgeColor = 'border-success/30 bg-success/10 text-success';

  if (state === 'CONNECTING') {
    dotColor = 'bg-warning animate-ping';
    label = 'CONNECTING';
    badgeColor = 'border-warning/30 bg-warning/10 text-warning';
  } else if (state === 'RECONNECTING') {
    dotColor = 'bg-warning animate-pulse';
    label = 'RECONNECTING';
    badgeColor = 'border-warning/40 bg-warning/10 text-warning';
  } else if (state === 'DISCONNECTED') {
    dotColor = 'bg-danger';
    label = 'OFFLINE';
    badgeColor = 'border-danger/30 bg-danger/10 text-danger';
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-mono font-medium shadow-sm transition-all ${badgeColor}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span>{label}</span>
      {state === 'CONNECTED' && latencyMs !== null && (
        <span className="text-[10px] opacity-75 font-normal">
          {latencyMs}ms
        </span>
      )}
    </div>
  );
}
