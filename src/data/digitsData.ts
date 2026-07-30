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
    alternatives: [
      {
        emoji: "🍩",
        imageLabel: "Ciambella",
        reason: "Come una ciambella vista dall'alto: un cerchio con il buco nel mezzo, proprio come il contorno dello zero."
      }
    ]
  },
  {
    digit: 1,
    word: "uno",
    emoji: "⛏️",
    imageLabel: "Piccone",
    reason: "Il manico lungo e dritto è la linea verticale dell'1, mentre la testa con le punte in cima ricorda il piccolo tratto obliquo che apre la cifra.",
    alternatives: [
      {
        emoji: "🕯️",
        imageLabel: "Candela",
        reason: "È lunga, dritta e verticale, proprio come una candela accesa sul tavolo."
      }
    ]
  },
  {
    digit: 2,
    word: "due",
    emoji: "🦢",
    imageLabel: "Cigno",
    reason: "Il collo del cigno si piega elegantemente in avanti e poi si allunga verso il basso, disegnando esattamente la curva del 2.",
    alternatives: [
      {
        emoji: "🐂",
        imageLabel: "Bue",
        reason: "Bue fa rima con DUE e ha 2 corna sulla testa!"
      }
    ]
  },
  {
    digit: 3,
    word: "tre",
    emoji: "💶",
    imageLabel: "Euro",
    reason: "Il simbolo dell'euro € è quasi identico al 3: la stessa doppia curva aperta a sinistra, con due stanghette orizzontali che la attraversano nel mezzo.",
    alternatives: [
      {
        emoji: "👑",
        imageLabel: "Re",
        reason: "Re fa rima con TRE e indossa una corona a 3 punte!"
      }
    ]
  },
  {
    digit: 4,
    word: "quattro",
    emoji: "🪑",
    imageLabel: "Sedia",
    reason: "Guardala di lato: lo schienale dritto è la parte verticale del 4, e la seduta orizzontale forma il braccio trasversale della cifra.",
    alternatives: [
      {
        emoji: "🐈",
        imageLabel: "Gatto",
        reason: "Ricorda la mossa del gatto accucciato ('quatto-gatto') e le sue 4 zampe!"
      }
    ]
  },
  {
    digit: 5,
    word: "cinque",
    emoji: "🐍",
    imageLabel: "Serpente",
    reason: "Il corpo del serpente si piega ad angolo retto con la testa tonda in basso e il collo che risale, disegnando la forma spigolosa del 5.",
    alternatives: [
      {
        emoji: "✋",
        imageLabel: "Mano",
        reason: "Rappresenta le 5 dita della mano aperta quando fai un saluto!"
      }
    ]
  },
  {
    digit: 6,
    word: "sei",
    emoji: "🐌",
    imageLabel: "Chiocciola",
    reason: "Il guscio a spirale della chiocciola forma il cerchio in fondo al 6, e il corpo si allunga verso l'alto come il tratto curvo della cifra.",
    alternatives: [
      {
        emoji: "🌀",
        imageLabel: "Spirale",
        reason: "La spirale parte dall'alto e si arrotola su se stessa verso il basso, proprio come il tratto del 6."
      }
    ]
  },
  {
    digit: 7,
    word: "sette",
    emoji: "⚡",
    imageLabel: "Fulmine",
    reason: "Il fulmine scende a zig-zag con un angolo acuto netto, proprio come il tratto spezzato del 7.",
    alternatives: [
      {
        emoji: "🧙",
        imageLabel: "Nano",
        reason: "Ricorda i 7 Nani delle fiabe e il loro cappello a punta!"
      }
    ]
  },
  {
    digit: 8,
    word: "otto",
    emoji: "♾️",
    imageLabel: "Infinito",
    reason: "L'otto è come il simbolo dell'infinito (∞) messo in piedi: due cerchi sovrapposti che si toccano al centro.",
    alternatives: [
      {
        emoji: "🥽",
        imageLabel: "Occhiali",
        reason: "Due lenti rotonde unite al centro: visti di fronte, gli occhiali hanno esattamente la forma dell'8."
      }
    ]
  },
  {
    digit: 9,
    word: "nove",
    emoji: "🎈",
    imageLabel: "Palloncino",
    reason: "Il cerchio gonfio in alto è il palloncino, e il filo che scende verso il basso è il tratto finale del 9.",
    alternatives: [
      {
        emoji: "🚢",
        imageLabel: "Nave",
        reason: "Nave fa rima con N-OVE e solca i mari con le sue grandi vele!"
      }
    ]
  }
];
