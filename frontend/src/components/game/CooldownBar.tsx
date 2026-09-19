interface CooldownBarProps {
  isReady: boolean;
  progress: number;
  remainingSeconds: string;
}

export function CooldownBar({ isReady, progress, remainingSeconds }: CooldownBarProps) {
  return (
    <div className="bg-surface-elevated/90 border border-grid-line/80 rounded-xl p-3 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span 
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              isReady ? 'bg-success animate-pulse glow-success' : 'bg-warning'
            }`} 
          />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">
            {isReady ? 'CLAIM CANNON: READY' : 'RECHARGING COOLDOWN'}
          </span>
        </div>

        <span className={`text-xs font-mono font-bold ${isReady ? 'text-success' : 'text-warning'}`}>
          {isReady ? 'READY' : `${remainingSeconds}s`}
        </span>
      </div>

      {/* High-tech tactical progress track */}
      <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-grid-line/40 relative">
        <div
          style={{ width: `${Math.round(progress * 100)}%` }}
          className={`h-full transition-all duration-75 rounded-full ${
            isReady 
              ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.7)]' 
              : 'bg-gradient-to-r from-accent to-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]'
          }`}
        />
      </div>
    </div>
  );
}
