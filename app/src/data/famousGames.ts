/* Famous games for the Watch tab (PGN, validated by scripts/validate_data.mjs). */

export interface FamousGame {
  id: string;
  title: string;
  white: string;
  black: string;
  event: string;
  year: number;
  result: string;
  eco: string;
  story: string;
  pgn: string;
}

export const FAMOUS_GAMES: FamousGame[] = [
  {
    id: 'immortal-1851', title: 'The Immortal Game', white: 'Adolf Anderssen', black: 'Lionel Kieseritzky',
    event: 'London, casual game', year: 1851, result: '1-0', eco: 'C33',
    story: 'Anderssen sacrifices both rooks, a bishop and his queen — and mates with three minor pieces. The eternal benchmark of romantic chess.',
    pgn: '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0',
  },
  {
    id: 'evergreen-1852', title: 'The Evergreen Game', white: 'Adolf Anderssen', black: 'Jean Dufresne',
    event: 'Berlin, casual game', year: 1852, result: '1-0', eco: 'C52',
    story: 'A Evans Gambit masterpiece: both sides attack, but Anderssen’s final “double check” sequence (Rxe7+!) is engraved in every tactics manual.',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7# 1-0',
  },
  {
    id: 'opera-1858', title: 'The Opera Game', white: 'Paul Morphy', black: 'Duke Karl / Count Isouard',
    event: 'Paris Opera House, casual game', year: 1858, result: '1-0', eco: 'C41',
    story: 'Morphy develops with terrifying speed, wins material by force and delivers the textbook Rd8# — pure, merciless development.',
    pgn: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0',
  },
  {
    id: 'gotc-1956', title: 'Game of the Century', white: 'Donald Byrne', black: 'Bobby Fischer',
    event: 'New York Rosenwald Trophy', year: 1956, result: '0-1', eco: 'D92',
    story: 'Fischer, age 13, sacrifices his queen on move 17 and overwhelms White with the remaining pieces. The game that announced a genius to the world.',
    pgn: '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 0-1',
  },
  {
    id: 'legal-trap', title: 'The Legal Trap', white: 'Legal de Kermeur', black: 'Saint Brie',
    event: 'Paris, casual game', year: 1750, result: '1-0', eco: 'C40',
    story: '“You cannot take my queen, I have mate!” — Nxe5!! followed by Bxf7+ and Nd5#, the most quoted trap in chess history.',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. h3 Bh5 6. Nxe5 Bxd1 7. Bxf7+ Ke7 8. Nd5# 1-0',
  },
];
