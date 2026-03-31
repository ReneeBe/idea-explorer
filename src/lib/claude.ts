import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedConcept } from '../types';

function getClient(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function expandConcept(
  apiKey: string,
  concept: string,
  rootConcept: string,
  existingConcepts: string[]
): Promise<GeneratedConcept[]> {
  const client = getClient(apiKey);

  const existing = existingConcepts.length > 0
    ? `\n\nAlready on the map (avoid duplicating): ${existingConcepts.join(', ')}`
    : '';

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are helping someone explore ideas spatially on a mind map.

Root topic: "${rootConcept}"
Concept to expand: "${concept}"${existing}

Generate 5-7 distinct concepts that relate to "${concept}" in the context of "${rootConcept}". Focus on ideas that are genuinely useful for spatial exploration — things that reveal structure, contrast, or surprising connections.

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "concept": "short concept name (2-5 words)",
    "relationship": "how it relates to ${concept} (3-8 words)",
    "type": one of: "is_a" | "leads_to" | "requires" | "contrasts_with" | "example_of" | "part_of" | "enables" | "related_to"
  }
]`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const json = text.match(/\[[\s\S]*\]/)?.[0];
  if (!json) throw new Error('No JSON in response');
  return JSON.parse(json) as GeneratedConcept[];
}

export async function generateFollowUpQuestions(
  apiKey: string,
  topic: string
): Promise<string[]> {
  const client = getClient(apiKey);

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Someone wants to explore the idea of "${topic}" on a concept map. Ask them 1-2 short, focused follow-up questions that will help you understand their specific angle, goal, or context — so you can generate more relevant concepts for them.

Return ONLY a JSON array of question strings (no markdown, no explanation):
["question 1", "question 2"]`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const json = text.match(/\[[\s\S]*\]/)?.[0];
  if (!json) throw new Error('No JSON in response');
  return JSON.parse(json) as string[];
}

export async function generateRootConcepts(
  apiKey: string,
  topic: string,
  context: string
): Promise<GeneratedConcept[]> {
  const client = getClient(apiKey);

  const contextBlock = context.trim()
    ? `\n\nAdditional context from the user:\n${context.trim()}`
    : '';

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are helping someone explore the idea of "${topic}" spatially on a mind map.${contextBlock}

Generate 6-8 core concepts that radiate out from "${topic}" — the most important dimensions, aspects, or related ideas that someone should explore. Make them specific to the user's context and goals, diverse, and thought-provoking.

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "concept": "short concept name (2-5 words)",
    "relationship": "how it relates to ${topic} (3-8 words)",
    "type": one of: "is_a" | "leads_to" | "requires" | "contrasts_with" | "example_of" | "part_of" | "enables" | "related_to"
  }
]`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const json = text.match(/\[[\s\S]*\]/)?.[0];
  if (!json) throw new Error('No JSON in response');
  return JSON.parse(json) as GeneratedConcept[];
}
