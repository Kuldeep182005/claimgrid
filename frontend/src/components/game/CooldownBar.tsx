interface CooldownBarProps {
  isReady: boolean;
  progress: number;
  remainingSeconds: string;
}

export function CooldownBar({ isReady, progress, remainingSeconds }: CooldownBarProps) {
  return (
    <div className="bg-surface-elevated/90 border border-grid-line/80 hover:border-accent/40 rounded-xl p-3.5 shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span 
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              isReady ? 'bg-success animate-pulse glow-success' : 'bg-warning animate-pulse'
            }`} 
          />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary flex items-center gap-1">
            {isReady ? (
              <>
                <span className="text-success">⚡</span>
                <span>CLAIM CANNON</span>
              </>
            ) : (
              <span>CLAIM CANNON</span>
            )}
          </span>
        </div>

        <span className={`text-xs font-mono font-black tracking-wide ${isReady ? 'text-success' : 'text-warning'}`}>
          {isReady ? '⚡ READY' : `${remainingSeconds} SEC`}
        </span>
      </div>

      {/* High-tech tactical progress track */}
      <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-grid-line/50 relative">
        <div
          style={{ width: `${Math.round(progress * 100)}%` }}
          className={`h-full transition-all duration-75 rounded-full ${
            isReady
              ? 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.8)]'
              : 'bg-gradient-to-r from-accent to-warning shadow-[0_0_8px_rgba(245,158,11,0.6)]'
          }`}
        />
      </div>
    </div>
  );
}
