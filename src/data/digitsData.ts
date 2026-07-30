export interface DigitAlternative {
  emoji: string;
  imageLabel: string;
  reason: string;
}

export interface DigitInfo {
  digit: number;
  word: string;
  emoji: string;
  imageLabel: string;
  reason: string;
  alternatives: DigitAlternative[];
}

export const DIGITS_INFO: DigitInfo[] = [
  {
    digit: 0,
    word: "zero",
    emoji: "🥚",
    imageLabel: "Uovo",
    reason: "La forma ovale e chiusa dello zero ricorda perfettamente un uovo: arrotondato, senza angoli, tutto racchiuso su se stesso.",
    alternatives: []
  },
  {
    digit: 1,
    word: "uno",
    emoji: "⛏️",
    imageLabel: "Piccone",
    reason: "Il manico lungo e dritto è la linea verticale dell'1, mentre la testa con le punte in cima ricorda il piccolo tratto obliquo che apre la cifra.",
    alternatives: []
  },
  {
    digit: 2,
    word: "due",
    emoji: "🦢",
    imageLabel: "Cigno",
    reason: "Il collo del cigno si piega elegantemente in avanti e poi si allunga verso il basso, disegnando esattamente la curva del 2.",
    alternatives: []
  },
  {
    digit: 3,
    word: "tre",
    emoji: "💶",
    imageLabel: "Euro",
    reason: "Il simbolo dell'euro € è quasi identico al 3: la stessa doppia curva aperta a sinistra, con due stanghette orizzontali che la attraversano nel mezzo.",
    alternatives: []
  },
  {
    digit: 4,
    word: "quattro",
    emoji: "🪑",
    imageLabel: "Sedia",
    reason: "Guardala di lato: lo schienale dritto è la parte verticale del 4, e la seduta orizzontale forma il braccio trasversale della cifra.",
    alternatives: []
  },
  {
    digit: 5,
    word: "cinque",
    emoji: "🐍",
    imageLabel: "Serpente",
    reason: "Il corpo del serpente si piega ad angolo retto con la testa tonda in basso e il collo che risale, disegnando la forma spigolosa del 5.",
    alternatives: []
  },
  {
    digit: 6,
    word: "sei",
    emoji: "🐌",
    imageLabel: "Chiocciola",
    reason: "Il guscio a spirale della chiocciola forma il cerchio in fondo al 6, e il corpo si allunga verso l'alto come il tratto curvo della cifra.",
    alternatives: []
  },
  {
    digit: 7,
    word: "sette",
    emoji: "⚡",
    imageLabel: "Fulmine",
    reason: "Il fulmine scende a zig-zag con un angolo acuto netto, proprio come il tratto spezzato del 7.",
    alternatives: []
  },
  {
    digit: 8,
    word: "otto",
    emoji: "♾️",
    imageLabel: "Infinito",
    reason: "L'otto è come il simbolo dell'infinito (∞) messo in piedi: due cerchi sovrapposti che si toccano al centro.",
    alternatives: []
  },
  {
    digit: 9,
    word: "nove",
    emoji: "🎈",
    imageLabel: "Palloncino",
    reason: "Il cerchio gonfio in alto è il palloncino, e il filo che scende verso il basso è il tratto finale del 9.",
    alternatives: []
  }
];
