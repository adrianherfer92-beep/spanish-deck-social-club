export interface GameInfo {
  id: string;
  name: string;
  tagline: string;
  players: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  complexity: string;
  complexityDetail: string;
  objective: string;
  rules: string[];
  tips: string[];
}

export const GAMES: GameInfo[] = [
  {
    id: "cinquillo",
    name: "Cinquillo",
    tagline: "Construye las escaleras desde el cinco.",
    players: "2 a 8 jugadores",
    minPlayers: 2,
    maxPlayers: 8,
    duration: "10-15 min",
    complexity: "Fácil",
    complexityDetail: "Ordenar cartas y elegir qué palo abrir.",
    objective: "Ser el primero en quedarse sin cartas.",
    rules: [
      "Se reparten las 40 cartas entre todos los jugadores.",
      "Empieza quien tenga el 5 de oros y está obligado a jugarlo.",
      "En tu turno puedes colocar un 5 de cualquier palo para abrir su fila, o una carta que continúe una fila ya abierta: la inmediatamente inferior o superior (… 3, 4, 5, 6, 7, Sota, Caballo, Rey).",
      "El orden es 1-2-3-4-5-6-7-Sota-Caballo-Rey: después del 7 va la Sota.",
      "Si no puedes colocar ninguna carta, pasas. Si puedes, estás obligado a jugar.",
      "Gana quien primero se quede sin cartas. El resto se ordena por las cartas que le queden.",
    ],
    tips: ["Guarda las cartas que bloquean a los demás (los extremos de un palo) para el final.", "Abre los palos en los que tengas muchas cartas."],
  },
  {
    id: "burro",
    name: "El Burro",
    tagline: "Sigue el palo… o roba hasta poder.",
    players: "2 a 8 jugadores",
    minPlayers: 2,
    maxPlayers: 8,
    duration: "10-20 min",
    complexity: "Fácil",
    complexityDetail: "Seguir el palo y decidir con qué carta salir.",
    objective: "Deshacerte de todas tus cartas. El último en quedarse con cartas es el burro.",
    rules: [
      "Cada jugador recibe 6 cartas (5 con 5-6 jugadores, 4 con 7-8). El resto forma el mazo.",
      "Quien sale echa cualquier carta. Los demás, por turno, deben echar una carta del mismo palo.",
      "Si no tienes ninguna carta de ese palo, robas del mazo hasta conseguir una. Si el mazo se acaba, pasas.",
      "Cuando todos han jugado, gana la baza la carta más alta del palo de salida (As, Rey, Caballo, Sota, 7, 6… 2). Las cartas de la baza se descartan.",
      "Quien gana la baza sale en la siguiente.",
      "Al quedarte sin cartas terminas. El orden en que se termina marca la clasificación; el último es el burro.",
    ],
    tips: ["Sal con palos en los que tengas pocas cartas para que otros tengan que robar.", "Las cartas altas ganan bazas, pero ganar baza te obliga a volver a salir."],
  },
  {
    id: "siete-y-medio",
    name: "Siete y medio",
    tagline: "Acércate a 7½ sin pasarte.",
    players: "2 a 8 jugadores",
    minPlayers: 2,
    maxPlayers: 8,
    duration: "5 min",
    complexity: "Muy fácil",
    complexityDetail: "Solo decides si pedir carta o plantarte.",
    objective: "Sumar 7 y medio o lo más cerca posible sin pasarte.",
    rules: [
      "Las cartas del 1 al 7 valen su número. Sota, Caballo y Rey valen medio punto.",
      "Cada jugador recibe una carta boca abajo que solo él ve.",
      "Por turnos, cada jugador decide si pide otra carta (boca arriba) o se planta.",
      "Si llegas a 7½ te plantas automáticamente. Si te pasas, te has pasado y quedas al final.",
      "Al final se destapan todas las cartas: gana quien más se acerque a 7½. En empate, gana quien usó menos cartas.",
    ],
    tips: ["Con 5 o más, pedir carta es arriesgado: hay muchas cartas que te pasan.", "Fíjate en las cartas visibles de los demás para calcular lo que queda."],
  },
  {
    id: "escoba",
    name: "La Escoba",
    tagline: "Suma quince y barre la mesa.",
    players: "2 a 4 jugadores",
    minPlayers: 2,
    maxPlayers: 4,
    duration: "15-20 min",
    complexity: "Intermedio",
    complexityDetail: "Sumar quince y planear qué cartas recoger.",
    objective: "Conseguir más puntos que nadie al acabar el mazo.",
    rules: [
      "Valores: del 1 al 7 su número, Sota 8, Caballo 9 y Rey 10.",
      "Se reparten 3 cartas a cada jugador y 4 boca arriba en la mesa.",
      "En tu turno echas una carta. Si junto con una o varias cartas de la mesa suma exactamente 15, te las llevas.",
      "Si no puedes (o no quieres) sumar 15, dejas la carta en la mesa.",
      "Si al llevarte cartas dejas la mesa vacía, haces una escoba: 1 punto.",
      "Cuando todos gastan sus cartas se reparten 3 más. Al acabar el mazo, las cartas de la mesa son para el último que se llevó cartas.",
      "Puntos: 1 por cada escoba, 1 por más cartas, 1 por más oros, 1 por más sietes y 1 por el 7 de oros.",
    ],
    tips: ["Cuidado con dejar en la mesa cartas que sumen poco: facilitas la escoba al siguiente.", "El 7 de oros vale un punto por sí solo: ¡no lo regales!"],
  },
];

export const gameInfo = (id: string) => GAMES.find((g) => g.id === id);
