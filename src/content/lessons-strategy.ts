import type { Module } from "./types";

const E9 = [".........", ".........", ".........", ".........", ".........", ".........", ".........", ".........", "........."];
const E13 = Array(13).fill(".............");

export const SHAPES: Module = {
  id: "formes", title: "Les formes", kanji: "形", sub: "Bien placer ses pierres",
  lessons: [
    { id: "liaisons", title: "Les liaisons", sub: "Relier sans perdre de temps", steps: [
      { board: [".........", ".X...X...", ".X....X..", ".........", ".X.......", ".....X.X.", ".X....X..", ".........", "........."],
        marks: { B8: "A", F8: "B", B5: "C", B3: "C", F4: "D" },
        text: "Quelques façons de relier deux pierres, de la plus solide à la plus rapide :\n- **A** : la liaison solide, impossible à couper.\n- **B** : la diagonale (*kosumi*), coupable en deux coups seulement.\n- **C** : le saut d'une case (*ikken tobi*), rapide et difficile à couper.\n- **D** : la **bouche du tigre** : trois pierres autour d'un point vide, en G4. Une pierre adverse posée là serait aussitôt en atari.",
        task: { type: "read" } },
      { board: [".......", ".......", ".......", "..X.X..", "...X...", ".......", "......."], text: "Voici une bouche du tigre (le point D4). Que se passe-t-il si Blanc joue dedans ?",
        task: { type: "quiz", prompt: "Une pierre blanche en D4 serait…", options: ["En sécurité", "En atari, prête à être capturée"], answer: 1 }, ok: "En atari : Noir la capture au coup suivant. La bouche du tigre protège sans boucher le point." }
    ]},
    { id: "bonne-forme", title: "Bonne et mauvaise forme", sub: "Le triangle vide et le ponnuki", steps: [
      { board: [".......", ".......", "..X....", "..XX...", ".......", ".......", "......."], marks: { D5: "x" }, text: "Trois pierres en **triangle vide** (ici C5, C4, D4, avec le point D5 vide) : c'est la mauvaise forme la plus célèbre. Ces trois pierres couvrent peu de terrain et n'ont pas plus de libertés que deux pierres en ligne.",
        task: { type: "quiz", prompt: "Combien de libertés a ce triangle de trois pierres ?", options: ["5", "7", "8"], answer: 1 }, ok: "7 libertés. Trois pierres en ligne en auraient 8, et couvriraient plus d'espace." },
      { board: [".......", ".......", "...X...", "..XOX..", ".......", ".......", "......."], text: "À l'inverse, le **ponnuki** est la plus belle forme : quatre pierres en losange après une capture au centre. On dit qu'il « vaut 30 points ».",
        task: { type: "move", prompt: "Capture la pierre blanche et forme un ponnuki.", accept: ["D3"], hint: "Il ne reste qu'une liberté à la pierre blanche." }, ok: "Un ponnuki : solide, sans point faible, et rayonnant vers le centre." }
    ]},
    { id: "tete", title: "La tête de deux pierres", sub: "Le hane qui fait mal", steps: [
      { board: [".........", ".........", ".........", ".........", "...OX....", "...OX....", ".........", ".........", "........."], text: "Quand deux pierres de chaque camp sont côte à côte, le point juste au-dessus des deux pierres adverses s'appelle leur **tête**. Proverbe : « Frappe la tête de deux pierres. » Le *hane* (coup qui contourne) à cet endroit bloque leur développement.",
        task: { type: "move", prompt: "Noir joue : frappe la tête des deux pierres blanches.", accept: ["D6"], hint: "Le point juste au-dessus de D5." }, ok: "Blanc est écrasé contre le bas et tes pierres gagnent en puissance." }
    ]}
  ]
};

