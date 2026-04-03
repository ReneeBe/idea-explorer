import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedConcept } from '../types';

const MAGICLINK_URL = 'https://magiclink.reneebe.workers.dev';

function getClient(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

async function callClaude(
  apiKey: string,
  params: { model: string; max_tokens: number; messages: { role: 'user'; content: string }[] }
): Promise<{ content: Array<{ type: string; text?: string }> }> {
  if (window.magiclink?.hasToken) {
    const token = localStorage.getItem('magiclink_token');
    const res = await fetch(`${MAGICLINK_URL}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, projectId: 'idea-explorer', provider: 'claude', request: params }),
    });
    const json = await res.json() as { result?: { content: Array<{ type: string; text?: string }> }; error?: string };
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json.result!;
  }
  const client = getClient(apiKey);
  return client.messages.create(params);
}

export async function expandConcept(
  apiKey: string,
  concept: string,
  rootConcept: string,
  existingConcepts: string[]
): Promise<GeneratedConcept[]> {
  const existing = existingConcepts.length > 0
    ? `\n\nAlready on the map (avoid duplicating these): ${existingConcepts.join(', ')}`
    : '';

  const response = await callClaude(apiKey, {
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an idea generator helping someone brainstorm within "${rootConcept}".

They want to explore: "${concept}"${existing}

Generate 5-7 specific, concrete ideas within "${concept}". Go one level more specific — not abstract subtopics or categories, but actual ideas, examples, dishes, projects, recipes, names, or things you could act on. The user wants to eventually drill all the way down to a single concrete idea.

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "concept": "specific idea (2-6 words)",
    "relationship": "short phrase connecting it to "${concept}" (2-6 words)",
    "type": one of: "is_a" | "leads_to" | "requires" | "contrasts_with" | "example_of" | "part_of" | "enables" | "related_to"
  }
]`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? (response.content[0].text ?? '') : '';
  const json = text.match(/\[[\s\S]*\]/)?.[0];
  if (!json) throw new Error('No JSON in response');
  return JSON.parse(json) as GeneratedConcept[];
}

export async function generateFollowUpQuestions(
  apiKey: string,
  topic: string
): Promise<string[]> {
  const response = await callClaude(apiKey, {
    model: 'claude-opus-4-6',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Someone wants to brainstorm "${topic}" using an interactive idea map. Ask them 1-2 short, focused follow-up questions to understand their specific angle, constraints, or goals — so the ideas generated are more relevant and concrete.

Return ONLY a JSON array of question strings (no markdown, no explanation):
["question 1", "question 2"]`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? (response.content[0].text ?? '') : '';
  const json = text.match(/\[[\s\S]*\]/)?.[0];
  if (!json) throw new Error('No JSON in response');
  return JSON.parse(json) as string[];
}

export async function generateRootConcepts(
  apiKey: string,
  topic: string,
  context: string
): Promise<GeneratedConcept[]> {
  const contextBlock = context.trim()
    ? `\n\nContext from the user:\n${context.trim()}`
    : '';

  const response = await callClaude(apiKey, {
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an idea generator helping someone brainstorm "${topic}".${contextBlock}

Generate 6-8 starting ideas that branch out from "${topic}". These should be specific enough to be interesting and explorable — not abstract categories or meta-concepts, but actual ideas, directions, cuisines, styles, approaches, or examples someone could click into and keep drilling down. Think of these as the first layer of a brainstorm, not an outline.

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "concept": "specific idea (2-6 words)",
    "relationship": "short phrase connecting it to "${topic}" (2-6 words)",
    "type": one of: "is_a" | "leads_to" | "requires" | "contrasts_with" | "example_of" | "part_of" | "enables" | "related_to"
  }
]`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? (response.content[0].text ?? '') : '';
  const json = text.match(/\[[\s\S]*\]/)?.[0];
  if (!json) throw new Error('No JSON in response');
  return JSON.parse(json) as GeneratedConcept[];
}
