import type { ActivityItem } from '../../hooks/useGameState';

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-[#FAF7F2] border-2 border-[#1E1B18] shadow-hard-sm rounded-[6px] p-2.5 flex flex-col gap-1 text-[11px] select-none w-full">
      <div className="text-[10px] font-mono font-bold text-[#6E675F] uppercase tracking-wider pb-1 border-b border-[#DCD5C8]">
        Match Event Log
      </div>
      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="text-[#1E1B18] flex items-center gap-1.5 animate-fadeIn font-mono text-[10px]"
          >
            <span
              className="w-1.5 h-1.5 rounded-[1px] border border-[#1E1B18] shrink-0"
              style={{
                backgroundColor:
                  item.type === 'CLAIM'
                    ? '#E4572E'
                    : item.color || '#1F3A5F',
              }}
            />
            <span className="truncate">{item.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
