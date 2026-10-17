import type { Article, GlossaryEntry, Proverb } from "./types";

export const ARTICLES: Article[] = [
  { id: "histoire", group: "Culture", title: "Une brève histoire du go", sub: "Plus de deux mille ans de parties", body: [
    { p: "Le go est né en Chine il y a plus de deux millénaires ; on le cite déjà dans des textes de l'époque des Royaumes combattants. Les Chinois l'appellent **weiqi** (« le jeu d'encerclement »), les Coréens **baduk**, et les Japonais **igo** ou **go**, le nom qui s'est imposé en Occident." },
    { p: "Le jeu arrive au Japon vers le VIIe siècle. Sous le shogunat d'Edo (1603-1868), l'État finance quatre grandes écoles, dont la maison **Honinbo**. C'est l'âge d'or des théoriciens : Honinbo Dosaku, puis Shusaku, dont le « coup qui fait rougir les oreilles » de 1846 reste célèbre." },
    { p: "Au XXe siècle, **Go Seigen** révolutionne l'ouverture avec le *shin fuseki*, et le jeu se professionnalise en Chine, en Corée et au Japon. Le go arrive en Europe au début du siècle ; la France compte aujourd'hui de nombreux clubs." },
    { p: "En mars 2016, le programme **AlphaGo** bat le champion coréen Lee Sedol 4 parties à 1 : une date historique pour l'intelligence artificielle. Depuis, des programmes libres comme **KataGo** (celui de cette appli) jouent bien au-delà du niveau humain et sont devenus des professeurs pour tous les joueurs." }
  ]},
  { id: "materiel", group: "Culture", title: "Le matériel", sub: "Goban, pierres et bols", body: [
    { p: "Le plateau, le **goban**, est traditionnellement en bois de **kaya** ; il porte un quadrillage de 19×19 lignes, légèrement plus long que large pour paraître carré vu de face. Les plateaux de 9×9 et 13×13 servent à l'apprentissage et aux parties rapides." },
    { p: "On compte 181 pierres noires et 180 blanches, rangées dans deux bols (**go-ke**). Au Japon, les noires sont en ardoise et les blanches taillées dans des coquillages ; en Chine, les pierres **yunzi** sont en verre fondu, légèrement bombées d'un seul côté." },
    { p: "Les pierres capturées se posent dans le couvercle du bol : elles comptent dans le décompte japonais, pas dans le chinois." }
  ]},
  { id: "etiquette", group: "Culture", title: "L'étiquette", sub: "Les usages autour du goban", body: [
    { list: [
      "On salue avant la partie : « **onegaishimasu** » (« je vous en prie »).",
      "On tient la pierre entre l'index et le majeur, puis on la pose franchement, sans la faire glisser.",
      "On évite de remuer les pierres dans le bol ou de commenter la partie en cours.",
      "Pour abandonner, on dit « **makemashita** » (« j'ai perdu ») ou on pose deux prisonniers sur le plateau.",
      "On remercie à la fin : « **arigatō gozaimashita** ». En ligne, un simple « merci pour la partie » fait l'affaire."
    ]},
    { p: "Abandonner une partie perdue n'est pas impoli, au contraire : cela montre qu'on a compris la position." }
  ]},
  { id: "rangs", group: "Pratiquer", title: "Les rangs et le handicap", sub: "Kyu, dan et pierres d'avance", body: [
    { p: "Les débutants commencent vers **30 kyu** et progressent jusqu'à **1 kyu**. Viennent ensuite les rangs **dan** amateurs (1er dan, 2e dan…), puis les dan professionnels, notés « p »." },
    { p: "La grande force du go est son **handicap** : le plus faible reçoit une pierre d'avance par rang d'écart (jusqu'à 9), placées sur les points étoiles. Un débutant peut ainsi jouer une partie serrée contre un joueur bien plus fort." },
    { p: "Sans handicap, Blanc reçoit le **komi** (6,5 ou 7,5 points selon les règles) pour compenser l'avantage de Noir, qui joue en premier. Avec handicap, le komi est réduit à 0,5 point." },
    { p: "Dans Tengen, le niveau estimé affiché dans ton profil est une indication tirée de tes résultats contre les différents niveaux de l'ordinateur." }
  ]},
  { id: "regles-monde", group: "Pratiquer", title: "Règles chinoises et japonaises", sub: "Deux façons de compter", body: [
    { p: "Les règles du jeu (libertés, capture, ko) sont les mêmes partout. Seul le **décompte** change :" },
    { list: [
      "**Règles chinoises** (décompte par surface) : pierres vivantes + territoire. C'est le système de Tengen, simple et sans piège.",
      "**Règles japonaises** (décompte par territoire) : territoire + prisonniers. Jouer dans son propre territoire y coûte un point, ce qui demande un peu plus d'attention en fin de partie."
    ]},
    { p: "Les deux systèmes donnent presque toujours le même vainqueur, avec un écart rarement supérieur à un point. Pour les tournois en France, le règlement officiel est publié par la Fédération française de go." },
    { link: "https://ffg.jeudego.org", label: "Fédération française de go", note: "Règles, clubs, tournois" }
  ]},
  { id: "jouer-ailleurs", group: "Pratiquer", title: "Jouer contre des humains", sub: "En ligne et en club", body: [
    { p: "Quand tu te sens à l'aise contre les niveaux Débutant et Novice, il est temps d'affronter des humains. Commence en 9×9 : les parties sont courtes et on apprend vite." },
    { link: "https://online-go.com", label: "OGS — Online Go Server", note: "Gratuit, en français, sur navigateur et mobile. Idéal pour débuter." },
    { link: "https://www.gokgs.com", label: "KGS", note: "Un serveur historique, avec beaucoup de parties commentées." },
    { link: "https://ffg.jeudego.org", label: "Fédération française de go", note: "Pour trouver un club près de chez toi, notamment en Île-de-France." },
    { p: "Astuce : exporte tes parties de Tengen au format SGF pour les rejouer ou les montrer à un joueur plus fort." }
  ]},
  { id: "progresser", group: "Pratiquer", title: "Progresser efficacement", sub: "Une méthode simple", body: [
    { list: [
      "**Un peu de problèmes chaque jour** : 10 minutes de tsumego valent mieux qu'une heure par semaine. Les révisions de Tengen sont faites pour ça.",
      "**Beaucoup de petites parties** : le 9×9 entraîne la lecture et la fin de partie. Passe au 13×13 puis au 19×19 quand tu gagnes régulièrement.",
      "**Analyse tes défaites** : regarde le moment où la courbe de KataGo chute, et demande à ton professeur IA d'expliquer.",
      "**Joue contre plus fort** : on progresse en perdant contre de meilleurs joueurs, avec handicap si besoin.",
      "**Ne t'attache pas aux pierres** : sacrifier deux pierres pour prendre l'initiative est souvent le meilleur choix."
    ]}
  ]},
  { id: "katago", group: "Découvrir", title: "KataGo dans ta poche", sub: "Comment fonctionne le moteur", body: [
    { p: "**KataGo** est un programme de go libre (licence MIT), créé par David J. Wu et entraîné par une communauté de bénévoles. Comme AlphaGo, il a appris seul, en jouant des millions de parties contre lui-même." },
    { p: "Tengen embarque un de ses réseaux de neurones (15 blocs, environ 20 Mo), converti pour tourner directement dans le navigateur de ton téléphone. Une fois téléchargé, il fonctionne **hors ligne**, sans compte ni abonnement." },
    { list: [
      "**Chance de gain** : la probabilité de victoire estimée par le réseau. Une chute de plus de 10 % sur un coup signale une erreur.",
      "**Avance en points** : le score attendu si les deux camps jouaient bien jusqu'au bout.",
      "**Coups suggérés** : les meilleurs candidats, avec la suite de coups envisagée."
    ]},
    { p: "Le moteur est fort mais pas infaillible sur un téléphone : sur de très longues séquences, il peut se tromper. Garde un esprit critique, c'est aussi ça, apprendre." }
  ]},
  { id: "coordonnees", group: "Découvrir", title: "Coordonnées et fichiers SGF", sub: "Noter une partie", body: [
    { p: "Les colonnes sont désignées par des lettres de gauche à droite, **sans la lettre I** (pour ne pas la confondre avec le J), et les lignes par des nombres de bas en haut. « D4 » est donc le point étoile en bas à gauche d'un 19×19." },
    { p: "Les parties s'enregistrent au format **SGF** (*Smart Game Format*), un fichier texte lu par tous les logiciels de go. Tengen exporte tes parties en SGF depuis l'écran d'analyse, et peut en importer depuis ton profil." }
  ]},
  { id: "premiers-pas", group: "Découvrir", title: "Bien utiliser Tengen", sub: "Le parcours conseillé", body: [
    { list: [
      "1. Suis le module **Les règles**, puis joue tout de suite contre le niveau Débutant en 9×9.",
      "2. Avance dans le parcours une ou deux leçons à la fois, en alternant avec des problèmes.",
      "3. Après chaque partie, ouvre l'**analyse** : KataGo montre les moments où la partie a basculé.",
      "4. Avec une clé API, pose tes questions à ton **professeur IA** (Claude, ChatGPT, Gemini…) : « pourquoi ce coup est-il mauvais ? »",
      "5. Quand tu bats le niveau Novice, inscris-toi sur OGS pour tes premières parties contre des humains."
    ]}
  ]}
];

