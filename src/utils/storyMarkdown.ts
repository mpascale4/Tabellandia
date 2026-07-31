type StoryModuleMap = Record<string, string>;

export type StoryDraft = {
  title: string;
  premise: string;
  climax: string;
  narrative: string;
};

export type StoryListEntry = {
  table: number;
  multiplier: number;
  result: number;
  tableLabel: string;
  sentence: string;
};

const storyModules = import.meta.glob<string>('../../docs/stories-x*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as StoryModuleMap;

const storiesMarkdown = Object.keys(storyModules)
  .sort()
  .map((key) => storyModules[key])
  .join('\n\n');

function splitStoryText(text: string): { premise: string; climax: string } {
  const cleaned = text.trim();
  if (!cleaned) return { premise: '', climax: '' };
  const sentences = (cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length <= 1) {
    return { premise: cleaned, climax: cleaned };
  }
  return {
    premise: sentences[0],
    climax: sentences.slice(1).join(' '),
  };
}

function parseStoriesFromMarkdown(markdown: string): Record<string, StoryDraft> {
  const lines = markdown.split(/\r?\n/);
  const stories: Record<string, StoryDraft> = {};

  let currentKey: string | null = null;
  let currentTitle = '';
  let currentPremise = '';
  let currentFinale = '';
  let currentFullText = '';

  const flush = () => {
    if (!currentKey) return;

    const fullText = currentFullText.trim();
    const split = splitStoryText(fullText);
    const premise = split.premise || currentPremise.trim();
    const climax = split.climax || currentFinale.trim() || split.premise || currentPremise.trim();
    const narrative = fullText || [premise, climax].filter(Boolean).join(' ').trim();

    stories[currentKey] = {
      title: currentTitle || `La storia di ${currentKey.replace('x', ' × ')}`,
      premise,
      climax,
      narrative,
    };
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const headingMatch = line.match(/^#{2,3}\s+(\d+)\s*[×x]\s*(\d+)\s*=\s*(\d+)/i);
    if (headingMatch) {
      flush();
      const a = Number(headingMatch[1]);
      const b = Number(headingMatch[2]);
      currentKey = `${a}x${b}`;
      currentTitle = `La storia di ${a} × ${b}`;
      currentPremise = '';
      currentFinale = '';
      currentFullText = '';
      continue;
    }

    if (!currentKey) continue;

    if (/^\*\*Premessa:\*\*/i.test(line)) {
      currentPremise = line.replace(/^\*\*Premessa:\*\*\s*/i, '').trim();
      continue;
    }

    if (/^\*\*Finale:\*\*/i.test(line)) {
      currentFinale = line.replace(/^\*\*Finale:\*\*\s*/i, '').trim();
      continue;
    }

    if (line.startsWith('- Premessa:')) {
      currentPremise = line.replace('- Premessa:', '').trim();
      continue;
    }

    if (line.startsWith('- Finale:')) {
      currentFinale = line.replace('- Finale:', '').trim();
      continue;
    }

    if (line.startsWith('- Testo completo:')) {
      currentFullText = line.replace('- Testo completo:', '').trim();
      continue;
    }

    if (
      line.length > 0 &&
      !line.startsWith('#') &&
      !line.startsWith('-') &&
      !line.startsWith('*') &&
      line !== '---' &&
      line !== '|'
    ) {
      currentFullText += (currentFullText ? ' ' : '') + line;
    }
  }

  flush();
  return stories;
}

export const STORY_DRAFTS = parseStoriesFromMarkdown(storiesMarkdown);

export const getStoryDraftForEquation = (a: number, b: number): StoryDraft | null => {
  return STORY_DRAFTS[`${a}x${b}`] || STORY_DRAFTS[`${b}x${a}`] || null;
};

export const getStoryEntriesForTable = (table: number): StoryListEntry[] => {
  const entries = Object.entries(STORY_DRAFTS)
    .map(([key, draft]) => {
      const match = key.match(/^(\d+)x(\d+)$/);
      if (!match) return null;
      const currentTable = Number(match[1]);
      const multiplier = Number(match[2]);
      if (currentTable !== table) return null;
      return {
        table: currentTable,
        multiplier,
        result: currentTable * multiplier,
        tableLabel: `${currentTable}×${multiplier} = ${currentTable * multiplier}`,
        sentence: draft.narrative || [draft.premise, draft.climax].filter(Boolean).join(' ').trim() || 'Frase non disponibile',
      } satisfies StoryListEntry;
    })
    .filter((entry): entry is StoryListEntry => entry !== null)
    .sort((a, b) => a.multiplier - b.multiplier);

  return entries;
};
