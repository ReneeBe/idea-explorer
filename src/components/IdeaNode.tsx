import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

export type IdeaNodeData = {
  concept: string;
  depth: number;
  isRoot?: boolean;
  isExpanding?: boolean;
  onExpand: (id: string) => void;
};

export function IdeaNode({ id, data, selected }: NodeProps) {
  const d = data as IdeaNodeData;

  if (d.isRoot) {
    return (
      <div
        className={`px-5 py-3 rounded-2xl border-2 text-center cursor-default select-none transition-all ${
          selected
            ? 'border-violet-400 bg-violet-950/60 shadow-lg shadow-violet-900/40'
            : 'border-violet-600 bg-violet-950/40'
        }`}
        style={{ minWidth: 120 }}
      >
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        <div className="text-sm font-semibold text-violet-200">{d.concept}</div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border text-center transition-all group ${
        d.isExpanding
          ? 'border-violet-500/50 bg-zinc-900/80 animate-pulse cursor-wait'
          : selected
          ? 'border-zinc-500 bg-zinc-800 shadow-md cursor-pointer'
          : 'border-zinc-700/80 bg-zinc-900/80 hover:border-zinc-500 hover:bg-zinc-800 cursor-pointer'
      }`}
      style={{ minWidth: 100, maxWidth: 160 }}
      onClick={() => !d.isExpanding && d.onExpand(id)}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      <div className="px-3 py-2.5">
        <div className="text-xs font-medium text-zinc-200 leading-snug">{d.concept}</div>
        {!d.isExpanding && (
          <div className="text-[10px] text-zinc-600 mt-1 group-hover:text-violet-500 transition-colors">
            click to expand
          </div>
        )}
        {d.isExpanding && (
          <div className="text-[10px] text-violet-500 mt-1">exploring...</div>
        )}
      </div>
    </div>
  );
}
