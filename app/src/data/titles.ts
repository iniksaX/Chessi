/* Selectable chess titles (custom, community-flavored). */

export interface TitleDef { id: string; label: string; blurb: string; hue: string }

export const TITLES: TitleDef[] = [
  { id: 'none', label: '', blurb: 'No title — just a clean attacking style.', hue: '#8a8a8a' },
  { id: 'gm', label: 'GM', blurb: 'Grandmaster. You calculate like a computer.', hue: '#f0c75e' },
  { id: 'im', label: 'IM', blurb: 'International Master. Serious strength.', hue: '#d9d9d9' },
  { id: 'fm', label: 'FM', blurb: 'FIDE Master. Respected over the board.', hue: '#cd7f32' },
  { id: 'cm', label: 'CM', blurb: 'Candidate Master. Climbing fast.', hue: '#c0c0c0' },
  { id: 'wcm', label: 'WCM', blurb: 'Woman Candidate Master — any gender, same fight.', hue: '#e6a8d7' },
  { id: 'hacker', label: 'HACKER', blurb: 'Code-first chess player. Finds the winning line in the noise.', hue: '#6ee7ff' },
  { id: 'analyst', label: 'THE ANALYST', blurb: 'Lives in the evaluation bar. Hates mistakes — especially their own.', hue: '#95bb4e' },
  { id: 'grinder', label: 'CERTIFIED GRINDER', blurb: 'Won’t stop until flag or mate. Clock management is a personality trait.', hue: '#ff9f43' },
  { id: 'puzzler', label: 'PUZZLE MASTER', blurb: 'Sees forks three moves before they exist.', hue: '#1bada6' },
  { id: 'theory', label: 'THEORIST', blurb: 'Opening book is a religion. 20 moves of prep minimum.', hue: '#a97b50' },
  { id: 'griefer', label: 'GRIEFER', blurb: 'Trash-talk connoisseur. Emotional resilience is the meta.', hue: '#ff6b5b' },
  { id: 'immortal', label: 'IMMORTAL', blurb: 'You have won a game you still think about.', hue: '#c9a0ff' },
];
