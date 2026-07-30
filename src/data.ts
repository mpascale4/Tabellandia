/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorldConfig, ShopItem } from './types';

export const WORLDS_DATA: WorldConfig[] = [
  {
    id: 2,
    name: "La Foresta del 2",
    locationName: "Foresta del Cigno",
    color: "from-emerald-500 to-green-600",
    accentColor: "border-emerald-400 text-emerald-600 bg-emerald-50",
    symbol: "🌲",
    mascotName: "Ghiandoso",
    mascotRole: "Lo scoiattolo saggio",
    creatureName: "Smeraldino",
    creatureDescription: "Un piccolo drago-foglia verde smeraldo che ama nascondersi tra i rami.",
    filastrocca: "Saltan due ranocchie nello stagno verde, chi non sa contare la sua strada perde! Due, quattro, sei, otto, dieci furbacchioni, dodici, quattordici, sedici campioni! Diciotto e venti, con salti giganti, la Foresta del due è sbloccata per tutti quanti!",
    trickTitle: "La Via dei Pari",
    trickDescription: "Tutti i risultati della tabellina del 2 sono numeri PARI! Finiscono sempre con 0, 2, 4, 6 o 8. Se un risultato è dispari, hai sicuramente fatto un errore!",
    trickVisualExplanation: "Moltiplicare per 2 significa semplicemente RADDOPPIARE il numero di partenza! Ad esempio, 2 x 4 è come dire 4 + 4 = 8.",
    itemsToCount: "🌳",
    monuments: [
      { id: "m2_1", name: "Mulino delle Ghiande", cost: 15, description: "Riapre il mulino dove Ghiandoso prepara le provviste.", emoji: "⚙️🐿️" },
      { id: "m2_2", name: "Grande Quercia Antica", cost: 30, description: "Fa rifiorire le foglie d'oro della quercia sacra.", emoji: "🌳✨" },
      { id: "m2_3", name: "Ponte del Ruscello", cost: 50, description: "Ricostruisce il ponte di legno per attraversare la foresta.", emoji: "🌉🌊" }
    ]
  },
  {
    id: 3,
    name: "Il Lago del 3",
    locationName: "Lago dell'Euro",
    color: "from-sky-500 to-blue-600",
    accentColor: "border-sky-400 text-sky-600 bg-sky-50",
    symbol: "💧",
    mascotName: "Gocciolino",
    mascotRole: "Il pesciolino canterino",
    creatureName: "Squamaviva",
    creatureDescription: "Un sinuoso serpente marino azzurro zaffiro, ricoperto di scaglie luccicanti.",
    filastrocca: "Tre pesciolini van nel profondo blu, fanno tre capriole e poi tornano su! Tre, sei, nove, dodici stelline, quindici, diciotto, ventuno barchette piccoline! Ventiquattro, ventisette, trenta luccioli sul prato, il Lago del tre è tornato illuminato!",
    trickTitle: "La Somma Magica",
    trickDescription: "Se sommi le cifre del risultato della tabellina del 3, otterrai sempre 3, 6 o 9! Ad esempio, per 3 x 8 = 24, somma le cifre: 2 + 4 = 6. È magico!",
    trickVisualExplanation: "Moltiplicare per 3 significa fare tre passi della stessa misura! Ad esempio, 3 x 4 è 4 + 4 + 4 = 12.",
    itemsToCount: "💧",
    monuments: [
      { id: "m3_1", name: "Faro della Scogliera", cost: 20, description: "Riaccende la luce blu del faro del lago.", emoji: "🚨🌊" },
      { id: "m3_2", name: "Molo dei Desideri", cost: 35, description: "Ripara il molo di legno per far attraccare le barche.", emoji: "🛶🪵" },
      { id: "m3_3", name: "Geyser di Cristallo", cost: 60, description: "Sblocca l'antico geyser d'acqua curativa.", emoji: "⛲💎" }
    ]
  },
  {
    id: 4,
    name: "Le Montagne del 4",
    locationName: "Vette della Sedia",
    color: "from-amber-600 to-orange-700",
    accentColor: "border-amber-400 text-amber-700 bg-amber-50",
    symbol: "⛰️",
    mascotName: "Pietruzza",
    mascotRole: "Il sasso rotolante",
    creatureName: "Rocciosauro",
    creatureDescription: "Un possente triceratopo di pietra e ambra, forte e leale.",
    filastrocca: "Quattro caprette scalano la cima, mangiano l'erbetta fresca come prima! Quattro, otto, dodici, sedici scarponi, venti, ventiquattro, ventotto scalatori! Trentadue, trentasei, quaranta sassi d'oro, la Montagna del quattro ha ritrovato il suo tesoro!",
    trickTitle: "Raddoppia il Raddoppio",
    trickDescription: "Per moltiplicare un numero per 4, basta RADDOPPIARLO e poi RADDOPPIARLO ancora una volta! Ad esempio: 4 x 6? Fai il doppio di 6, che è 12. Poi fai il doppio di 12, che è 24!",
    trickVisualExplanation: "La tabellina del 4 è esattamente il doppio di quella del 2! Prova a confrontarle passo dopo passo.",
    itemsToCount: "⛰️",
    monuments: [
      { id: "m4_1", name: "Funivia dell'Ambra", cost: 25, description: "Rimette in funzione le cabine colorate per salire in vetta.", emoji: "🚡🚠" },
      { id: "m4_2", name: "Rifugio degli Alpini", cost: 40, description: "Ricostruisce lo chalet di pietra in alta quota.", emoji: "🏡⛰️" },
      { id: "m4_3", name: "Altare dei Giganti", cost: 70, description: "Riassembla il cerchio di pietre mistiche montane.", emoji: "🗿🪨" }
    ]
  },
  {
    id: 5,
    name: "Le Caverne del 5",
    locationName: "Grotte del Serpente",
    color: "from-yellow-500 to-amber-500",
    accentColor: "border-yellow-400 text-yellow-600 bg-yellow-50",
    symbol: "🍄",
    mascotName: "Luminoso",
    mascotRole: "La lucciola esploratrice",
    creatureName: "Luminotto",
    creatureDescription: "Un gufo con piume cristalline che emana una luce calda e rassicurante.",
    filastrocca: "Cinque dita aperte per fare un saluto, ogni pipistrello chiede aiuto! Cinque, dieci, quindici, venti lampadine, venticinque, trenta, trentacinque gemme preziose e piccoline! Quaranta, quarantacinque, cinquanta passi nel mistero, la Caverna del cinque risplende davvero!",
    trickTitle: "La Danza dello Zero e del Cinque",
    trickDescription: "Tutti i numeri della tabellina del 5 finiscono ESCLUSIVAMENTE con 0 o con 5! Se moltiplichi 5 per un numero PARI finisce con 0 (es. 5 x 6 = 30). Se lo moltiplichi per un numero DISPARI finisce con 5 (es. 5 x 7 = 35)!",
    trickVisualExplanation: "Pensa alle dita di una mano! Ogni mano intera vale 5. Contare per 5 è come contare i palmi aperti delle mani.",
    itemsToCount: "🍄",
    monuments: [
      { id: "m5_1", name: "Ponte di Cristallo", cost: 30, description: "Ricostruisce un magico ponte sospeso di cristalli luminosi.", emoji: "🌉💎" },
      { id: "m5_2", name: "Tempio dei Funghi", cost: 45, description: "Restaura il cerchio sacro dei funghi luminescenti giganti.", emoji: "🍄🕌" },
      { id: "m5_3", name: "Miniera dei Diamanti", cost: 80, description: "Riattiva i binari dei carrelli della miniera sotterranea.", emoji: "🛒💎" }
    ]
  },
  {
    id: 6,
    name: "Il Vulcano del 6",
    locationName: "Cratere della Chiocciola",
    color: "from-red-500 to-rose-600",
    accentColor: "border-red-400 text-red-600 bg-red-50",
    symbol: "🔥",
    mascotName: "Fiammetta",
    mascotRole: "La scintilla giocosa",
    creatureName: "Bracioletto",
    creatureDescription: "Un simpatico fenicottero di fuoco che depone uova di carbone ardente.",
    filastrocca: "Sei formichine marciano d'un fiato, portano il cibo sul prato infuocato! Sei, dodici, diciotto, ventiquattro chicchi di grano, trenta, trentasei, quarantadue teniamoci per mano! Quarantotto, cinquantaquattro, sessanta braci accese, il Vulcano del sei ha vinto il suo mese!",
    trickTitle: "L'Amicizia dei Pari",
    trickDescription: "Quando moltiplichi il 6 per un numero PARI (2, 4, 6, 8), l'ultima cifra del risultato è ESATTAMENTE lo stesso numero! Inoltre, la cifra delle decine è la METÀ del numero stesso! Esempio: 6 x 4 = 24 (l'ultima cifra è 4, la prima è la metà di 4 cioè 2)! Oppure 6 x 8 = 48!",
    trickVisualExplanation: "La tabellina del 6 è il doppio di quella del 3! Inoltre, 6 x N è uguale a (5 x N) + N (es. 6 x 7 = 5 x 7 [35] + 7 = 42). Comodo, vero?",
    itemsToCount: "🔥",
    monuments: [
      { id: "m6_1", name: "Forge Vulcaniche", cost: 35, description: "Riattiva la grande forgia dei nani del vulcano.", emoji: "🌋🔨" },
      { id: "m6_2", name: "Sorgenti Termali", cost: 50, description: "Ripristina le calde terme rilassanti intorno al cratere.", emoji: "🛁🌋" },
      { id: "m6_3", name: "Tempio di Magma", cost: 90, description: "Ricostruisce la grande cupola protettiva di pietra lavica.", emoji: "🛕🔥" }
    ]
  },
  {
    id: 7,
    name: "La Torre del 7",
    locationName: "Guglia del Fulmine",
    color: "from-purple-600 to-indigo-700",
    accentColor: "border-purple-400 text-purple-700 bg-purple-50",
    symbol: "🔑",
    mascotName: "Bastian",
    mascotRole: "Il gufo mago",
    creatureName: "Alaruna",
    creatureDescription: "Un maestoso grifone dalle penne viola e rune magiche che brillano d'oro.",
    filastrocca: "Sette cavalieri difendono le mura, contro la nebbia non hanno paura! Sette, quattordici, ventuno spade lucenti, ventotto, trentacinque, quarantadue scudi splendenti! Quarantanove, cinquantasei, sessantatré bandiere spiegate, settanta torri sono state liberate!",
    trickTitle: "Il Segreto di 5, 6, 7, 8!",
    trickDescription: "La moltiplicazione più difficile della tabellina del 7 è 7 x 8. Ricorda questa sequenza numerica consecutiva: 5, 6, 7, 8! Quindi 56 = 7 x 8! Semplice e indimenticabile!",
    trickVisualExplanation: "Il 7 è un numero magico e misterioso, non ha trucchi facilissimi ma puoi usare le altre tabelline: es. 7 x 6 è uguale a 6 x 7 (42), che conosci già!",
    itemsToCount: "🔑",
    monuments: [
      { id: "m7_1", name: "Biblioteca Arcana", cost: 40, description: "Riordina i libri magici persi nella tempesta matematica.", emoji: "📚🧙‍♂️" },
      { id: "m7_2", name: "Laboratorio Alchemico", cost: 55, description: "Ripristina gli alambicchi e le pozioni magiche della torre.", emoji: "🧪🔮" },
      { id: "m7_3", name: "Osservatorio Stellare", cost: 100, description: "Ricostruisce il grande telescopio sulla punta della torre.", emoji: "🔭🌌" }
    ]
  },
  {
    id: 8,
    name: "La Città Volante dell'8",
    locationName: "Nuvola dell'Infinito",
    color: "from-pink-500 to-rose-600",
    accentColor: "border-pink-400 text-pink-600 bg-pink-50",
    symbol: "⚙️",
    mascotName: "Elica",
    mascotRole: "La robottina ronzante",
    creatureName: "Ingranaggino",
    creatureDescription: "Un tenero pegaso robotico con ali composte da ingranaggi in ottone dorato.",
    filastrocca: "Otto aeroplani volan tra le nubi, scacciano via i pensieri cupi! Otto, sedici, ventiquattro eliche in volo, trentadue, quaranta, quarantotto piloti da solo! Cinquantasei, sessantaquattro, settantadue bulloni d'argento, ottanta mongolfiere volan nel vento!",
    trickTitle: "Tre Volte il Doppio",
    trickDescription: "Moltiplicare per 8 significa fare il DOPPIO di un numero, poi ancora il DOPPIO, e infine ancora il DOPPIO! Esempio: 8 x 5? Il doppio di 5 è 10. Il doppio di 10 è 20. Il doppio di 20 è 40! Tre raddoppi di fila!",
    trickVisualExplanation: "La tabellina dell'8 è il doppio esatto della tabellina del 4! Ogni risultato è raddoppiato.",
    itemsToCount: "⚙️",
    monuments: [
      { id: "m8_1", name: "Stazione Dirigibili", cost: 45, description: "Ripara la banchina di attracco per i vascelli volanti.", emoji: "⚓💨" },
      { id: "m8_2", name: "Fabbrica di Giocattoli", cost: 60, description: "Riaccende i macchinari della fantastica fabbrica automatica.", emoji: "🧸🤖" },
      { id: "m8_3", name: "Centrale Eolica", cost: 110, description: "Ricollega i grandi mulini che mantengono l'isola in volo.", emoji: "🛞💨" }
    ]
  },
  {
    id: 9,
    name: "Il Tempio del 9",
    locationName: "Santuario del Palloncino",
    color: "from-teal-500 to-cyan-600",
    accentColor: "border-teal-400 text-teal-600 bg-teal-50",
    symbol: "🐢",
    mascotName: "Saggio Zen",
    mascotRole: "La tartaruga centenaria",
    creatureName: "Nembocumulo",
    creatureDescription: "Un nobile drago-nuvola azzurro pastello che cavalca le correnti d'aria.",
    filastrocca: "Nove lanterne splendono nel tempio, ogni allievo segue il buon esempio! Nove, diciotto, ventisette rintocchi d'ottone, trentasei, quarantacinque, cinquantaquattro ore di meditazione! Sessantatré, settantadue, ottantuno incensi profumati, novanta grandi saggi sono arrivati!",
    trickTitle: "Il Trucco delle Mani Magiche",
    trickDescription: "Apri le 10 dita davanti a te. Per calcolare 9 x N, piega verso il basso l'N-esimo dito da sinistra. Le dita a sinistra del dito piegato sono le DECINE, quelle a destra sono le UNITÀ! Esempio: 9 x 4. Piega il quarto dito. A sinistra restano 3 dita (3 decine), a destra 6 dita (6 unità) = 36!",
    trickVisualExplanation: "Un altro trucco: la cifra delle decine del risultato è sempre inferiore di 1 rispetto al moltiplicatore (es. 9 x 8 -> decine = 7). Inoltre, la somma delle due cifre del risultato fa sempre 9 (7 + 2 = 9)! Quindi 72!",
    itemsToCount: "🐢",
    monuments: [
      { id: "m9_1", name: "Campanile del Vento", cost: 50, description: "Riappende i rintocchi di giada che purificano l'aria del tempio.", emoji: "🔔💨" },
      { id: "m9_2", name: "Giardino Zen", cost: 70, description: "Ripiana le sabbie bianche e i laghetti di fiori di loto sacri.", emoji: "🪨🪷" },
      { id: "m9_3", name: "Pagoda della Saggezza", cost: 120, description: "Restaura l'antica pagoda a nove piani crollata.", emoji: "⛩️🏯" }
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
