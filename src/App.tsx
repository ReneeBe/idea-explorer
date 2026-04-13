import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from '@xyflow/react';
import type { Node, Edge, Connection } from '@xyflow/react';
import { IdeaNode } from './components/IdeaNode';
import { IdeaEdge } from './components/EdgeLabel';
import { expandConcept, generateRootConcepts, generateFollowUpQuestions } from './lib/claude';

const NODE_TYPES = { idea: IdeaNode };
const EDGE_TYPES = { idea: IdeaEdge };

const RADII = [220, 300, 380];
const SPREAD = [Math.PI * 2, Math.PI * 1.4, Math.PI * 1.2];

function positionChildren(
  parentX: number,
  parentY: number,
  count: number,
  depth: number,
  parentAngle?: number
): { x: number; y: number }[] {
  const radius = RADII[Math.min(depth - 1, RADII.length - 1)];
  const spread = SPREAD[Math.min(depth - 1, SPREAD.length - 1)];
  const baseAngle = parentAngle !== undefined ? parentAngle : -Math.PI / 2;
  const start = baseAngle - spread / 2;
  const step = count > 1 ? spread / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => ({
    x: parentX + Math.cos(start + i * step) * radius,
    y: parentY + Math.sin(start + i * step) * radius,
  }));
}

let nodeIdCounter = 0;
const genId = () => `n${++nodeIdCounter}`;

export default function App() {
  const [topic, setTopic] = useState('');
  const [phase, setPhase] = useState<'setup' | 'questioning' | 'exploring'>('setup');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const expandingRef = useRef<Set<string>>(new Set());
  const conceptsRef = useRef<string[]>([]);
  const angleRef = useRef<Map<string, number>>(new Map());
  const topicRef = useRef('');

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleExpand = useCallback(
    async (nodeId: string) => {
      if (expandingRef.current.has(nodeId)) return;

      setNodes((currentNodes) => {
        const nodeEl = currentNodes.find((n) => n.id === nodeId);
        if (!nodeEl) return currentNodes;

        const concept = (nodeEl.data as { concept: string }).concept;
        const depth = (nodeEl.data as { depth: number }).depth;
        const parentAngle = angleRef.current.get(nodeId);

        expandingRef.current.add(nodeId);
        setError(null);

        expandConcept(concept, topicRef.current, conceptsRef.current)
          .then((concepts) => {
            const positions = positionChildren(
              nodeEl.position.x,
              nodeEl.position.y,
              concepts.length,
              depth + 1,
              parentAngle
            );

            const newNodes: Node[] = concepts.map((c, i) => {
              const id = genId();
              const angle = Math.atan2(
                positions[i].y - nodeEl.position.y,
                positions[i].x - nodeEl.position.x
              );
              angleRef.current.set(id, angle);
              conceptsRef.current.push(c.concept);
              return {
                id,
                type: 'idea',
                position: positions[i],
                data: { concept: c.concept, depth: depth + 1, onExpand: handleExpand },
              };
            });

            const newEdges: Edge[] = concepts.map((c, i) => ({
              id: `e${nodeId}-${newNodes[i].id}`,
              source: nodeId,
              target: newNodes[i].id,
              type: 'idea',
              data: { relationship: c.relationship },
              markerEnd: { type: MarkerType.Arrow, color: '#3f3f46', width: 12, height: 12 },
            }));

            setNodes((nds) => [...nds, ...newNodes]);
            setEdges((eds) => [...eds, ...newEdges]);
          })
          .catch((e) => {
            setError(e instanceof Error ? e.message : 'Failed to expand concept');
          })
          .finally(() => {
            expandingRef.current.delete(nodeId);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, isExpanding: false } } : n
              )
            );
          });

        return currentNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, isExpanding: true } } : n
        );
      });
    },
    [setNodes, setEdges]
  );

  const handleTopicSubmit = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const qs = await generateFollowUpQuestions(topic);
      setQuestions(qs);
      setAnswers(qs.map(() => ''));
      setPhase('questioning');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const handleBuildMap = async () => {
    setLoading(true);
    setError(null);
    topicRef.current = topic;
    conceptsRef.current = [topic];
    nodeIdCounter = 0;
    angleRef.current = new Map();

    const context = questions
      .map((q, i) => (answers[i].trim() ? `${q}\n${answers[i].trim()}` : ''))
      .filter(Boolean)
      .join('\n\n');

    try {
      const concepts = await generateRootConcepts(topic, context);

      const rootId = genId();
      const positions = positionChildren(0, 0, concepts.length, 1);

      const rootNode: Node = {
        id: rootId,
        type: 'idea',
        position: { x: 0, y: 0 },
        data: { concept: topic, depth: 0, isRoot: true, onExpand: () => {} },
      };

      const childNodes: Node[] = concepts.map((c, i) => {
        const id = genId();
        const angle = Math.atan2(positions[i].y, positions[i].x);
        angleRef.current.set(id, angle);
        conceptsRef.current.push(c.concept);
        return {
          id,
          type: 'idea',
          position: positions[i],
          data: { concept: c.concept, depth: 1, onExpand: handleExpand },
        };
      });

      const childEdges: Edge[] = concepts.map((c, i) => ({
        id: `e${rootId}-${childNodes[i].id}`,
        source: rootId,
        target: childNodes[i].id,
        type: 'idea',
        data: { relationship: c.relationship },
        markerEnd: { type: MarkerType.Arrow, color: '#3f3f46', width: 12, height: 12 },
      }));

      setNodes([rootNode, ...childNodes]);
      setEdges(childEdges);
      setPhase('exploring');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate ideas');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhase('setup');
    setNodes([]);
    setEdges([]);
    setTopic('');
    setQuestions([]);
    setAnswers([]);
    conceptsRef.current = [];
    angleRef.current = new Map();
    topicRef.current = '';
    setError(null);
  };

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">🧭 Idea Explorer</h1>
            <p className="text-sm text-zinc-500 mt-1">Explore concepts and how they relate</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Starting concept</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTopicSubmit()}
                placeholder="e.g. 50-day project ideas"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-900 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              onClick={handleTopicSubmit}
              disabled={!topic.trim() || loading}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {loading ? 'Thinking...' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'questioning') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">🧭 Idea Explorer</h1>
            <p className="text-sm text-zinc-500 mt-1">
              A bit more context helps build a better map
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">
            <div className="text-xs text-zinc-500 px-1">
              Topic: <span className="text-zinc-300 font-medium">{topic}</span>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="flex flex-col gap-2">
                <label className="text-sm text-zinc-300 leading-snug">{q}</label>
                <textarea
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder="Optional — skip if you'd rather just explore"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>
            ))}

            {error && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-900 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleBuildMap}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {loading ? 'Building map...' : 'Build map →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
        <Controls />
      </ReactFlow>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-300">{topic}</span>
          <button
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            new topic
          </button>
        </div>
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-none">
        <p className="text-xs text-zinc-600 bg-zinc-950/80 px-3 py-1.5 rounded-lg">
          Click any node to explore it further · drag to rearrange
        </p>
      </div>

      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <p className="text-xs text-red-400 bg-red-950/90 border border-red-900 rounded-xl px-4 py-2">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
