export const INTENTS = [
  ['learn', 'Learn later'],
  ['project', 'For a project'],
  ['read', 'Read later'],
  ['reference', 'Reference'],
  ['inspiration', 'Inspiration'],
]
export const intentLabel = (key) => INTENTS.find(([k]) => k === key)?.[1] ?? null
