import type { Module } from "./types";

const LADDER = [".........", ".........", ".........", "....X....", "...XO....", "...X.....", ".........", ".........", "........."];
const LADDER_BREAK = [".........", ".........", ".........", "....X....", "...XO....", "...X.....", ".......O.", ".........", "........."];

export const TACTICS: Module = {
  id: "tactique", title: "Tactique de base", kanji: "手", sub: "Les coups qui gagnent des pierres",
  lessons: [
    { id: "atari-sens", title: "Le bon côté de l'atari", sub: "Pousser vers le bord ou vers ses pierres", steps: [
      { board: [".......", ".......", ".......", ".......", "...X...", "..XO...", "......."], text: "Une pierre en atari va s'enfuir par sa dernière liberté. Avant de mettre en atari, demande-toi **où elle va fuir**.\n\nLa bonne direction pousse la pierre **vers le bord** ou **vers tes propres pierres**, là où elle n'aura pas de place.",
        task: { type: "goal", prompt: "Noir joue et capture la pierre blanche D2.", goal: { type: "capture", target: "D2" }, hint: "Mets en atari du côté du centre (E2) : Blanc sera poussé vers le bord, où il étouffe." }, ok: "Blanc fuit vers le bord et n'y trouve pas de libertés. Avec un atari par le bas (D1), il se serait échappé vers le centre." }
    ]},
    { id: "echelle", title: "L'échelle", sub: "Shicho : la poursuite en escalier", steps: [
      { board: LADDER, text: "L'**échelle** (en japonais *shicho*) est une suite d'ataris : à chaque coup, la pierre blanche prolonge et se retrouve de nouveau en atari, en zigzag, jusqu'au bord où elle est capturée.",
        task: { type: "goal", prompt: "Noir joue et capture la pierre blanche E5.", goal: { type: "capture", target: "E5" }, hint: "Mets en atari en F5 : Blanc ne peut fuir que vers le bas, contre ta pierre D4." }, ok: "C'est l'échelle : Blanc descend en escalier vers le bord et finit capturé." },
      { board: LADDER_BREAK, text: "Une échelle ne marche que si rien ne l'arrête. Une pierre blanche placée **sur le trajet** de l'échelle (ici en H3) lui donnera des libertés : on l'appelle un **casse-échelle**.",
        task: { type: "quiz", prompt: "Avec la pierre blanche en H3, l'échelle en F5 capture-t-elle encore ?", options: ["Oui", "Non, Blanc s'échappe"], answer: 1 }, ok: "Exact. Avant de lancer une échelle, suis son trajet en diagonale jusqu'au bord. Une échelle ratée laisse derrière elle plein de points faibles." },
      { board: LADDER, text: "Lire une échelle jusqu'au bout est un vrai exercice de calcul. Ne te décourage pas : au début, joue-la coup par coup sur le plateau en analyse, puis essaie de la voir de tête.", task: { type: "read" } }
    ]},
    { id: "double-atari", title: "Le double atari", sub: "Deux menaces en un seul coup", steps: [
      { board: [".......", ".......", "..X.X..", "..O.O..", "..X.X..", ".......", "......."], text: "Un **double atari** met deux chaînes adverses en atari en même temps. L'adversaire ne peut en sauver qu'une : tu captures l'autre.",
        task: { type: "move", prompt: "Mets les deux pierres blanches en atari d'un seul coup.", accept: ["D4"], hint: "Joue entre les deux pierres blanches." }, ok: "Blanc ne peut en sauver qu'une." },
      { board: [".......", "...X.X.", "..XO.OX", ".......", ".......", ".......", "......."], text: "Pour trouver un double atari, repère les chaînes adverses qui n'ont que **deux libertés**, et cherche un point qui en enlève une à chacune.",
        task: { type: "move", prompt: "Trouve le double atari.", accept: ["E5"], hint: "Les deux pierres blanches partagent une liberté." }, ok: "Double atari : D5 n'a plus que D4, F5 n'a plus que F4. Blanc en sauve une, tu prends l'autre." }
    ]},
    { id: "prise-reprise", title: "La prise-reprise", sub: "Uttegaeshi : sacrifier pour capturer", steps: [
      { board: [".........", ".........", ".........", ".........", ".........", ".........", "XXXX.....", "OOOX.....", "..OX....."], text: "Parfois, on offre une pierre exprès. L'adversaire la capture… et se retrouve lui-même en atari : on reprend tout. C'est la **prise-reprise** (*uttegaeshi*, en anglais *snapback*).",
        task: { type: "goal", prompt: "Noir joue et capture les pierres blanches.", goal: { type: "capture", target: "A2" }, hint: "Joue à l'intérieur, dans une des deux libertés blanches, même si ta pierre peut être prise." }, ok: "Si Blanc prend ta pierre, il se met lui-même en atari : tu reprends quatre pierres. Si Blanc ne prend pas, tu captures directement." }
    ]},
    { id: "couper", title: "Couper et relier", sub: "Les points de coupe", steps: [
      { board: [".......", ".......", "..XO...", "..O....", ".......", ".......", "......."], text: "Deux pierres en **diagonale** sont presque reliées. Le point vide entre elles est un **point de coupe**.",
        task: { type: "move", prompt: "Les deux pierres blanches se touchent en diagonale. Sépare-les.", accept: ["D4"], hint: "Une diagonale a deux points de coupe. L'un est déjà à toi." }, ok: "Coupées : Blanc doit maintenant défendre deux pierres isolées." },
      { board: [".......", ".......", "..XO...", "...X...", ".......", ".......", "......."], text: "Inversement : une diagonale ne peut pas être coupée en un seul coup. Si l'adversaire prend un des deux points, **prends l'autre**.\n\nIci, Blanc vient de jouer en D5, l'un des deux points de coupe.",
        task: { type: "move", prompt: "Relie tes deux pierres noires.", accept: ["C4"], hint: "Il reste un seul point entre C5 et D4." }, ok: "Reliées. Garder ses pierres connectées est la base d'une position solide." }
    ]},
    { id: "course", title: "La course aux libertés", sub: "Semeai : qui capture l'autre ?", steps: [
      { board: [".......", ".......", ".......", "OOOXXXX", "O.XO.X.", "O.XO.X.", "O.XO.X."], text: "Quand deux chaînes ennemies s'enserrent sans yeux, c'est une **course aux libertés** (*semeai*). On compte les libertés de chacune : la chaîne noire C1-C3 en a 3 (B1, B2, B3), la chaîne blanche D1-D3 aussi (E1, E2, E3).\n\nAvec autant de libertés, **celui qui joue en premier gagne**, à condition de boucher les libertés de l'adversaire **par l'extérieur**.",
        task: { type: "move", prompt: "Noir joue et gagne la course.", accept: ["E1", "E2", "E3"], hint: "Ne touche pas à tes propres libertés : bouche celles de Blanc." }, ok: "Blanc n'a plus que 2 libertés contre 3 pour toi : tu captureras le premier." },
      { board: [".......", ".......", ".......", "OOOXXXX", "O.XO.X.", "O.XO.X.", "O.XO.X."], text: "Le piège classique : jouer dans ses propres libertés (en B1, B2 ou B3). Tu te retires une liberté à toi-même, et c'est l'adversaire qui gagne la course.",
        task: { type: "quiz", prompt: "Si Noir joue en B2, qui gagne la course ?", options: ["Noir", "Blanc"], answer: 1 }, ok: "Blanc : Noir s'est lui-même privé d'une liberté. Dans une course, on compte, puis on bouche les libertés adverses." }
    ]}
  ]
};
