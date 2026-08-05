/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorldConfig, ShopItem } from './types';

export const WORLDS_DATA: WorldConfig[] = [
  {
    id: 2,
    name: "Il Cielo del Cigno",
    locationName: "Regno di Orion",
    color: "from-blue-400 to-cyan-500",
    accentColor: "border-blue-400 text-blue-600 bg-blue-50",
    symbol: "🦢",
    mascotName: "Orion",
    mascotRole: "Il Cigno Predestinato",
    creatureName: "Ala Azzurra",
    creatureDescription: "Un giovane cigno bianco con piume argento che emana luce celeste. Segue sempre il volo di Orion cercando di capire il suo destino.",
    filastrocca: "Due ali spiegate nel cielo sereno, il Cigno Orion vola leggero! Due, quattro, sei, otto, dieci colpi d'ala, dodici, quattordici, sedici salti di gala! Diciotto e venti, con voli giganti, il Cigno del due è libero e quanti!",
    trickTitle: "La Via dei Pari",
    trickDescription: "Tutti i risultati della tabellina del 2 sono numeri PARI! Finiscono sempre con 0, 2, 4, 6 o 8. Se un risultato è dispari, hai sicuramente fatto un errore!",
    trickVisualExplanation: "Moltiplicare per 2 significa semplicemente RADDOPPIARE il numero di partenza! Ad esempio, 2 x 4 è come dire 4 + 4 = 8.",
    itemsToCount: "🦢",
    monuments: [
      { id: "m2_1", name: "Cigno Orion", cost: 15, description: "Il primo segno nel cielo.", emoji: "🦢" },
      { id: "m2_2", name: "Piccone", cost: 30, description: "La roccia che apre il passaggio.", emoji: "⛏️" },
      { id: "m2_3", name: "Moneta rara", cost: 45, description: "La firma del destino.", emoji: "💶" }
    ]
  },
  {
    id: 3,
    name: "La Via dell'Euro",
    locationName: "Via dell'Euro",
    color: "from-yellow-500 to-amber-500",
    accentColor: "border-yellow-400 text-yellow-600 bg-yellow-50",
    symbol: "💶",
    mascotName: "La Moneta Rara",
    mascotRole: "Il Segno del Destino",
    creatureName: "Scintilla d'Oro",
    creatureDescription: "Una piccola fenice dorata che vive dentro il simbolo della Moneta, custodendo il segreto dell'identità di Orion.",
    filastrocca: "Tre monete brillan nella pietra scura, ognuna di esse è una firma pura! Tre, sei, nove, dodici rilievi d'oro, quindici, diciotto, ventuno tesoro! Ventiquattro, ventisette, trenta incisioni profonde, la Caverna della Moneta guarda oltre le onde!",
    trickTitle: "La Somma Magica",
    trickDescription: "Se sommi le cifre del risultato della tabellina del 3, otterrai sempre 3, 6 o 9! Ad esempio, per 3 x 8 = 24, somma le cifre: 2 + 4 = 6. È magico!",
    trickVisualExplanation: "Moltiplicare per 3 significa fare tre passi della stessa misura! Ad esempio, 3 x 4 è 4 + 4 + 4 = 12.",
    itemsToCount: "💶",
    monuments: [
      { id: "m3_1", name: "Moneta rara", cost: 15, description: "Il segno che Orion cerca.", emoji: "💶" },
      { id: "m3_2", name: "Specchio di cristallo", cost: 30, description: "Il riflesso che conferma la strada.", emoji: "🪞" },
      { id: "m3_3", name: "Ali del destino", cost: 45, description: "La rotta che conduce oltre.", emoji: "🪽" }
    ]
  },
  {
    id: 4,
    name: "Il Segreto della Sedia",
    locationName: "Le Acque della Sedia Magica",
    color: "from-violet-500 to-purple-600",
    accentColor: "border-violet-400 text-violet-600 bg-violet-50",
    symbol: "🪑",
    mascotName: "La Sedia Magica",
    mascotRole: "Il Trono del Potere Antico",
    creatureName: "Specchio Eterno",
    creatureDescription: "Un'entità luminosa che risiede nel riflesso perfetto della Sedia, manifestazione del doppio e della trasformazione.",
    filastrocca: "Quattro sedie emergon dal lago di sale, ognuna raduna i saggi di bontà e valore! Quattro, otto, dodici, sedici specchi luminosi, venti, ventiquattro, ventotto troni gloriosi! Trentadue, trentasei, quaranta onde d'argento, quarantaquattro sedie volano nel vento!",
    trickTitle: "Raddoppia il Raddoppio",
    trickDescription: "Per moltiplicare un numero per 4, basta RADDOPPIARLO e poi RADDOPPIARLO ancora una volta! Ad esempio: 4 x 6? Fai il doppio di 6, che è 12. Poi fai il doppio di 12, che è 24!",
    trickVisualExplanation: "La tabellina del 4 è esattamente il doppio di quella del 2! Prova a confrontarle passo dopo passo.",
    itemsToCount: "🪑",
    monuments: [
      { id: "m4_1", name: "Sedia Magica", cost: 15, description: "Il trono che apre il segreto.", emoji: "🪑" },
      { id: "m4_2", name: "Lago di cristallo", cost: 30, description: "Il riflesso che raddoppia la verità.", emoji: "💧" },
      { id: "m4_3", name: "Infinito", cost: 45, description: "Il cuore del passo.", emoji: "♾️" }
    ]
  },
  {
    id: 5,
    name: "La Grotta del Serpente",
    locationName: "Grotta del Serpente Guida",
    color: "from-green-500 to-emerald-600",
    accentColor: "border-green-400 text-green-600 bg-green-50",
    symbol: "🐍",
    mascotName: "Bobo",
    mascotRole: "Il Serpente Guida",
    creatureName: "Onda Silenziosa",
    creatureDescription: "Un piccolo serpente azzurro che scivola attraverso l'acqua nera del sotterraneo, conoscitore di ogni sentiero nascosto.",
    filastrocca: "Cinque serpenti striscia nel buio, cinque le strade che non han più dubbio! Cinque, dieci, quindici, venti passaggi segreti, venticinque, trenta, trentacinque guidati dai venti! Quaranta, quarantacinque, cinquanta percorsi nel mistero, le Caverne di Bobo ti guidano davvero!",
    trickTitle: "La Danza dello Zero e del Cinque",
    trickDescription: "Tutti i numeri della tabellina del 5 finiscono ESCLUSIVAMENTE con 0 o con 5! Se moltiplichi 5 per un numero PARI finisce con 0 (es. 5 x 6 = 30). Se lo moltiplichi per un numero DISPARI finisce con 5 (es. 5 x 7 = 35)!",
    trickVisualExplanation: "Pensa alle dita di una mano! Ogni mano intera vale 5. Contare per 5 è come contare i palmi aperti delle mani.",
    itemsToCount: "🐍",
    monuments: [
      { id: "m5_1", name: "Serpente Bobo", cost: 15, description: "La guida che conosce il buio.", emoji: "🐍" },
      { id: "m5_2", name: "Ponte sommerso", cost: 30, description: "Il passaggio sotto l'acqua.", emoji: "🌉" },
      { id: "m5_3", name: "Segni incisi", cost: 45, description: "Le tracce lasciate nella roccia.", emoji: "⛏️" }
    ]
  },
  {
    id: 6,
    name: "Il Santuario della Chiocciola",
    locationName: "Corridoi della Saggezza Incisa",
    color: "from-pink-500 to-rose-600",
    accentColor: "border-pink-400 text-pink-600 bg-pink-50",
    symbol: "🐌",
    mascotName: "Lina",
    mascotRole: "La Chiocciola Saggia",
    creatureName: "Eco del Consiglio",
    creatureDescription: "Una antica chiocciola che sussurra la sua saggezza nel silenzio, le sue parole incise nella roccia per l'eternità.",
    filastrocca: "Sei voci susurrano nel buio profondo, sei le strade dove Lina ha fatto il mondo! Sei, dodici, diciotto, ventiquattro saggezze, trenta, trentasei, quarantadue finezze! Quarantotto, cinquantaquattro, sessanta sussurri nel vento, il Santuario di Lina è il suo sacramento!",
    trickTitle: "L'Amicizia dei Pari",
    trickDescription: "Quando moltiplichi il 6 per un numero PARI (2, 4, 6, 8), l'ultima cifra del risultato è ESATTAMENTE lo stesso numero! Inoltre, la cifra delle decine è la METÀ del numero stesso! Esempio: 6 x 4 = 24 (l'ultima cifra è 4, la prima è la metà di 4 cioè 2)! Oppure 6 x 8 = 48!",
    trickVisualExplanation: "La tabellina del 6 è il doppio di quella del 3! Inoltre, 6 x N è uguale a (5 x N) + N (es. 6 x 7 = 5 x 7 [35] + 7 = 42). Comodo, vero?",
    itemsToCount: "🐌",
    monuments: [
      { id: "m6_1", name: "Chiocciola Lina", cost: 15, description: "La voce che non si dimentica.", emoji: "🐌" },
      { id: "m6_2", name: "Consigli incisi", cost: 30, description: "Le parole lasciate nella pietra.", emoji: "📜" },
      { id: "m6_3", name: "Porta della fede", cost: 45, description: "La soglia che si apre ascoltando.", emoji: "🚪" }
    ]
  },
  {
    id: 7,
    name: "La Terra dei Fulmini",
    locationName: "Campi della Rivelazione",
    color: "from-purple-600 to-indigo-700",
    accentColor: "border-purple-400 text-purple-700 bg-purple-50",
    symbol: "⚡",
    mascotName: "Il Fulmine",
    mascotRole: "Illuminatore di Verità",
    creatureName: "Saetta Conscia",
    creatureDescription: "Un fulmine intelligente che squarcia i cieli con precisione, rivelando i segni incisi nelle pietre e illuminando il cammino di Orion.",
    filastrocca: "Sette fulmini squarcian il cielo scuro, sette i segni che rendono il cammino sicuro! Sette, quattordici, ventuno lampi incisivi, ventotto, trentacinque, quarantadue illuminativi! Quarantanove, cinquantasei, sessantatré bagliori d'oro, settanta rivelazioni nel cielo di Tabellandia sonoro!",
    trickTitle: "Il Segreto di 5, 6, 7, 8!",
    trickDescription: "La moltiplicazione più difficile della tabellina del 7 è 7 x 8. Ricorda questa sequenza numerica consecutiva: 5, 6, 7, 8! Quindi 56 = 7 x 8! Semplice e indimenticabile!",
    trickVisualExplanation: "Il 7 è un numero magico e misterioso, non ha trucchi facilissimi ma puoi usare le altre tabelline: es. 7 x 6 è uguale a 6 x 7 (42), che conosci già!",
    itemsToCount: "⚡",
    monuments: [
      { id: "m7_1", name: "Fulmine", cost: 15, description: "La luce che squarcia il cielo.", emoji: "⚡" },
      { id: "m7_2", name: "Infinito illuminato", cost: 30, description: "Il cuore che appare nel lampo.", emoji: "♾️" },
      { id: "m7_3", name: "Segni rivelati", cost: 45, description: "Le tracce che si leggono con la luce.", emoji: "✨" }
    ]
  },
  {
    id: 8,
    name: "Il Cuore dell'Infinito",
    locationName: "Roccia Centrale dell'Eternità",
    color: "from-pink-500 to-rose-600",
    accentColor: "border-pink-400 text-pink-600 bg-pink-50",
    symbol: "♾️",
    mascotName: "L'Infinito",
    mascotRole: "Il Centro di Tutto",
    creatureName: "Spirale Eterna",
    creatureDescription: "Un'entità di pura energia che scorre nel simbolo dell'Infinito, manifestazione della continuità e del ciclo eterno.",
    filastrocca: "Otto Infiniti si intrecciano nella pietra, formando un segreto che non smette. Otto, sedici, ventiquattro spirali eterne, trentadue, quaranta, quarantotto schiere superne! Cinquantasei, sessantaquattro, settantadue legami invisibili, ottanta verità sono diventate possibili!",
    trickTitle: "Tre Volte il Doppio",
    trickDescription: "Moltiplicare per 8 significa fare il DOPPIO di un numero, poi ancora il DOPPIO, e infine ancora il DOPPIO! Esempio: 8 x 5? Il doppio di 5 è 10. Il doppio di 10 è 20. Il doppio di 20 è 40! Tre raddoppi di fila!",
    trickVisualExplanation: "La tabellina dell'8 è il doppio esatto della tabellina del 4! Ogni risultato è raddoppiato.",
    itemsToCount: "♾️",
    monuments: [
      { id: "m8_1", name: "Infinito", cost: 15, description: "Il centro di tutto.", emoji: "♾️" },
      { id: "m8_2", name: "Chiave doppia", cost: 30, description: "La combinazione che apre la porta.", emoji: "🔑" },
      { id: "m8_3", name: "Cuore del potere", cost: 45, description: "L'energia che tiene uniti i mondi.", emoji: "🌀" }
    ]
  },
  {
    id: 9,
    name: "Il Cammino del Palloncino",
    locationName: "Sentieri Rossi Invisibili",
    color: "from-teal-500 to-cyan-600",
    accentColor: "border-teal-400 text-teal-600 bg-teal-50",
    symbol: "🎈",
    mascotName: "Il Palloncino Rosso",
    mascotRole: "Guida Finale e Invisibile",
    creatureName: "Libertà Volante",
    creatureDescription: "Un palloncino rosso che flotta nel cielo, tracciando rotte invisibili e guidando Orion verso la rivelazione finale e la completezza.",
    filastrocca: "Nove palloncini volano nel cielo, tracciando il cammino dove la verità è il giallo! Nove, diciotto, ventisette segnali rossi, trentasei, quarantacinque, cinquantaquattro luminosi! Sessantatré, settantadue, ottantuno voli ascendenti, novanta vie aperte ai convergenti!",
    trickTitle: "Il Trucco delle Mani Magiche",
    trickDescription: "Apri le 10 dita davanti a te. Per calcolare 9 x N, piega verso il basso l'N-esimo dito da sinistra. Le dita a sinistra del dito piegato sono le DECINE, quelle a destra sono le UNITÀ! Esempio: 9 x 4. Piega il quarto dito. A sinistra restano 3 dita (3 decine), a destra 6 dita (6 unità) = 36!",
    trickVisualExplanation: "Un altro trucco: la cifra delle decine del risultato è sempre inferiore di 1 rispetto al moltiplicatore (es. 9 x 8 -> decine = 7). Inoltre, la somma delle due cifre del risultato fa sempre 9 (7 + 2 = 9)! Quindi 72!",
    itemsToCount: "🎈",
    monuments: [
      { id: "m9_1", name: "Palloncino rosso", cost: 15, description: "La rotta invisibile.", emoji: "🎈" },
      { id: "m9_2", name: "Piccone finale", cost: 30, description: "L'ultimo segno inciso.", emoji: "⛏️" },
      { id: "m9_3", name: "Porta della verità", cost: 45, description: "L'uscita del mistero.", emoji: "🚪" }
    ]
  }
];

