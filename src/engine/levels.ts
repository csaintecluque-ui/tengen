export interface Level {
  id: number;
  name: string;
  desc: string;
  needsKatago: boolean;
  /** force indicative, sur l'échelle kyu (30 = 30 kyu, 0 = 1 dan environ) */
  kyu: number;
}

export const LEVELS: Level[] = [
  { id: 0, name: "Débutant", desc: "Fait des fautes grossières. Parfait pour ses premières parties.", needsKatago: false, kyu: 28 },
  { id: 1, name: "Novice", desc: "Capture ce qui traîne, défend ses pierres en atari.", needsKatago: false, kyu: 22 },
  { id: 2, name: "Club", desc: "Joue des formes correctes mais commet régulièrement des erreurs.", needsKatago: true, kyu: 12 },
  { id: 3, name: "Fort", desc: "L'intuition de KataGo, sans calcul. Solide joueur de club.", needsKatago: true, kyu: 4 },
  { id: 4, name: "Expert", desc: "KataGo qui lit les variantes. Très difficile à battre.", needsKatago: true, kyu: -2 }
];

export function kyuLabel(k: number): string {
  const r = Math.round(k);
  return r > 0 ? `${r} kyu` : `${1 - r} dan`;
}
