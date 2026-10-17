import type { Module } from "./types";

const TOP = [".........", ".........", ".........", ".........", "........."];
const STRAIGHT3 = [...TOP.slice(0, 4), ".........", ".........", "OOOOOO...", "XXXXXO...", "X...XO..."].slice(-9);
const CORNER3 = [...TOP, ".........", "OOOOO....", "XXXXO....", "...XO...."].slice(-9);
const BENT3 = [...TOP.slice(0, 5), "OOOOO....", "XXXXO....", ".XXXO....", "..XXO...."];
const STRAIGHT4 = [...TOP, ".........", "OOOOOOO..", "XXXXXXO..", "X....XO.."].slice(-9);
const SQUARE4 = [...TOP.slice(0, 5), "OOOOO....", "XXXXO....", "X..XO....", "X..XO...."];
const BULKY5 = [...TOP.slice(0, 5), "OOOOOO...", "XXXXXO...", "X..XXO...", "X...XO..."];
const SEKI = [...TOP.slice(0, 5), "OOOO.....", "XXXO.....", "O.XO.....", ".XXO....."];

export const LIFE: Module = {
  id: "vie-mort", title: "Vie et mort", kanji: "活", sub: "Faire deux yeux, ou les empêcher",
  lessons: [
    { id: "point-vital", title: "Le point vital", sub: "Trois en ligne", steps: [
      { board: STRAIGHT3, text: "Ce groupe noir est encerclé. Il lui reste un espace de **trois points en ligne** (B1, C1, D1). Peut-il faire deux yeux ?\n\nTout dépend de qui joue au **point vital**, le point du milieu.",
        task: { type: "goal", prompt: "Noir joue et vit.", goal: { type: "live", target: "A2", region: "B1:D1" }, hint: "Coupe l'espace en deux yeux séparés." }, ok: "Deux yeux, en B1 et D1 : vivant." },
      { board: STRAIGHT3, toPlay: 2, text: "Même position, mais c'est à **Blanc** de jouer. Le point vital pour vivre est aussi le point vital pour tuer.",
        task: { type: "goal", prompt: "Blanc joue et tue.", goal: { type: "kill", target: "A2", region: "B1:D1" }, hint: "Prends le point du milieu avant Noir." }, ok: "Noir ne peut plus faire qu'un œil. Si Noir capture la pierre du milieu, Blanc rejoue dedans : le groupe meurt." }
    ]},
    { id: "coude", title: "Trois en coude et coin", sub: "Trouver le point vital d'une forme", steps: [
      { board: BENT3, text: "Ici, l'espace forme un **coude** : A2, A1 et B1. Le point vital est le point qui touche les deux autres.",
        task: { type: "goal", prompt: "Noir joue et vit.", goal: { type: "live", target: "B2", region: "A1 A2 B1" }, hint: "Quel point de l'espace est voisin des deux autres ?" }, ok: "Deux yeux séparés : vivant." },
      { board: CORNER3, toPlay: 2, text: "Dans le coin, trois points en ligne le long du bord : même principe.",
        task: { type: "goal", prompt: "Blanc joue et tue.", goal: { type: "kill", target: "A2", region: "A1:C1" }, hint: "Le milieu de l'espace." }, ok: "Tué. Retiens : pour trois points, le point vital est toujours celui du centre de la forme." }
    ]},
    { id: "formes-quatre", title: "Formes de quatre et cinq", sub: "Vivant, mort ou à jouer", steps: [
      { board: STRAIGHT4, text: "Quatre points **en ligne** : si Blanc joue d'un côté, Noir joue de l'autre et garde deux yeux. On dit que les deux points du milieu sont **miai** (équivalents).",
        task: { type: "quiz", prompt: "Blanc joue en premier. Peut-il tuer ce groupe ?", options: ["Oui", "Non, il est vivant"], answer: 1 }, ok: "Vivant : Noir n'a même pas besoin de jouer ici tant que Blanc ne s'en approche pas." },
      { board: SQUARE4, text: "Quatre points **en carré** : impossible de les séparer en deux yeux, quel que soit l'ordre des coups.",
        task: { type: "quiz", prompt: "Noir joue en premier. Peut-il vivre ?", options: ["Oui", "Non, il est mort"], answer: 1 }, ok: "Mort quoi qu'il arrive : le carré de quatre est une forme morte." },
      { board: BULKY5, toPlay: 2, text: "Cinq points **en bloc** (un carré plus un point) : il y a un point vital, au cœur de la forme.",
        task: { type: "goal", prompt: "Blanc joue et tue.", goal: { type: "kill", target: "A2", region: "B1:D1 B2:C2" }, hint: "Cherche le point qui touche trois autres points de l'espace." }, ok: "Tué : Noir ne peut plus diviser l'espace." }
    ]},
    { id: "seki", title: "Le seki", sub: "Vivre ensemble", steps: [
      { board: SEKI, text: "Le groupe noir n'a aucun œil. La pierre blanche A2 non plus. Ils partagent deux libertés : **B2** et **A1**.\n\nSi l'un des deux joue dans une liberté commune, il se met lui-même en atari et l'autre le capture. Personne ne joue : les deux survivent. C'est un **seki**.",
        task: { type: "quiz", prompt: "Blanc a-t-il intérêt à jouer en B2 ?", options: ["Oui, il capture", "Non, il se ferait capturer"], answer: 1 }, ok: "Exact. Au décompte, les points d'un seki ne comptent pour personne." }
    ]}
  ]
};

export const LIFE_POSITIONS = { STRAIGHT3, CORNER3, BENT3, STRAIGHT4, SQUARE4, BULKY5, SEKI };