export const SHOP_ITEMS: ShopItem[] = [
  // Capelli
  { id: "hair_1", name: "Cresta Punk Rossa", category: "hair", cost: 15, value: "🔴 Cresta Punk", previewEmoji: "🦱" },
  { id: "hair_2", name: "Treccine Lillà", category: "hair", cost: 20, value: "🟣 Treccine", previewEmoji: "👧" },
  { id: "hair_3", name: "Ciuffo Blu Elettrico", category: "hair", cost: 18, value: "🔵 Ciuffo Blu", previewEmoji: "💇" },
  { id: "hair_4", name: "Chioma Dorata da Re", category: "hair", cost: 35, value: "🟡 Chioma Dorata", previewEmoji: "👱" },
  
  // Magliette
  { id: "shirt_1", name: "Mantello dell'Eroe", category: "shirt", cost: 25, value: "🥋 Mantello Rosso", previewEmoji: "🧣" },
  { id: "shirt_2", name: "Armatura di Smeraldo", category: "shirt", cost: 40, value: "🛡️ Armatura Verde", previewEmoji: "👕" },
  { id: "shirt_3", name: "T-Shirt Spaziale a Stelle", category: "shirt", cost: 15, value: "🌌 Maglia Stellare", previewEmoji: "👚" },
  { id: "shirt_4", name: "Tunica del Mago", category: "shirt", cost: 30, value: "🧙‍♂️ Tunica Viola", previewEmoji: "👘" },
  
  // Pantaloni
  { id: "pants_1", name: "Pantaloni Ninja Neri", category: "pants", cost: 20, value: "👖 Ninja Neri", previewEmoji: "🧦" },
  { id: "pants_2", name: "Gonna Scintillante Rosa", category: "pants", cost: 25, value: "👗 Gonna Rosa", previewEmoji: "👗" },
  { id: "pants_3", name: "Stivali d'Oro e Jeans", category: "pants", cost: 35, value: "👢 Stivali Oro", previewEmoji: "👖" },
  
  // Cappelli
  { id: "hat_1", name: "Cappello da Mago Stellato", category: "hat", cost: 25, value: "🧙‍♂️ Cappello Stellato", previewEmoji: "🎩" },
  { id: "hat_2", name: "Corona d'Oro di Tabellandia", category: "hat", cost: 60, value: "👑 Corona Real", previewEmoji: "👑" },
  { id: "hat_3", name: "Elmo da Cavaliere", category: "hat", cost: 45, value: "🪖 Elmo Acciaio", previewEmoji: "🪖" },
  { id: "hat_4", name: "Cappellino da Aviatore", category: "hat", cost: 15, value: "🧑‍✈️ Aviatore", previewEmoji: "🧢" },

  // Zaini
  { id: "backpack_1", name: "Ali Jetpack a Vapore", category: "backpack", cost: 50, value: "🚀 Jetpack", previewEmoji: "🎒" },
  { id: "backpack_2", name: "Guscio di Tartaruga Saggia", category: "backpack", cost: 30, value: "🐢 Guscio", previewEmoji: "🎒" },
  { id: "backpack_3", name: "Scudo del Drago", category: "backpack", cost: 40, value: "🛡️ Scudo Drago", previewEmoji: "🛡️" }
];

export const AVATARS = [
  // Bambini
  { id: "avatar_boy1", emoji: "👦", name: "Bambino", category: "boy" },
  { id: "avatar_boy2", emoji: "🧒", name: "Bambino Curioso", category: "boy" },
  { id: "avatar_boy3", emoji: "🎨", name: "Artista", category: "boy" },
  { id: "avatar_boy4", emoji: "🚀", name: "Astronauta", category: "boy" },
  
  // Bambine
  { id: "avatar_girl1", emoji: "👧", name: "Bambina", category: "girl" },
  { id: "avatar_girl2", emoji: "👱", name: "Bionda", category: "girl" },
  { id: "avatar_girl3", emoji: "🏃", name: "Sportiva", category: "girl" },
  { id: "avatar_girl4", emoji: "🧙", name: "Maga", category: "girl" }
];
