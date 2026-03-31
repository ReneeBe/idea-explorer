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

export async function generateRootConcepts(
  apiKey: string,
  topic: string
): Promise<GeneratedConcept[]> {
  const client = getClient(apiKey);

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are helping someone explore the idea of "${topic}" spatially on a mind map.

Generate 6-8 core concepts that radiate out from "${topic}" — the most important dimensions, aspects, or related ideas that someone should explore. Make them diverse and thought-provoking.

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
