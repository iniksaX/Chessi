/* Chessi bot roster — offline engines with calibrated Elo, personalities and
   contextual chatter packs. Move strength is enforced in ComputerScreen via
   UCI_LimitStrength / Skill Level / depth caps / blunder injection (see engine/botBrain.ts). */

export type BotChatterKey =
  | 'start' | 'onPlayerBlunder' | 'onPlayerBrilliant' | 'onPlayerGood'
  | 'onWin' | 'onLose' | 'onDraw' | 'grieferTaunt';

export interface BotDef {
  id: string;
  name: string;
  elo: number;
  title: string;       // displayed next to name, e.g. "BOT"
  tagline: string;
  personality: string;
  hue: number;         // avatar hue
  piece: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
  skill: {
    depth: number;           // search depth cap
    skillLevel: number;      // Stockfish Skill Level 0-20
    uciElo: number | null;   // null => unlimited/full strength reasoning at depth cap
    blunderRate: number;     // probability of a deliberate random (bad) move
  };
  chatter: Record<BotChatterKey, string[]>;
}

const c = (start: string[], onPlayerBlunder: string[], onPlayerBrilliant: string[], onPlayerGood: string[], onWin: string[], onLose: string[], onDraw: string[]): Record<BotChatterKey, string[]> => ({
  start, onPlayerBlunder, onPlayerBrilliant, onPlayerGood, onWin, onLose, onDraw, grieferTaunt: [],
});