export const GLOSSARY: GlossaryEntry[] = [
  { term: "Atari", jp: "当たり", def: "Situation d'une chaîne qui n'a plus qu'une liberté : elle peut être capturée au coup suivant." },
  { term: "Aji", jp: "味", def: "« Goût » : potentiel latent d'une position, faiblesse qui pourra être exploitée plus tard." },
  { term: "Bouche du tigre", jp: "虎口", def: "Forme de trois pierres autour d'un point vide où l'adversaire ne peut pas jouer sans être mis en atari." },
  { term: "Chaîne", def: "Groupe de pierres de même couleur reliées par les lignes. Elles partagent leurs libertés et sont capturées ensemble." },
  { term: "Coupe", jp: "切り", def: "Coup qui sépare deux pierres ou groupes adverses." },
  { term: "Dame", jp: "駄目", def: "Point neutre entre deux frontières, qui n'appartient à personne. Aussi : une liberté." },
  { term: "Damezumari", jp: "駄目詰まり", def: "Manque de libertés : une chaîne qui ne peut pas jouer certains coups car elle se mettrait elle-même en atari." },
  { term: "Dan", jp: "段", def: "Rangs des joueurs confirmés, au-dessus de 1 kyu. Il existe des dan amateurs et professionnels." },
  { term: "Échelle", jp: "シチョウ (shicho)", def: "Poursuite en zigzag d'une chaîne en atari permanent jusqu'au bord, où elle est capturée." },
  { term: "Épaisseur", jp: "厚み (atsumi)", def: "Mur solide sans faiblesse, qui exerce une influence sur le plateau." },
  { term: "Filet", jp: "ゲタ (geta)", def: "Coup qui enferme une pierre à distance, sans la mettre en atari, de sorte qu'elle ne peut plus s'échapper." },
  { term: "Fuseki", jp: "布石", def: "L'ouverture : la répartition des premières pierres sur tout le plateau." },
  { term: "Goban", jp: "碁盤", def: "Le plateau de jeu." },
  { term: "Go-ke", jp: "碁笥", def: "Les bols qui contiennent les pierres." },
  { term: "Gote", jp: "後手", def: "Coup qui n'exige pas de réponse : l'adversaire prend l'initiative." },
  { term: "Hane", jp: "ハネ", def: "Coup qui contourne une pierre adverse en diagonale de sa propre pierre." },
  { term: "Handicap", jp: "置き石", def: "Pierres noires posées d'avance pour équilibrer une partie entre joueurs de niveaux différents." },
  { term: "Hoshi", jp: "星", def: "Points étoiles, marqués sur le plateau. Aussi : le point 4-4 du coin." },
  { term: "Ikken tobi", jp: "一間トビ", def: "Saut d'une case : deux pierres sur la même ligne avec un point vide entre elles." },
  { term: "Joseki", jp: "定石", def: "Séquence établie dans un coin, jugée équitable pour les deux camps." },
  { term: "Kakari", jp: "掛かり", def: "Approche d'une pierre adverse isolée dans un coin." },
  { term: "Keima", jp: "桂馬", def: "Saut de cavalier : deux pierres placées comme le cavalier aux échecs." },
  { term: "Kikashi", jp: "利かし", def: "Coup forçant joué au bon moment, qui obtient une réponse utile sans rien perdre." },
  { term: "Ko", jp: "劫", def: "Situation où les deux joueurs pourraient se reprendre une pierre à l'infini ; la reprise immédiate est interdite." },
  { term: "Komi", jp: "コミ", def: "Points donnés à Blanc pour compenser l'avantage de jouer en second." },
  { term: "Komoku", jp: "小目", def: "Le point 3-4 d'un coin." },
  { term: "Kosumi", jp: "コスミ", def: "Coup en diagonale d'une pierre amie." },
  { term: "Kyu", jp: "級", def: "Rangs des joueurs en progression, de 30 kyu (débutant) à 1 kyu." },
  { term: "Liberté", def: "Intersection vide directement voisine d'une pierre ou d'une chaîne." },
  { term: "Miai", jp: "見合い", def: "Deux points équivalents : si l'adversaire en prend un, on prend l'autre." },
  { term: "Moyo", jp: "模様", def: "Vaste zone d'influence, pas encore un territoire acquis." },
  { term: "Nakade", jp: "中手", def: "Coup joué à l'intérieur de l'espace d'un groupe pour l'empêcher de faire deux yeux." },
  { term: "Nigiri", def: "Tirage au sort de la couleur : un joueur prend une poignée de blanches, l'autre devine pair ou impair." },
  { term: "Nobi", jp: "伸び", def: "Prolongement en ligne droite d'une pierre." },
  { term: "Œil", jp: "眼", def: "Point vide entièrement entouré par un groupe. Deux yeux séparés rendent un groupe vivant." },
  { term: "Faux œil", def: "Point qui ressemble à un œil mais dont les pierres peuvent être capturées par atari : il ne compte pas." },
  { term: "Onegaishimasu", def: "Formule de politesse au début d'une partie." },
  { term: "Ponnuki", jp: "ポン抜き", def: "Forme en losange laissée après la capture d'une pierre : très solide." },
  { term: "Prise-reprise", jp: "ウッテガエシ (uttegaeshi)", def: "Sacrifice d'une pierre dont la capture met l'adversaire en atari : on reprend aussitôt davantage." },
  { term: "San-san", jp: "三々", def: "Le point 3-3 d'un coin, solide mais bas." },
  { term: "Seki", jp: "セキ", def: "Vie commune : deux groupes sans yeux suffisants partagent des libertés, et aucun ne peut attaquer l'autre." },
  { term: "Semeai", jp: "攻め合い", def: "Course aux libertés entre deux groupes ennemis qui s'enserrent." },
  { term: "Sente", jp: "先手", def: "Coup qui oblige l'adversaire à répondre : on garde l'initiative." },
  { term: "Shimari", jp: "締まり", def: "Fermeture de coin avec deux pierres." },
  { term: "Tengen", jp: "天元", def: "Le point central du plateau. Littéralement « origine du ciel »." },
  { term: "Tenuki", jp: "手抜き", def: "Ignorer le dernier coup adverse pour jouer ailleurs." },
  { term: "Tesuji", jp: "手筋", def: "Coup habile, souvent inattendu, qui résout un problème tactique." },
  { term: "Triangle vide", jp: "空き三角", def: "Trois pierres en L avec le quatrième point vide : forme inefficace." },
  { term: "Tsumego", jp: "詰碁", def: "Problème de vie et de mort." },
  { term: "Tsuke", jp: "ツケ", def: "Attache : coup posé au contact d'une pierre adverse." },
  { term: "Yose", jp: "ヨセ", def: "La fin de partie : on règle les frontières, du coup le plus gros au plus petit." }
];

