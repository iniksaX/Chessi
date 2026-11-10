/* Opening book — used for Book classification and the Watch/Learn tab.
   Lines are UCI move sequences (validated by scripts/validate_data.mjs). */

export interface OpeningLine {
  name: string;
  moves: string[];
  eco: string;
}

export const OPENINGS: OpeningLine[] = [
  { eco: 'C50', name: 'Italian Game', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'] },
  { eco: 'C50', name: 'Italian Game: Two Knights Defense', moves: ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f1c4', 'f8c5'] },
  { eco: 'C54', name: 'Italian Game: Giuoco Piano', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6'] },
  { eco: 'C55', name: 'Two Knights Defense', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6'] },
  { eco: 'C60', name: 'Ruy Lopez', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'] },
  { eco: 'C68', name: 'Ruy Lopez: Exchange Variation', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5c6', 'd7c6'] },
  { eco: 'C70', name: 'Ruy Lopez: Morphy Defense', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6'] },
  { eco: 'C92', name: 'Ruy Lopez: Closed Defense', moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f8e7', 'f1e1', 'b7b5'] },
  { eco: 'C24', name: 'Vienna Game', moves: ['e2e4', 'e7e5', 'b1c3'] },
  { eco: 'C25', name: 'Vienna Game: Frankenstein-Dracula', moves: ['e2e4', 'e7e5', 'b1c3', 'g8f6', 'f1c4', 'f8c5'] },
  { eco: 'C42', name: 'Petrov\'s Defense', moves: ['e2e4', 'e7e5', 'g1f3', 'g8f6'] },
  { eco: 'C42', name: 'Petrov\'s Defense: Modern Attack', moves: ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f3e5', 'd7d6', 'e5f3', 'f6e4'] },
  { eco: 'C44', name: 'King\'s Gambit Declined', moves: ['e2e4', 'e7e5', 'f2f4', 'f8c5'] },
  { eco: 'C33', name: 'King\'s Gambit Accepted', moves: ['e2e4', 'e7e5', 'f2f4', 'e5f4'] },
  { eco: 'C30', name: 'King\'s Gambit', moves: ['e2e4', 'e7e5', 'f2f4'] },
  { eco: 'C21', name: 'Center Game', moves: ['e2e4', 'e7e5', 'd2d4', 'e5d4', 'd1d4'] },
  { eco: 'C20', name: 'King\'s Pawn Opening', moves: ['e2e4', 'e7e5'] },
  { eco: 'C00', name: 'French Defense', moves: ['e2e4', 'e7e6'] },
  { eco: 'C02', name: 'French Defense: Advance Variation', moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'e4e5'] },
  { eco: 'C03', name: 'French Defense: Tarrasch Variation', moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1d2'] },
  { eco: 'C11', name: 'French Defense: Classical Variation', moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3', 'g8f6', 'e4e5', 'f6d7'] },
  { eco: 'B10', name: 'Caro-Kann Defense', moves: ['e2e4', 'c7c6'] },
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', moves: ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'e4e5'] },
  { eco: 'B18', name: 'Caro-Kann Defense: Classical Variation', moves: ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'c8f5'] },
  { eco: 'B20', name: 'Sicilian Defense', moves: ['e2e4', 'c7c5'] },
  { eco: 'B23', name: 'Sicilian Defense: Closed', moves: ['e2e4', 'c7c5', 'b1c3'] },
  { eco: 'B27', name: 'Sicilian Defense: Hyper-Accelerated Dragon', moves: ['e2e4', 'c7c5', 'g1f3', 'g7g6'] },
  { eco: 'B30', name: 'Sicilian Defense: Rossolimo', moves: ['e2e4', 'c7c5', 'g1f3', 'b8c6', 'f1b5'] },
  { eco: 'B40', name: 'Sicilian Defense: Four Knights', moves: ['e2e4', 'c7c5', 'g1f3', 'e7e6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'b8c6'] },
  { eco: 'B50', name: 'Sicilian Defense: Richter-Rauzer', moves: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'b8c6'] },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf', moves: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6'] },
  { eco: 'B76', name: 'Sicilian Defense: Dragon', moves: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'g7g6'] },
  { eco: 'B20', name: 'Sicilian Defense: Smith-Morra Gambit', moves: ['e2e4', 'c7c5', 'd2d4', 'c5d4', 'c2c3'] },
  { eco: 'B06', name: 'Modern Defense', moves: ['e2e4', 'g7g6'] },
  { eco: 'B07', name: 'Pirc Defense', moves: ['e2e4', 'd7d6', 'd2d4', 'g8f6', 'b1c3', 'g7g6'] },
  { eco: 'B01', name: 'Scandinavian Defense', moves: ['e2e4', 'd7d5'] },
  { eco: 'B01', name: 'Scandinavian Defense: Mieses-Kotroc Variation', moves: ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5a5'] },
  { eco: 'A00', name: 'Bird\'s Opening', moves: ['f2f4'] },
  { eco: 'A04', name: 'Reti Opening', moves: ['g1f3'] },
  { eco: 'A10', name: 'English Opening', moves: ['c2c4'] },
  { eco: 'A30', name: 'English Opening: Symmetrical', moves: ['c2c4', 'c7c5', 'b1c3', 'b8c6'] },
  { eco: 'A56', name: 'Benoni Defense', moves: ['d2d4', 'g8f6', 'c2c4', 'c7c5', 'd4d5', 'e7e6'] },
  { eco: 'A80', name: 'Dutch Defense', moves: ['d2d4', 'f7f5'] },
  { eco: 'D06', name: 'Queen\'s Gambit', moves: ['d2d4', 'd7d5', 'c2c4'] },
  { eco: 'D20', name: 'Queen\'s Gambit Accepted', moves: ['d2d4', 'd7d5', 'c2c4', 'd5c4'] },
  { eco: 'D30', name: 'Queen\'s Gambit Declined', moves: ['d2d4', 'd7d5', 'c2c4', 'e7e6'] },
  { eco: 'D35', name: 'Queen\'s Gambit Declined: Exchange', moves: ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'c4d5', 'e6d5'] },
  { eco: 'D37', name: 'Queen\'s Gambit Declined: 5.Bf4', moves: ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1f4'] },
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3', 'f8b4'] },
  { eco: 'E12', name: 'Queen\'s Indian Defense', moves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'g1f3', 'b7b6'] },
  { eco: 'E60', name: 'King\'s Indian Defense', moves: ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7'] },
  { eco: 'D00', name: 'London System', moves: ['d2d4', 'd7d5', 'c1f4'] },
  { eco: 'D02', name: 'London System: Modern Move Order', moves: ['d2d4', 'g8f6', 'g1f3', 'd7d5', 'c1f4'] },
  { eco: 'A45', name: 'Trompowsky Attack', moves: ['d2d4', 'g8f6', 'c1g5'] },
  { eco: 'A40', name: 'Queen\'s Pawn Game: Accelerated London', moves: ['d2d4', 'd7d5', 'g1f3'] },
  { eco: 'B12', name: 'Caro-Kann: Advance, Short', moves: ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'e4e5', 'c8f5', 'g1f3', 'e7e6'] },
  { eco: 'A29', name: 'English Opening: Four Knights', moves: ['c2c4', 'e7e5', 'b1c3', 'g8f6', 'g1f3', 'b8c6'] },
  { eco: 'E32', name: 'Nimzo-Indian: Classical', moves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3', 'f8b4', 'g1f3', 'b4c3', 'b2c3'] },
];

/** longest book line match for a move sequence (UCI). Returns opening name or null. */
export function matchOpening(uciMoves: string[]): { name: string; eco: string; matchedPlies: number } | null {
  let best: { name: string; eco: string; matchedPlies: number } | null = null;
  for (const line of OPENINGS) {
    let m = 0;
    for (let i = 0; i < Math.min(line.moves.length, uciMoves.length); i++) {
      if (line.moves[i] === uciMoves[i]) m++;
      else break;
    }
    if (m >= 3 && (!best || m > best.matchedPlies)) best = { name: line.name, eco: line.eco, matchedPlies: m };
  }
  return best;
}

export function isBookMove(uciMovesIncludingLatest: string[]): boolean {
  for (const line of OPENINGS) {
    if (line.moves.length >= uciMovesIncludingLatest.length &&
        line.moves.slice(0, uciMovesIncludingLatest.length).join(' ') === uciMovesIncludingLatest.join(' ')) {
      return uciMovesIncludingLatest.length >= 2;
    }
  }
  return false;
}