export const OPENING: Module = {
  id: "ouverture", title: "L'ouverture", kanji: "布", sub: "Les premiers coups d'une partie",
  lessons: [
    { id: "coins", title: "Coins, bords, centre", sub: "Pourquoi commencer dans les coins", steps: [
      { board: ["...X.........", "...X.........", "...X....XXX..", "XXX....X...X.", ".......X...X.", ".......X...X.", "........XXX..", ".............", ".............", ".....XXX.....", "....X...X....", "....X...X....", "....X...X...."],
        text: "Pour entourer **9 intersections** (un carré de 3×3) :\n- dans le **coin**, il suffit de 6 pierres (en haut à gauche) ;\n- sur le **bord**, il en faut 9 (en bas) ;\n- au **centre**, il en faut 12 (à droite).\n\nLes bords du plateau servent de murs gratuits. Voilà pourquoi on commence par les coins, puis les bords, et le centre en dernier.",
        task: { type: "quiz", prompt: "Combien de pierres faut-il pour entourer 9 points au centre ?", options: ["6", "9", "12"], answer: 2 }, ok: "12, deux fois plus que dans le coin." }
    ]},
    { id: "points-coin", title: "Les points du coin", sub: "3-3, 3-4, 4-4", steps: [
      { board: E13, marks: { C11: "A", C10: "B", D10: "C", D11: "B", E10: "D", C9: "E" },
        text: "On nomme les points du coin par leur distance aux deux bords :\n- **A** : le 3-3 (*san-san*), solide mais bas ;\n- **B** : le 3-4 (*komoku*), équilibré ;\n- **C** : le 4-4 (*hoshi*), rapide et tourné vers le centre ;\n- **D** et **E** : des points plus hauts, plus rares.\n\nAujourd'hui, le 4-4 et le 3-4 sont les plus joués.",
        task: { type: "move", prompt: "Joue le 4-4 du coin en haut à droite.", accept: ["K10"], hint: "Quatrième ligne depuis le haut, quatrième colonne depuis la droite." }, ok: "Le 4-4, sur un point étoile." }
    ]},
    { id: "extension", title: "S'étendre le long du bord", sub: "Du coin vers le bord", steps: [
      { board: ["...................", "...................", "...................", "...............X...", "...................", "...................", "...................", "...................", "...................", "...................", "...................", "...................", "...................", "...................", "...................", "...................", "...X..X............", "...................", "..................."],
        marks: { G3: "tri" },
        text: "Après les coins, on s'installe sur les bords par des **extensions** : une pierre posée sur la 3e ou 4e ligne, à bonne distance d'une pierre amie.\n\nRègle pratique : depuis une pierre isolée sur la 3e ligne, on s'étend de **deux cases** ; depuis un mur de deux pierres, de **trois cases**. Plus loin, l'adversaire peut s'installer entre tes pierres ; plus près, tu perds du temps.",
        task: { type: "quiz", prompt: "Pourquoi ne pas s'étendre trop loin ?", options: ["L'adversaire pourrait s'installer entre tes pierres", "C'est interdit par les règles"], answer: 0 }, ok: "Exact : l'équilibre entre vitesse et solidité est tout l'art de l'ouverture." }
    ]},
    { id: "ouverture-9x9", title: "Ouvrir en 9×9", sub: "Le petit plateau a ses propres règles", steps: [
      { board: E9, text: "Sur le petit plateau 9×9, le centre est tout près des bords. Le **tengen** (E5) y est un excellent premier coup : il touche les quatre coins à la fois. C'est d'ailleurs le choix préféré de KataGo.",
        task: { type: "move", prompt: "Joue le premier coup préféré des forts joueurs en 9×9.", accept: ["E5"], hint: "Le point au centre exact du plateau." }, ok: "Tengen : le point qui a donné son nom à l'appli." },
      { board: [".........", ".........", ".........", ".........", "....X....", "......O..", ".........", ".........", "........."], text: "Blanc répond en G4, en diagonale. Sur un si petit plateau, chaque pierre doit gêner l'adversaire : la bonne réponse noire s'appuie sur la pierre centrale pour **empêcher Blanc de s'installer**.",
        task: { type: "move", prompt: "Trouve le coup préféré de KataGo.", accept: ["F3"], hint: "Joue en diagonale sous la pierre blanche, du côté du bas." }, ok: "F3 bloque la pierre blanche du côté du bas, où elle voulait s'installer. Blanc devra se débrouiller près du bord droit, sous l'œil de la pierre centrale. KataGo le préfère nettement à toute autre réponse." }
    ]}
  ]
};

export const MIDDLE: Module = {
  id: "milieu", title: "Le milieu de partie", kanji: "戦", sub: "Attaquer, défendre, garder l'initiative",
  lessons: [
    { id: "sente", title: "Sente et gote", sub: "Garder l'initiative", steps: [
      { board: [".......", ".......", ".......", "..X....", "..XO...", "..XO...", "......."], text: "Un coup **sente** oblige l'adversaire à répondre : tu gardes la main et tu peux jouer ailleurs ensuite. Un coup **gote** n'exige pas de réponse : l'adversaire choisit où jouer.\n\nExemple : mettre une chaîne en atari est presque toujours sente, car l'adversaire doit la sauver.",
        task: { type: "quiz", prompt: "Un coup qui met une chaîne adverse en atari est généralement…", options: ["Sente", "Gote"], answer: 0 }, ok: "Sente. Mais attention : forcer l'adversaire sans raison peut aussi le renforcer." },
      { board: [".......", ".......", ".......", "..X....", "..XO...", "..XO...", "......."], text: "Bon réflexe : avant de jouer un coup gote (qui ne menace rien), demande-toi s'il existe un coup sente qui gagne quelque chose. Joue d'abord les coups sente, puis le plus gros coup gote.",
        task: { type: "read" } }
    ]},
    { id: "groupes-faibles", title: "Groupes forts et faibles", sub: "Qui attaque qui ?", steps: [
      { board: [".......", ".......", ".......", ".......", ".......", ".......", "......."], text: "Un groupe **fort** a deux yeux ou peut facilement en faire. Un groupe **faible** n'a ni yeux ni espace : il doit fuir vers le centre, et chaque coup de fuite profite à l'adversaire, qui construit du territoire en le poursuivant.\n\nTrois réflexes :\n- Renforce ton groupe faible **avant** qu'il soit attaqué.\n- Attaque les groupes faibles adverses **de loin**, pour gagner du terrain en chassant.\n- N'aie jamais deux groupes faibles à la fois.",
        task: { type: "read" } }
    ]},
    { id: "influence", title: "Territoire ou influence", sub: "Deux façons de gagner", steps: [
      { board: [".........", "..OOOO...", "..XXXX...", ".........", ".........", ".........", ".........", ".........", "........."], text: "Ici, Blanc a pris le bord du haut, petit mais sûr : c'est du **territoire**. Noir a un **mur** tourné vers le reste du plateau : c'est de l'**influence**, qui aidera plus tard à construire ou à attaquer.\n\nUne influence ne rapporte des points que si on l'utilise : on ne construit pas un territoire collé à son mur, on s'en sert pour attaquer ou pour encadrer une grande zone.",
        task: { type: "quiz", prompt: "Qui a de l'influence dans ce diagramme ?", options: ["Noir (le mur du bas)", "Blanc (le haut)"], answer: 0 }, ok: "Noir : son mur regarde vers le reste du plateau. Le territoire de Blanc est petit mais déjà acquis." }
    ]}
  ]
};