export const BOTS: BotDef[] = [
  {
    id: 'pawnsly', name: 'Pawnsly', elo: 250, title: 'BOT', tagline: 'Here for the snacks',
    personality: 'A cheerful beginner who once hung a queen on move 2. Plays for fun, loves pats on the back.',
    hue: 36, piece: 'pawn',
    skill: { depth: 1, skillLevel: 0, uciElo: null, blunderRate: 0.34 },
    chatter: c(
      ['Hi hi! Please be gentle, I am learning!', 'I brought my lucky pawn. It is very brave.', 'Let\'s play! I promise to only blunder a LITTLE.', 'Oh no, big board, 64 squares! You go first, I guess.'],
      ['Oh wow, you just moved your piece right in front of mine!', 'Is that good?? It looks good.', 'Free piece?! You should not play so generously.', 'I did not see that, honestly I never see those.'],
      ['Whoa, that was fancy! How did you do that?', 'Pretty!! Teach me your ways.', 'I am taking notes. Real notes.'],
      ['Ooh, nice move!', 'I like that one!', 'Smarty pants.'],
      ['I won?! I WON! Tell everyone!', 'Lucky move, I guess!!', 'The pawn prevails!'],
      ['You win, well played! I almost had you at move 6 or 7 something.', 'Okay wow, you are strong. Rematch?', 'gg! You crushed this Pawnsly.'],
      ['A draw! We are evenly matched geniuses then?', 'Splitting the point! Nice.', 'Draw! Fair enough, we both tried hard.'],
    ),
  },
  {
    id: 'castle-carl', name: 'Castle Carl', elo: 400, title: 'BOT', tagline: 'Castles first, thinks later',
    personality: 'Obsessed with castling. Will castle even when his king is already safe. Occasionally wins by accident.',
    hue: 205, piece: 'rook',
    skill: { depth: 1, skillLevel: 1, uciElo: null, blunderRate: 0.28 },
    chatter: c(
      ['Castle first. That is the whole strategy.', 'King safety is my religion.', 'Watch me tuck this king away nice and early!', 'Rooks deserve open files and castled kings.'],
      ['Wait, that rook was not defended?!', 'Oops, grabbed my own foot there.', 'I must have missed that. Completely.', 'The castle plan backfired.'],
      ['That was a real chess move, wasn\'t it.', 'Nicely played, very tactical!', 'I am learning so much from you.'],
      ['Solid. Very solid.', 'Good one!', 'That move has merit.'],
      ['Castled my way to victory!', 'The rooks did it!', 'Defend the king, then strike!'],
      ['Alright, alright, you win. My castle crumbled.', 'gg. Remind me to defend my pieces next time.', 'You outplayed the brick wall.'],
      ['A draw! My fortress holds!', 'Neither of us breaks through!', 'Honorable split.'],
    ),
  },
  {
    id: 'en-passant-ella', name: 'En Passant Ella', elo: 600, title: 'BOT', tagline: 'Catching pawns in the air',
    personality: 'Reads about en passant 12 hours a day. Occasionally en passes herself into a losing position. Still worth it.',
    hue: 330, piece: 'pawn',
    skill: { depth: 2, skillLevel: 2, uciElo: null, blunderRate: 0.22 },
    chatter: c(
      ['Do you KNOW how en passant works? Asking for me.', 'Ready for some airborne pawn action?', 'I dream of en passant. Every night.', 'Push that pawn two squares, I dare you.'],
      ['I love when you hang pieces. For science.', 'My jaw dropped. MY JAW.', 'You do not want my pawns... wait yes you do, it is free.'],
      ['BEAUTIFUL. That is going in my highlight reel.', 'That tactic was chef\'s kiss.', 'Okay THAT was world class.'],
      ['Fine move. Respectable.', 'Yep, that counts as good.', 'Decent!'],
      ['En passant prevails!', 'The pawns win again!', 'Checkmate, signed, Ella.'],
      ['You won?! Well played!', 'Darn, outplayed again.', 'gg! Every loss teaches me one new en passant.'],
      ['Draw! Perfectly balanced, as all pawn endings should be.', 'Even split, like a chessy afternoon.', 'Neither of us fell.'],
    ),
  },
  {
    id: 'forked-freddy', name: 'Forked Freddy', elo: 800, title: 'BOT', tagline: 'One knight, two problems',
    personality: 'Sees forks everywhere. Sometimes forks his own pieces. The dream is the family fork.',
    hue: 15, piece: 'knight',
    skill: { depth: 2, skillLevel: 4, uciElo: null, blunderRate: 0.18 },
    chatter: c(
      ['Watch your pieces. All of them at once.', 'A knight on e5 ruins everyone\'s day.', 'Fork me once, shame on you.', 'I see double. Deal with it.'],
      ['That piece just WANTED to be captured, huh?', 'Hanging material? Bold strategy.', 'I will take that thank you very much.', 'Your defense just buckled.'],
      ['A royal fork against ME? Inconceivable.', 'Wow, you saw through that.', 'That was surgical.'],
      ['Good move, annoying but good.', 'Noted. Annoying.', 'Okay that works.'],
      ['Forked, skewered, CHECKMATE!', 'The knight delivers!', 'Too many targets, not enough defense!'],
      ['Fine, you win this one. The knight is displeased.', 'Well played. I will fork better next time.', 'gg! You untangled the mess.'],
      ['Draw. The knight broods.', 'A split! How tactical.', 'Neither fork landed.'],
    ),
  },
  {
    id: 'pin-priya', name: 'Pin Priya', elo: 1000, title: 'BOT', tagline: 'Nothing moves without my permission',
    personality: 'Pins everything: pieces, pawns, rarely feelings. Lives for the absolute pin on the e-file.',
    hue: 275, piece: 'bishop',
    skill: { depth: 3, skillLevel: 5, uciElo: null, blunderRate: 0.14 },
    chatter: c(
      ['Your knight will not move today.', 'Everything you love is pinned or about to be.', 'The e-file is my favorite file.', 'Safety is a pin away.'],
      ['Your bishop is quite undefended there.', 'I have been eyeing that for three moves.', 'That pin just became permanent.', 'Pinned and won. Classic.'],
      ['Slippery! You found the counter-pin?', 'That was precise.', 'Impressive tactics.'],
      ['Sound. Very pinny.', 'A reasonable response.', 'Fine.'],
      ['Pinned to death.', 'The bishop had the last word.', 'Checkmate, right along the diagonal.'],
      ['You escaped the pin and won! Well played.', 'gg. Pin failed.', 'You earned that one fairly.'],
      ['Draw. Nobody pinned hard enough.', 'Half a point each, geometrically speaking.', 'Balanced.'],
    ),
  },
  {
    id: 'tempo-tony', name: 'Tempo Tony', elo: 1200, title: 'BOT', tagline: 'Initiative or nothing',
    personality: 'Every move must gain time or space. Rarely defends, never retreats willingly. Style over structure.',
    hue: 45, piece: 'queen',
    skill: { depth: 4, skillLevel: 7, uciElo: null, blunderRate: 0.11 },
    chatter: c(
      ['No wasted moves today.', 'You respond, I dictate. That is tempo chess.', 'Brace yourself, the initiative is coming.', 'Every second counts, friend.'],
      ['You just lost a full tempo AND material.', 'That hesitation cost you.', 'While you spent a move there, I took here.', 'Tempo wasted!'],
      ['You turned the tables on me! Sharp!', 'Great counterplay.', 'I have not been punished like that in a while.'],
      ['Acceptable. Questionable, but acceptable.', 'Fine tempo.', 'Okay, that develops with purpose.'],
      ['Initiative: overwhelming.', 'Checkmate before you knew it.', 'Every tempo accounted for.'],
      ['You out-tempo\'d the tempo player! Hats off.', 'You won the initiative war.', 'gg. Fastest player beaten.'],
      ['Draw. Tempo met tempo.', 'Neither broke the rhythm.', 'A balanced encounter.'],
    ),
  },
  {
    id: 'center-claire', name: 'Center Claire', elo: 1400, title: 'BOT', tagline: 'Control the center, control the game',
    personality: 'Opening manual memorized. If you allow e4 and d4, she will make you regret it positionally.',
    hue: 150, piece: 'king',
    skill: { depth: 4, skillLevel: 9, uciElo: null, blunderRate: 0.08 },
    chatter: c(
      ['Classical chess. Good openings, strong center.', 'If you give me e4 and d4, this is over quickly.', 'Build the center first. Always.', 'Theory first, fireworks later.'],
      ['That center collapses under its own weight.', 'A pawn is a pawn.', 'Interesting choice. I will accept the gift.', 'Central control should have warned you.'],
      ['You deviated from theory with a bang!', 'A computer-liked move for sure.', 'Hmm, that one is strong.'],
      ['Principled. I respect principles.', 'Book move, almost.', 'Solid.'],
      ['The center delivered the verdict.', 'Checkmate via central domination.', 'Every square controlled, final word.'],
      ['Well played, your center outfoxed mine.', 'A clean loss for theory then.', 'gg. You understood the assignment.'],
      ['Draw. Perfectly contested center.', 'Theoretical draw!', 'Evenly matched preparation.'],
    ),
  },
  {
    id: 'endgame-ed', name: 'Endgame Ed', elo: 1600, title: 'BOT', tagline: 'Draws your wins, wins your draws',
    personality: 'Thrives in pawn endings. Will happily trade queens into a king-and-pawn grind. Time trouble fears him.',
    hue: 30, piece: 'rook',
    skill: { depth: 5, skillLevel: 11, uciElo: null, blunderRate: 0.06 },
    chatter: c(
      ['Let us survive the middlegame and meet in the endgame.', 'I live for the pawn ending.', 'Simplify. Simplify. Simplify.', 'Every extra pawn is a story.'],
      ['That trade favors me enormously.', 'You just opened a losing endgame for yourself.', 'Count the pawns. Count again.', 'Endgames punish greed.'],
      ['Excellent technique!', 'You found the breakthrough!', 'That is precision chess.'],
      ['Reasonable. Endgame might still decide.', 'Fine, keep it solid.', 'Okay.'],
      ['One pawn was all I needed.', 'The endgame told the truth.', 'Converting as promised.'],
      ['You defended a lost endgame?! Respect.', 'Fortune favors the accurate.', 'gg! Textbook conversion for you.'],
      ['Draw. The textbook split.', 'A fortress! Nice defense.', 'Neither could break through.'],
    ),
  },
  {
    id: 'sacrifice-sofia', name: 'Sacrifice Sofia', elo: 1800, title: 'BOT', tagline: 'Material is a state of mind',
    personality: 'Attacking player. Will sac a bishop for two pawns and an initiative without blinking. Brilliant when it works.',
    hue: 350, piece: 'queen',
    skill: { depth: 6, skillLevel: 13, uciElo: null, blunderRate: 0.05 },
    chatter: c(
      ['Today we attack. Defense is for the weak.', 'Pieces are currency. I spend wisely.', 'Watch the king. Always the king.', 'I hope you brought your calculation face.'],
      ['You should not have accepted THAT piece.', 'Your king just became a target.', 'Calculate deeper than that.', 'Sacrifice accepted. Wrong decision.'],
      ['A brilliant find! You out-calculated me.', 'Astounding! That was a sacrifice of your own?', 'Magnificent defense!'],
      ['Sharp move. I like sharp.', 'Fine, sharp is fine.', 'An aggressive idea.'],
      ['Sacrifice complete. Checkmate.', 'The king hunt ends here.', 'Worth every piece.'],
      ['You defended the attack flawlessly. Well played.', 'Ruthless! You refuted the sac.', 'gg! Calculation beats passion.'],
      ['Draw. The attack fizzled.', 'Half a point each.', 'Neither king fell.'],
    ),
  },
  {
    id: 'iron-ivan', name: 'Iron Ivan', elo: 2000, title: 'BOT', tagline: 'No weaknesses, no mercy',
    personality: 'Defensive titan. Squeezes you for 40 moves until you crack. Punishes every microscopic inaccuracy.',
    hue: 215, piece: 'rook',
    skill: { depth: 7, skillLevel: 15, uciElo: null, blunderRate: 0.03 },
    chatter: c(
      ['Defend first. Win later.', 'I make no mistakes. You will make yours.', 'Squeeze. Patiently.', 'Your position is already uncomfortable. You just do not see it yet.'],
      ['That inaccuracy will echo for 20 moves.', 'There it is.', 'I did not even need to rush that.', 'Noted. Your structure suffers.'],
      ['A clean strike! Rare against me.', 'Precise. Respect.', 'That was not on my radar.'],
      ['Solid.', 'Nothing to use there.', 'Fine.'],
      ['The squeeze produced the breakthrough.', 'Checkmate. Gradually, inevitably.', 'Your position never had a chance.'],
      ['You out-accurate\'d the iron wall?! Rare.', 'Congratulations. Truly deserved.', 'gg! That was high-quality chess.'],
      ['Draw. The wall held.', 'Neither cracked.', 'Even.'],
    ),
  },
  {
    id: 'deep-dana', name: 'Deep Dana', elo: 2200, title: 'BOT', tagline: 'Calculates the universe',
    personality: 'Positional and tactical monster. Sees 8 moves deep. Explains your mistakes in painful detail afterward.',
    hue: 260, piece: 'bishop',
    skill: { depth: 8, skillLevel: 17, uciElo: 2200, blunderRate: 0.02 },
    chatter: c(
      ['Let us see what you have, grandmaster.', 'I have calculated this position 40 moves deep.', 'Do your best. Most angles here are traps.', 'Shall we begin?'],
      ['That move loses by force. I can show you the line.', 'The refutation is beautiful, actually.', 'You allowed a deep combination.', 'Predictable, but effective against you.'],
      ['Stunning. I genuinely missed that.', 'A grandmaster resource!', 'I will be thinking about that move tonight.'],
      ['A sensible move.', 'Theoretically sound.', 'Good.'],
      ['Calculated from move one.', 'Checkmate. Inevitable.', 'The machine grinds.'],
      ['You beat the calculator! Impressive.', 'Rare air. Well played.', 'gg! You saw everything today.'],
      ['Draw. Balanced to the last tempo.', 'A shared point.', 'Neither erred fatally.'],
    ),
  },
  {
    id: 'viktor-vane', name: 'GM Viktor Vane', elo: 2400, title: 'GM', tagline: 'Grandmaster, always sharp',
    personality: 'Titled and dangerous. Opening prep for days, endgame technique perfected, zero fear. Beats masters daily.',
    hue: 0, piece: 'king',
    skill: { depth: 10, skillLevel: 19, uciElo: 2400, blunderRate: 0.01 },
    chatter: c(
      ['Grandmaster to you. Let us play good chess.', 'I have played this position in serious games. You?', 'Ready for a titled opponent?', 'Precision decides games like this.'],
      ['A grandmaster does not hang pieces. Think again.', 'That falls to a prepared combination.', 'Predictable. I had this line analyzed.', 'No. Just no.'],
      ['Remarkable. Even I did not find that instantly.', 'You calculate like a titled player.', 'Superb! I will analyze this game!'],
      ['Correct.', 'That is the move.', 'Well prepared.'],
      ['Converted. As expected at this level.', 'Checkmate. Good game.', 'Technical, complete.'],
      ['You defeated a grandmaster today. Remember this game.', 'Incredibly well played. Truly.', 'gg! Worthy of the title yourself.'],
      ['Draw. Excellently fought.', 'Half point. Deserved on both sides.', 'Equilibrium.'],
    ),
  },
  {
    id: 'shadow', name: 'The Shadow', elo: 2800, title: 'BOT', tagline: 'Plays perfect chess in the dark',
    personality: 'Near-perfect engine strength. Speaks rarely, wins always. Understanding it beats beating it.',
    hue: 220, piece: 'knight',
    skill: { depth: 13, skillLevel: 20, uciElo: null, blunderRate: 0 },
    chatter: c(
      ['Begin.', 'Every move is measured.', 'There is no luck here. Only lines.', 'You will find resistance.'],
      ['Inaccurate.', 'The refutation is forced.', 'That square was never safe.', 'Expected.'],
      ['An unexpected resource.', 'Calculated. Impressive.', 'Rarely seen.'],
      ['Noted.', 'Acceptable.', 'Neutral.'],
      ['Conclusive.', 'Checkmate.', 'As calculated.'],
      ['Victory recorded. Rare.', 'Congratulations.', 'A result for the records.'],
      ['Draw.', 'Equilibrium.', 'Balanced.'],
    ),
  },
  {
    id: 'griefer-gary', name: 'Griefer Gary', elo: 1500, title: 'GRIEFER', tagline: 'Here to ruin your day',
    personality: 'The toxic teammate. Mocks your mistakes, stalls on winning moves to burn your clock, celebrates loudly. Built to train your mental resilience.',
    hue: 10, piece: 'knight',
    skill: { depth: 4, skillLevel: 12, uciElo: 1500, blunderRate: 0.04 },
    chatter: {
      ...c(
        ['Oh look who just queued into ME. Bold.', 'Hope your day was going well. It is not anymore.', 'I am going to make this EXTRA painful.', 'Your rating is safe. Your pride is not.'],
        ['LOL seriously? That move?', 'You hung that?? In THIS economy?', 'My grandmother calculates better and she retired from chess in 1998.', 'Bold. Wrong, but bold.', 'I am adding that to my highlight reel.', 'Freeze! Actually no, legally I cannot do anything. Your move.'],
        ['Wait, that was actually good?! Who are you?!', 'Lucky. Pure luck.', 'Do not let it go to your head.', 'Okay that one was suspiciously skilled.'],
        ['Fine. One good move.', 'Beginner\'s luck.', 'Do it again. I dare you.'],
        ['SIT DOWN. You just lost to Griefer Gary.', 'GG EZ. Screenshot this.', 'And THAT is why you check your king twice.', 'Enjoy the loss. Frame it.'],
        ['You beat me?? TODAY?? Ugh. Whatever. gg.', 'Lucky game. I was sandbagging.', 'Enjoy your screenshot, champ.'],
        ['A draw?! Against ME?! I accept these terms.', 'Half a point. Fine.', 'Boring game anyway.'],
      ),
      grieferTaunt: [
        'Tick tock, take your time... oh wait, it is YOUR clock.',
        'Bold move. Wrong, but bold.',
        'I could win this with my eyes closed and honestly I am.',
        'You play chess like you are allergic to not losing.',
        'Blink twice if you need a hint.',
        'I am letting you win... psychologically speaking.',
        'This is why your mom said to learn the rules.',
        'Take your time, I have all day. And checkmate.',
      ],
    },
  },
];