export const PROVERBS: Proverb[] = [
  { fr: "Frappe la tête de deux pierres.", explain: "Le hane devant deux pierres adverses alignées les écrase et renforce ta position." },
  { fr: "Le point vital de ton adversaire est ton point vital.", explain: "Le coup qui fait vivre un groupe est souvent aussi celui qui le tue. Joue-le le premier." },
  { fr: "Le débutant met en atari, l'expert joue avant l'atari.", explain: "Un atari pour rien renforce l'adversaire. Pense à ce qui se passe après." },
  { fr: "Sur la deuxième ligne, six meurent et huit vivent.", explain: "Une rangée de pierres sur la deuxième ligne, sous un mur adverse : avec six, le groupe est mort, avec huit il vit ; avec sept, tout dépend de qui joue." },
  { fr: "Le ponnuki vaut trente points.", explain: "La forme laissée par une capture au centre rayonne sur tout le plateau." },
  { fr: "Évite le triangle vide.", explain: "Trois pierres en L avec un point vide gaspillent un coup." },
  { fr: "Ne fais pas de territoire près de ton épaisseur.", explain: "Un mur sert à attaquer ou à encadrer de loin, pas à fermer quelques points collés à lui." },
  { fr: "Attaque de loin.", explain: "Chasser un groupe faible à distance rapporte du territoire ; au contact, tu le renforces." },
  { fr: "Sacrifie de petites pierres pour gagner les grandes.", explain: "Deux pierres sans valeur peuvent être abandonnées si cela te donne l'initiative." },
  { fr: "Apprendre des joseki par cœur fait perdre deux pierres de force.", explain: "Comprendre le sens des coups compte plus que réciter des séquences." },
  { fr: "Si tu ne connais pas les échelles, ne joue pas au go.", explain: "Lire une échelle est la première compétence de calcul." },
  { fr: "Joue là où l'adversaire voudrait jouer.", explain: "Le meilleur coup de l'adversaire est souvent aussi un excellent point pour toi." },
  { fr: "Un groupe sans base est un fardeau.", explain: "Un groupe faible oblige à le défendre pendant que l'adversaire gagne du terrain." },
  { fr: "Coins, puis bords, puis centre.", explain: "L'ordre naturel de l'ouverture, car les bords servent de murs." },
  { fr: "Dans le doute, joue le coup solide.", explain: "En cas d'hésitation, une connexion sûre vaut mieux qu'un coup brillant mal calculé." }
];
