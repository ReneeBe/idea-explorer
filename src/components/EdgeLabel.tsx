import { BaseEdge, EdgeLabelRenderer, getStraightPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export type IdeaEdgeData = {
  relationship: string;
};

export function IdeaEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const d = data as IdeaEdgeData;
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#7c3aed' : '#3f3f46',
          strokeWidth: 1.5,
        }}
      />
      {d?.relationship && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="px-1.5 py-0.5 rounded text-[10px] text-zinc-500 bg-zinc-950 border border-zinc-800 whitespace-nowrap"
          >
            {d.relationship}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