export const ENDGAME: Module = {
  id: "fin", title: "La fin de partie", kanji: "終", sub: "Finir proprement et compter",
  lessons: [
    { id: "yose", title: "Les coups de fin", sub: "Yose : le plus gros d'abord", steps: [
      { board: ["....XO...", "....XO...", "....XO...", "....XO...", "....XO...", "....XO...", "....XO...", "....XO...", "........."], text: "En fin de partie (*yose*), on règle les frontières. Chaque coup a une **valeur** en points, et l'on joue toujours le plus gros d'abord.\n\nIci, il ne reste qu'une frontière ouverte, en bas. Le coup classique est le **hane** au bord : contourner la pierre adverse sur la première ligne.",
        task: { type: "move", prompt: "Noir joue le meilleur coup de fin de partie.", accept: ["F1"], hint: "Entre d'un pas dans le camp blanc, sur la première ligne." }, ok: "Le hane en F1 : si Blanc bloque en G1, Noir relie en E1. Par rapport à un simple E1, Noir gagne environ deux points : c'est l'estimation de KataGo." }
    ]},
    { id: "compter-partie", title: "Compter une partie", sub: "Le décompte chinois pas à pas", steps: [
      { board: [".O.OOOX..", "..O..OX..", "...OOXX..", "...OX.X..", "OOOXX.XX.", "OXXXX...X", "OOXXX.X.X", "OOX.X.XXX", "OXX...X.."], text: "Cette partie de KataGo contre lui-même est finie : les deux joueurs ont passé, et aucune pierre n'est morte. Pour compter en règles chinoises :\n- on retire les pierres mortes (ici, aucune) ;\n- chacun compte ses pierres **plus** les intersections vides entourées uniquement par lui.",
        task: { type: "quiz", prompt: "Combien de points a Noir (pierres + territoire) ?", options: ["45", "51", "58"], answer: 1 }, show: { terr: true }, ok: "51 points. Blanc en a 30 : regarde les carrés, ce sont les territoires." },
      { board: [".O.OOOX..", "..O..OX..", "...OOXX..", "...OX.X..", "OOOXX.XX.", "OXXXX...X", "OOXXX.X.X", "OOX.X.XXX", "OXX...X.."], text: "On ajoute enfin le komi à Blanc : 30 + 7,5 = 37,5 points.",
        task: { type: "quiz", prompt: "Qui gagne, et de combien ?", options: ["Noir de 13,5 points", "Blanc de 7,5 points", "Noir de 21 points"], answer: 0 }, show: { terr: true }, ok: "Noir gagne de 13,5 points. L'appli fait ce calcul pour toi à la fin de chaque partie, et te laisse corriger les pierres mortes." }
    ]},
    { id: "passer", title: "Quand passer ?", sub: "Les points neutres", steps: [
      { board: [".........", ".........", ".........", ".........", ".........", ".........", ".........", ".........", "........."], text: "On passe quand **plus aucun coup ne rapporte** : toutes les frontières sont fermées, aucun groupe n'est menacé.\n\nLes intersections entre deux frontières qui n'appartiennent à personne s'appellent des **dame** (points neutres). En règles chinoises, il faut quand même les remplir (chacune vaut un point de pierre), puis passer.\n\nDans l'appli, si tu passes trop tôt, l'adversaire peut continuer : tu peux toujours reprendre la partie depuis l'écran de décompte.",
        task: { type: "read" } }
    ]}
  ]
};