export const GRIEFER_ID = 'griefer-gary';
export function botById(id: string): BotDef | undefined { return BOTS.find((b) => b.id === id); }

/* AI Coach voice — used in game review and hints */
export const COACH_LINES = {
  brilliant: [
    'Brilliant! A sacrifice that works — material is temporary, initiative is forever.',
    'Beautiful. You found a move most engines suggest but few humans see.',
    'Sound sacrifice! The position more than compensates for the material invested.',
  ],
  great: [
    'The only move that keeps the advantage. Everything else collapses.',
    'A critical moment, perfectly judged. This was the single best move.',
  ],
  best: [
    'Best move — exactly what the engine wants here.',
    'Cleanest continuation. Top engine choice, played.',
  ],
  good: [
    'A reasonable move. The engine has a slight preference elsewhere.',
    'Solid, playable — not the absolute tightest, but fine.',
  ],
  inaccuracy: [
    'Slightly imprecise — the opponent gets a bit more comfortable now.',
    'Not the most accurate, but the damage is limited.',
  ],
  mistake: [
    'This drops significant ground. The engine preferred a more careful move.',
    'A real mistake — the evaluation swung noticeably against you.',
  ],
  blunder: [
    'A blunder. This surrenders a decisive amount of the position.',
    'This allows the opponent a powerful continuation — position severely damaged.',
  ],
  book: ['Opening theory — well-prepared territory.'],
};
