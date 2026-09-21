interface CooldownBarProps {
  isReady: boolean;
  progress: number;
  remainingSeconds: string;
}

export function CooldownBar({ isReady, progress, remainingSeconds }: CooldownBarProps) {
  return (
    <div className="bg-surface-elevated/70 border border-grid-line rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-colors ${isReady ? 'bg-success' : 'bg-warning animate-soft-glow'}`}
          />
          <span className="text-sm font-medium text-text-primary">
            {isReady ? 'Ready to claim' : 'Cooling down'}
          </span>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${isReady ? 'text-success' : 'text-warning'}`}>
          {isReady ? 'Go' : `${remainingSeconds}s`}
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-grid-bg overflow-hidden border border-grid-line">
        <div
          style={{ width: `${Math.round(progress * 100)}%` }}
          className={`h-full transition-[width] duration-75 rounded-full ${isReady ? 'bg-success' : 'bg-accent'}`}
        />
      </div>
    </div>
  );
}
