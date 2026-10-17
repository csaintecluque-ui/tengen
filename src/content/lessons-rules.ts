import type { Module } from "./types";

const E9 = [".........", ".........", ".........", ".........", ".........", ".........", ".........", ".........", "........."];

export const RULES: Module = {
  id: "regles", title: "Les règles", kanji: "碁", sub: "Tout ce qu'il faut pour jouer sa première partie",
  lessons: [
    { id: "plateau", title: "Le plateau et les pierres", sub: "Où et comment on joue", steps: [
      { board: E9, text: "Le go se joue à deux, sur un plateau quadrillé appelé **goban**. On pose les pierres **sur les intersections** des lignes, pas dans les cases.\n\nNoir commence, puis chacun pose une pierre à son tour. Une pierre posée ne bouge plus jamais : au go, on ne déplace rien, on ajoute.",
        task: { type: "free", prompt: "Pose une pierre noire où tu veux." }, ok: "Voilà ta première pierre." },
      { board: E9, text: "Le but est d'**entourer plus d'espace** que l'adversaire. Tes pierres servent de murs. À la fin, on compte les intersections que chacun contrôle.\n\nLe vrai plateau mesure 19×19. Pour apprendre, on utilise souvent le 9×9 : les parties durent 15 à 20 minutes.",
        task: { type: "quiz", prompt: "Où pose-t-on les pierres ?", options: ["Dans les cases", "Sur les intersections"], answer: 1 }, ok: "Exact. Les bords et les coins sont aussi jouables." },
      { board: E9, marks: { C7: "circ", G7: "circ", C3: "circ", G3: "circ", E5: "circ" }, text: "Les petits points noirs du plateau s'appellent les **hoshi** (points étoiles). Ils servent de repères. Celui du centre se nomme **tengen**, « l'origine du ciel » : c'est le nom de cette appli.",
        task: { type: "read" } }
    ]},
    { id: "libertes", title: "Les libertés", sub: "Le souffle des pierres", steps: [
      { board: [".....", ".....", "..O..", ".....", "....."], text: "Les intersections vides **collées** à une pierre (en haut, en bas, à gauche, à droite) sont ses **libertés**. Les diagonales ne comptent pas.",
        task: { type: "quiz", prompt: "Combien de libertés a la pierre blanche ?", options: ["2", "3", "4", "8"], answer: 2 }, show: { libs: "C3" }, ok: "4 libertés : c'est le maximum pour une pierre seule." },
      { board: [".....", ".....", "O....", ".....", "....."], text: "Sur le bord du plateau, une pierre perd une liberté.",
        task: { type: "quiz", prompt: "Combien de libertés a cette pierre ?", options: ["2", "3", "4"], answer: 1 }, show: { libs: "A3" }, ok: "3 libertés : le bord en a pris une." },
      { board: [".....", ".....", ".....", ".....", "O...."], text: "Et dans un coin, il en reste encore moins.",
        task: { type: "quiz", prompt: "Combien de libertés a la pierre du coin ?", options: ["1", "2", "3"], answer: 1 }, show: { libs: "A1" }, ok: "Seulement 2. Une pierre au coin se capture vite." },
      { board: [".....", "..X..", ".XO..", ".....", "....."], text: "Une pierre adverse collée prend aussi une liberté.",
        task: { type: "quiz", prompt: "Combien de libertés reste-t-il à la pierre blanche ?", options: ["1", "2", "3"], answer: 1 }, show: { libs: "C3" }, ok: "2 libertés : les deux pierres noires en ont bouché deux." }
    ]},
    { id: "capture", title: "Capturer", sub: "Boucher la dernière liberté", steps: [
      { board: [".....", "..X..", ".XOX.", ".....", "....."], text: "Quand une pierre n'a plus aucune liberté, elle est **capturée** : on la retire du plateau. Le joueur la garde comme prisonnier.",
        task: { type: "move", prompt: "La pierre blanche n'a plus qu'une liberté. Capture-la.", accept: ["C2"], hint: "Cherche la seule intersection vide collée à la pierre blanche." }, ok: "Capturée ! Elle quitte le plateau." },
      { board: [".....", ".....", ".....", ".....", ".XOX."], text: "Sur le bord, il y a moins de libertés à boucher.",
        task: { type: "move", prompt: "Capture la pierre blanche.", accept: ["C2"], hint: "Le bord compte comme un mur. Il ne reste qu'une liberté, au-dessus." }, ok: "Bien vu : le bord t'a aidé." },
      { board: [".....", ".....", ".....", "X....", "O...."], text: "Dans le coin, une pierre est encore plus fragile : une seule pierre adverse suffit à la mettre en atari.",
        task: { type: "move", prompt: "Capture la pierre blanche du coin.", accept: ["B1"], hint: "La pierre du coin n'avait que deux libertés. Laquelle reste-t-il ?" }, ok: "Capturée en deux coups seulement. Évite de jouer trop près du coin en début de partie." },
    ]},
    { id: "chaines", title: "Les chaînes", sub: "Des pierres reliées", steps: [
      { board: [".....", "..X..", ".XOO.", "..X..", "....."], text: "Des pierres de même couleur collées **en ligne droite** forment une **chaîne**. Elles partagent leurs libertés et sont capturées ensemble. En diagonale, elles ne sont pas reliées.",
        task: { type: "quiz", prompt: "Combien de libertés a la chaîne blanche ?", options: ["2", "3", "4", "5"], answer: 1 }, show: { libs: "C3" }, ok: "3 libertés, toutes du côté droit." },
      { board: [".....", "..XX.", ".XOOX", "..X..", "....."], text: "Une chaîne n'a qu'une vie : quand sa dernière liberté est bouchée, toutes ses pierres partent.",
        task: { type: "move", prompt: "Capture les deux pierres blanches d'un seul coup.", accept: ["D2"], hint: "Compte les libertés de la chaîne entière, pas pierre par pierre." }, ok: "Deux pierres d'un coup." },
      { board: [".....", ".O...", "..O..", ".....", "....."], text: "Ces deux pierres blanches se touchent seulement par un coin : ce sont **deux chaînes séparées**. Chacune a ses propres libertés.",
        task: { type: "quiz", prompt: "Combien de chaînes blanches y a-t-il ?", options: ["1", "2"], answer: 1 }, ok: "Deux. Une diagonale ne relie pas les pierres, mais elle est difficile à couper : on y reviendra." }
    ]},
    { id: "atari", title: "L'atari", sub: "Une seule liberté restante", steps: [
      { board: [".....", "..O..", ".OX..", "..O..", "....."], text: "Une chaîne qui n'a plus qu'une liberté est **en atari** : l'adversaire peut la capturer au coup suivant.",
        task: { type: "move", prompt: "Ta pierre noire est en atari. Sauve-la en prolongeant.", accept: ["D3"], hint: "Joue sur sa dernière liberté pour en gagner de nouvelles." }, show: { libs: "C3" }, ok: "Ta chaîne a maintenant 3 libertés. Blanc ne peut plus la capturer tout de suite." },
      { board: [".....", ".....", ".XO..", "..X..", "....."], text: "À l'inverse, mettre une pierre adverse en atari l'oblige souvent à réagir.",
        task: { type: "move", prompt: "Mets la pierre blanche en atari : ne lui laisse qu'une liberté.", accept: ["C4", "D3"], hint: "La pierre blanche a deux libertés. Bouches-en une." }, show: { libs: "C3" }, ok: "Atari ! Blanc doit s'enfuir ou perdre sa pierre." },
      { board: [".....", "..X..", ".XO..", "..X..", "....."], text: "La pierre blanche est en atari. Pour se sauver, elle prolonge sur sa dernière liberté. Avant de prolonger, il faut toujours **compter les libertés gagnées** : si la chaîne reste à une seule liberté, la fuite est inutile.",
        task: { type: "quiz", prompt: "Si Blanc prolonge en D3, combien de libertés aura sa chaîne ?", options: ["1 liberté", "2 libertés", "3 libertés"], answer: 2 }, ok: "3 libertés (D4, E3 et D2) : ici, la fuite réussit." }
    ]},
    { id: "interdits", title: "Coups interdits", sub: "Le suicide et son exception", steps: [
      { board: [".O...", "O.O..", ".O...", ".....", "....."], text: "Tu ne peux pas poser une pierre là où elle n'aurait **aucune liberté**. C'est un suicide, et c'est interdit.",
        task: { type: "illegal", prompt: "Essaie de jouer au milieu des pierres blanches, en B4.", at: "B4" }, ok: "Refusé : ta pierre n'aurait aucune liberté." },
      { board: [".OX..", "OX...", ".....", ".....", "....."], text: "**Exception** : si ton coup capture des pierres adverses, il est permis. La capture passe en premier et te rend des libertés.",
        task: { type: "move", prompt: "Trouve le coup qui capture, même s'il tombe au milieu des pierres blanches.", accept: ["A5"], hint: "Regarde la pierre blanche en B5 : combien de libertés lui reste-t-il ?" }, ok: "La pierre B5 est capturée, ta pierre respire." }
    ]},
    { id: "ko", title: "Le ko", sub: "Pas de reprise immédiate", steps: [
      { board: [".....", "..XO.", ".XO.O", "..XO.", "....."], text: "Parfois, les deux joueurs pourraient se reprendre une pierre à l'infini. La règle du **ko** l'empêche : on ne peut pas reprendre **tout de suite** une pierre qui vient de capturer une seule pierre.",
        task: { type: "move", prompt: "Capture la pierre blanche en C3.", accept: ["D3"], hint: "La pierre blanche C3 n'a qu'une liberté, à sa droite." }, show: { marks: { C3: "sq" } }, ok: "Blanc voudrait reprendre en C3 (le carré), mais c'est interdit : il doit d'abord jouer ailleurs." },
      { board: [".....", "..XO.", ".X.XO", "..XO.", "....."], koAt: "C3", text: "Le ko oblige l'adversaire à jouer une **menace** ailleurs (un coup qui exige une réponse) avant de reprendre. Si tu bouches C3 entre-temps, le ko est terminé.",
        task: { type: "quiz", prompt: "Blanc peut-il reprendre en C3 tout de suite ?", options: ["Oui", "Non, il joue ailleurs d'abord"], answer: 1 }, ok: "Exact. Au tour suivant, la reprise redevient possible : c'est un « combat de ko »." }
    ]},
    { id: "yeux", title: "Vivre avec deux yeux", sub: "Le secret des groupes vivants", steps: [
      { board: [".......", ".......", ".......", "OOOOO..", "XXXXXO.", "X...XO.", "XXXXXO."], text: "Un **œil** est une intersection vide entourée par tes pierres. Une chaîne qui a **deux yeux séparés** ne peut jamais être capturée : l'adversaire ne peut pas boucher deux trous à la fois, et jouer dans un œil serait un suicide.",
        task: { type: "move", prompt: "Ton groupe est encerclé. Joue le coup qui lui donne deux yeux.", accept: ["C2"], hint: "Il y a trois points vides alignés. Celui du milieu est la clé." }, ok: "Deux yeux, en B2 et D2 : ton groupe est vivant pour toujours." },
      { board: [".......", ".......", ".......", "OOOOO..", "XXXXXO.", "X.X.XO.", "XXXXXO."], text: "Avec un seul œil, l'adversaire bouche les libertés extérieures puis joue dans l'œil : ce dernier coup capture, donc il est autorisé.",
        task: { type: "quiz", prompt: "Ici, Noir a deux yeux (B2 et D2). Blanc peut-il capturer ce groupe ?", options: ["Oui", "Non, jamais"], answer: 1 }, ok: "Jamais : jouer en B2 ou D2 serait un suicide pour Blanc." },
      { board: [".......", ".......", ".......", "OOOOO..", "XXXXXO.", "X...XO.", "XXXXXO."], text: "À l'inverse, si Blanc joue le premier au milieu, l'espace ne pourra plus faire deux yeux.",
        toPlay: 2, task: { type: "move", prompt: "Tu as Blanc : tue le groupe noir.", accept: ["C2"], hint: "Le même point est vital pour les deux joueurs." }, ok: "Noir ne peut plus faire qu'un œil : le groupe est mort. Retiens : le point vital pour vivre est aussi le point vital pour tuer." }
    ]},
    { id: "compter", title: "Fin de partie et points", sub: "Comment on gagne", steps: [
      { board: ["..XO.", "..XO.", "..XO.", "..XO.", "..XO."], text: "Quand plus aucun coup n'est utile, chacun **passe**. Deux passes de suite terminent la partie.\n\nOn compte alors, pour chaque joueur, **ses pierres sur le plateau plus les intersections vides qu'il entoure**. C'est le décompte « chinois », utilisé par cette appli.",
        task: { type: "quiz", prompt: "Combien de points a Noir ?", options: ["5", "10", "15", "20"], answer: 2 }, show: { terr: true }, ok: "5 pierres + 10 intersections entourées = 15 points." },
      { board: ["..XO.", "..XO.", "..XO.", "..XO.", "..XO."], text: "Blanc a 5 pierres et 5 intersections : 10 points. Il reçoit aussi **7,5 points de komi**, une compensation parce que Noir a joué en premier.",
        task: { type: "quiz", prompt: "Qui gagne cette partie ?", options: ["Noir", "Blanc"], answer: 1 }, show: { terr: true }, ok: "Blanc : 17,5 contre 15. Le demi-point évite les égalités." },
      { board: ["..XO.", "..XO.", ".OXO.", "..XO.", "..XO."], text: "Les pierres qui ne peuvent pas échapper à la capture sont **mortes** : à la fin, on les retire sans jouer les coups. Ici, la pierre blanche en B3 est perdue au milieu du territoire noir.",
        task: { type: "quiz", prompt: "Que devient la pierre blanche B3 au décompte ?", options: ["Elle compte pour Blanc", "Elle est retirée : son point revient à Noir"], answer: 1 }, ok: "Exact. Pas besoin de la capturer pour de vrai : les deux joueurs se mettent d'accord. L'appli te proposera les pierres mortes, et tu pourras corriger." }
    ]},
    { id: "premiere", title: "Ta première partie", sub: "Les bons réflexes", steps: [
      { board: E9, text: "Les **coins** d'abord : on y entoure de l'espace avec peu de pierres. Puis les bords, puis le centre.",
        task: { type: "move", prompt: "Joue un premier coup classique : près d'un coin, sur la 3e ou 4e ligne, ou au centre en E5.", accept: ["C3", "C4", "D3", "D4", "F3", "F4", "G3", "G4", "C6", "C7", "D6", "D7", "F6", "F7", "G6", "G7", "E5"], hint: "Compte 3 ou 4 lignes depuis le bord, près d'un coin." }, ok: "Bon début." },
      { board: E9, text: "Trois réflexes pendant tes parties :\n- Après chaque coup adverse, regarde si une de tes chaînes est en atari.\n- Relie tes pierres plutôt que de les disperser.\n- Ne cours pas après chaque pierre : un groupe avec deux yeux est vivant.\n\nTu connais les règles. La suite du parcours t'apprend à bien jouer, mais rien ne t'empêche de lancer une partie contre le niveau Débutant dès maintenant.",
        task: { type: "read" } }
    ]}
  ]
};
