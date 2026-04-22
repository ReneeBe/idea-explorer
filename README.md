# Idea Explorer

A spatial concept map that helps you brainstorm ideas by letting you drill from a vague topic all the way down to something specific and actionable. Day 13 of my [50 projects challenge](https://reneebe.github.io).

**[Live demo →](https://reneebe.github.io/idea-explorer/)**

## How it works

1. Enter a starting topic (e.g. "vegetarian meal plan ideas", "50-day project ideas")
2. Answer 1-2 follow-up questions from Claude to give it context (optional but helpful)
3. Claude generates 6-8 starting ideas radiating out from your topic
4. Click any node to expand it with more specific ideas
5. Keep drilling until you reach something concrete

## Why ideas, not topics

The first version surfaced abstract categories, things like *weekly batch cooking* or *seasonal produce rotation* for a vegetarian meal planning topic. Not useful. The prompts were rewritten to ask for concrete, actionable ideas at every level: things like *Italian cuisine*, *high-protein vegetarian meals*, *seitan recipes*, drilling down to *tofu with cilantro lime rice and beans*.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Flow](https://reactflow.dev/) for the interactive graph
- [Claude](https://anthropic.com) (`claude-opus-4-6`) for ideation

## Auth

No API key needed. The app includes a daily visitor pool for free usage. [MagicLink](https://magiclink.reneebe.workers.dev/resume) tokens provide additional access (20 uses across all projects).

## Running locally

```bash
npm install
npm run dev
```
