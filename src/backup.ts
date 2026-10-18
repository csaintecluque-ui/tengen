/** Sauvegarde complète des données de Tengen (réglages, progression, parties) dans un fichier,
 *  pour les mettre à l'abri ou les transférer avant une réinstallation de l'appli. */
const PREFIX = "tengen.";

export interface Backup { app: "tengen"; version: number; at: string; data: Record<string, string>; }

export function makeBackup(): Backup {
  const data: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) data[k] = localStorage.getItem(k) ?? "";
    }
  } catch { /* stockage indisponible */ }
  return { app: "tengen", version: 1, at: new Date().toISOString(), data };
}

export function backupSummary(b: Backup) {
  const get = (k: string) => { try { return JSON.parse(b.data[PREFIX + k] || "null"); } catch { return null; } };
  const games = (get("games") as unknown[] | null)?.length ?? 0;
  const progress = get("progress") as { lessons?: Record<string, number>; problems?: Record<string, unknown> } | null;
  return { games, lessons: Object.keys(progress?.lessons || {}).length, problems: Object.keys(progress?.problems || {}).length };
}

function fileName() { return `tengen-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`; }

/** Envoie la sauvegarde : feuille de partage sur téléphone (« Enregistrer dans Fichiers »), téléchargement sinon. */
export async function shareBackup(): Promise<"shared" | "downloaded" | "cancelled"> {
  const text = JSON.stringify(makeBackup());
  const file = new File([text], fileName(), { type: "application/json" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "Sauvegarde Tengen" }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "downloaded";
}

export async function copyBackup(): Promise<boolean> {
  try { await navigator.clipboard.writeText(JSON.stringify(makeBackup())); return true; } catch { return false; }
}

export function parseBackup(text: string): Backup {
  let j: Backup;
  try { j = JSON.parse(text.trim()); } catch { throw new Error("Ce texte n'est pas une sauvegarde lisible."); }
  if (!j || j.app !== "tengen" || typeof j.data !== "object") throw new Error("Ce fichier n'est pas une sauvegarde Tengen.");
  return j;
}

/** Remplace les données de l'appareil par celles de la sauvegarde, puis recharge l'appli. */
export function restoreBackup(b: Backup) {
  const keep: string[] = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) keep.push(k); }
  keep.forEach((k) => localStorage.removeItem(k));
  for (const [k, v] of Object.entries(b.data)) if (k.startsWith(PREFIX)) localStorage.setItem(k, v);
  location.reload();
}
