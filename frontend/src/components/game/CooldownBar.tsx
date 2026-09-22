interface CooldownBarProps {
  isReady: boolean;
  progress: number;
  remainingSeconds: string;
}

export const CooldownBar = ({ isReady, progress, remainingSeconds }: CooldownBarProps) => {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px]">
      <div className="w-16 h-2 rounded-[2px] bg-[#FAF7F2] border border-[#1E1B18] overflow-hidden p-[1px]">
        <div
          style={{ width: `${Math.round(progress * 100)}%` }}
          className={`h-full transition-all duration-75 rounded-[1px] ${
            isReady ? 'bg-[#E4572E]' : 'bg-[#E0A526]'
          }`}
        />
      </div>
      <span className="tabular-nums font-bold text-[#1E1B18]">
        {isReady ? 'READY' : `${remainingSeconds}s`}
      </span>
    </div>
  );
};
