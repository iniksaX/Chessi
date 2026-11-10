/* Chessi offline tactics database. Every puzzle is validated by
   scripts/validate_data.mjs (FEN legality, solution legality, mate verification). */

export interface Puzzle {
  id: string;
  fen: string;
  /** UCI moves starting with the player-to-move; multi-ply = forced sequence */
  solution: string[];
  theme: string;
  rating: number;
  hint: string;
}

export const PUZZLE_THEMES = ['All', 'Mate in 1', 'Mate in 2', 'Fork', 'Pin', 'Skewer', 'Hanging Piece', 'Discovered Attack'] as const;

export const PUZZLES: Puzzle[] = [
  // ---- Mate in 1 ----
  { id: 'm1-01', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', solution: ['a1a8'], theme: 'Mate in 1', rating: 400, hint: 'The eighth rank is undefended.' },
  { id: 'm1-02', fen: '6k1/5ppp/8/8/8/8/6Q1/6K1 w - - 0 1', solution: ['g2a8'], theme: 'Mate in 1', rating: 450, hint: 'The long diagonal leads to the back rank.' },
  { id: 'm1-03', fen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1', solution: ['g6g7'], theme: 'Mate in 1', rating: 500, hint: 'The queen closes in, protected by the king.' },
  { id: 'm1-04', fen: '7k/8/6K1/8/8/8/8/R7 w - - 0 1', solution: ['a1a8'], theme: 'Mate in 1', rating: 500, hint: 'Rook and king work together on the edge.' },
  { id: 'm1-05', fen: '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1', solution: ['e1e8'], theme: 'Mate in 1', rating: 550, hint: 'The e-file is wide open.' },
  { id: 'm1-06', fen: '5k2/3ppppp/8/8/8/8/8/2R3K1 w - - 0 1', solution: ['c1c8'], theme: 'Mate in 1', rating: 550, hint: 'Pierce the back rank with the rook.' },
  { id: 'm1-07', fen: '7k/5P2/6K1/8/8/8/8/8 w - - 0 1', solution: ['f7f8q'], theme: 'Mate in 1', rating: 650, hint: 'Promotion with the king guarding the escape squares.' },
  { id: 'm1-08', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 3 4', solution: ['h5f7'], theme: 'Mate in 1', rating: 600, hint: 'The square f7 is traditionally weak for Black.' },
  { id: 'm1-09', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: ['h5f7'], theme: 'Mate in 1', rating: 550, hint: 'The queen and bishop battery aims at f7.' },
  { id: 'm1-10', fen: '7k/1P6/6K1/8/8/8/8/8 w - - 0 1', solution: ['b7b8q'], theme: 'Mate in 1', rating: 700, hint: 'The king seals the kingside escape squares — promote!' },
  { id: 'm1-11', fen: 'k7/8/1K6/8/8/6B1/8/7R w - - 0 1', solution: ['h1h8'], theme: 'Mate in 1', rating: 750, hint: 'Rook to the eighth rank — king and bishop seal every flight square.' },
  { id: 'br-01', fen: '4k3/3ppppp/8/8/8/8/8/2R3K1 w - - 0 1', solution: ['c1c8'], theme: 'Mate in 1', rating: 420, hint: 'Black’s king is boxed in by its own pawns.' },
  { id: 'br-02', fen: '7k/5ppp/8/8/8/8/8/2R3K1 w - - 0 1', solution: ['c1c8'], theme: 'Mate in 1', rating: 420, hint: 'The whole back rank belongs to White.' },
  { id: 'br-03', fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', solution: ['e1e8'], theme: 'Mate in 1', rating: 380, hint: 'Classic corridor mate.' },
  { id: 'br-04', fen: '3k4/3ppppp/1K6/8/8/8/8/R7 w - - 0 1', solution: ['a1a8'], theme: 'Mate in 1', rating: 420, hint: 'The e-file leads straight home.' },
  { id: 'br-05', fen: '7k/6pp/8/8/8/8/8/1R5K w - - 0 1', solution: ['b1b8'], theme: 'Mate in 1', rating: 440, hint: 'The rook invades the back rank — out of reach of the king.' },
  { id: 'br-06', fen: '4k3/3ppppp/8/8/8/8/8/1R4K1 w - - 0 1', solution: ['b1b8'], theme: 'Mate in 1', rating: 400, hint: 'Queen to the back rank.' },
  { id: 'br-07', fen: '5k2/4ppp1/8/8/8/8/8/2Q3K1 w - - 0 1', solution: ['c1c8'], theme: 'Mate in 1', rating: 440, hint: 'Same pattern, different file.' },
  { id: 'pm-01', fen: 'k7/8/8/8/5B2/8/8/KR4B1 w - - 0 1', solution: ['b1b8'], theme: 'Mate in 1', rating: 750, hint: 'Use the rook on b8 — the bishops cover every flight square.' },

  // ---- Mate in 2 ----
  { id: 'm2-01', fen: '2r3k1/5ppp/8/8/8/3Q4/8/3R2K1 w - - 0 1', solution: ['d3d8', 'c8d8', 'd1d8'], theme: 'Mate in 2', rating: 1000, hint: 'Decoy the defender of the back rank.' },
  { id: 'm2-02', fen: '2r3k1/p4ppp/8/8/8/3Q4/8/3R2K1 w - - 0 1', solution: ['d3d8', 'c8d8', 'd1d8'], theme: 'Mate in 2', rating: 1100, hint: 'Remove the rook, then deliver mate.' },
  { id: 'm2-03', fen: '4r1k1/p4ppp/8/8/8/8/3Q1PPP/3R2K1 w - - 0 1', solution: ['d2d8', 'e8d8', 'd1d8'], theme: 'Mate in 2', rating: 1200, hint: 'The queen clears the file — then the rook finishes.' },
  { id: 'm2-04', fen: '5rk1/5ppp/8/8/8/8/3Q2PP/3R2K1 w - - 0 1', solution: ['d2d8', 'f8d8', 'd1d8'], theme: 'Mate in 2', rating: 1200, hint: 'Force the rook to abandon the back rank.' },
  { id: 'm2-05', fen: '5rk1/5ppp/8/8/8/8/4Q1PP/4R1K1 w - - 0 1', solution: ['e2e8', 'f8e8', 'e1e8'], theme: 'Mate in 2', rating: 1100, hint: 'The queen offers herself to tear open the e-file.' },

  // ---- Forks ----
  { id: 'fk-01', fen: 'r3k3/8/8/1N6/8/8/8/6K1 w - - 0 1', solution: ['b5c7'], theme: 'Fork', rating: 500, hint: 'A knight jump that attacks two targets at once.' },
  { id: 'fk-02', fen: '4r1k1/3q1ppp/8/8/4N1B1/8/8/6K1 w - - 0 1', solution: ['e4f6'], theme: 'Fork', rating: 800, hint: 'The knight is the only piece that checks while attacking the queen.' },
  { id: 'fk-03', fen: 'k7/3r4/8/8/N7/8/8/K7 w - - 0 1', solution: ['a4b6'], theme: 'Fork', rating: 700, hint: 'Jump with tempo — one move, two victims.' },
  { id: 'fk-05', fen: '7k/8/7q/6N1/8/8/8/K7 w - - 0 1', solution: ['g5f7'], theme: 'Fork', rating: 650, hint: 'The royal fork — check and queen together.' },
  { id: 'fk-06', fen: '4r1k1/3q2pp/8/8/4N1B1/8/8/6K1 w - - 0 1', solution: ['e4f6'], theme: 'Fork', rating: 700, hint: 'Double attack: king in check, queen exposed.' },
  { id: 'fk-07', fen: '8/8/8/4kr2/8/8/5P2/K6R w - - 0 1', solution: ['f2f4'], theme: 'Fork', rating: 800, hint: 'Push two squares — pawns fork too.' },

  // ---- Pins ----
  { id: 'pn-01', fen: '6k1/8/4n3/3P4/8/1B6/8/K7 w - - 0 1', solution: ['d5e6'], theme: 'Pin', rating: 750, hint: 'The knight is glued to its king — strike it.' },
  { id: 'pn-02', fen: '6k1/8/4n3/5P2/8/1B6/8/6K1 w - - 0 1', solution: ['f5e6'], theme: 'Pin', rating: 750, hint: 'Same pinned knight, this time from the f-file.' },
  { id: 'pn-03', fen: '8/2k5/2n5/8/8/8/R7/7K w - - 0 1', solution: ['a2c2'], theme: 'Pin', rating: 800, hint: 'Line up the rook on the c-file.' },

  // ---- Skewers ----
  { id: 'sk-01', fen: '8/8/3k3r/8/8/8/8/R5K1 w - - 0 1', solution: ['a1a6'], theme: 'Skewer', rating: 800, hint: 'Check the king — whatever stands behind falls.' },
  { id: 'sk-02', fen: '8/8/8/k6r/8/8/8/5RK1 w - - 0 1', solution: ['f1f5'], theme: 'Skewer', rating: 850, hint: 'Attack along the fifth rank — king first, rook behind.' },

  // ---- Hanging pieces ----
  { id: 'hg-01', fen: '1q6/8/8/8/8/8/6B1/K1k5 w - - 0 1', solution: ['g2b7'], theme: 'Hanging Piece', rating: 500, hint: 'An undefended queen on a long diagonal.' },
  { id: 'hg-02', fen: '6k1/6pp/8/8/4n3/3P4/8/6K1 w - - 0 1', solution: ['d3e4'], theme: 'Hanging Piece', rating: 550, hint: 'Just take it.' },
  { id: 'hg-03', fen: '3r4/8/8/8/8/8/3Q4/K1k5 w - - 0 1', solution: ['d2d8'], theme: 'Hanging Piece', rating: 600, hint: 'The d-file is open and nobody protects that rook.' },
  { id: 'hg-04', fen: '8/8/2q5/8/8/8/8/K1R4k w - - 0 1', solution: ['c1c6'], theme: 'Hanging Piece', rating: 600, hint: 'File, meet queen.' },

  // ---- Discovered attack ----
  { id: 'dc-01', fen: '4q1k1/8/8/8/4N3/8/8/4R1K1 w - - 0 1', solution: ['e4f6'], theme: 'Discovered Attack', rating: 950, hint: 'Move the knight with check — and open the rook’s file onto the queen.' },
];

export function puzzlesByTheme(theme: string): Puzzle[] {
  if (theme === 'All') return PUZZLES;
  return PUZZLES.filter((p) => p.theme === theme);
}

export function puzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}
