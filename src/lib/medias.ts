/**
 * AFFICHES-EM v1.0 — Chargement des visuels du compartiment « medias »
 *
 * Une balise <img> pointant directement sur Appwrite ne transmet pas la session
 * lorsque le navigateur bloque les cookies tiers (cas general : l'application
 * est servie par github.io, Appwrite par appwrite.io). Le fichier est donc
 * telecharge par `fetch`, avec l'en-tete de secours que le SDK utilise lui-meme,
 * puis expose sous forme d'URL locale (blob:). Le compartiment n'a ainsi pas
 * besoin d'etre rendu public.
 *
 * Chaque identifiant n'est demande qu'une fois par session : une campagne de
 * 50 affiches reutilisant les memes pictogrammes ne declenche que quelques
 * requetes. Un fichier absent est memorise comme tel (null) et l'affiche bascule
 * sur son rendu de secours, sans erreur visible.
 */

import { storage, BUCKET_MEDIAS, estConfigure } from './appwrite';

const cache = new Map<string, Promise<string | null>>();
const enCours = new Set<Promise<string | null>>();

async function telecharger(fileId: string): Promise<string | null> {
  if (!estConfigure) return null;
  try {
    const url = storage.getFileView({ bucketId: BUCKET_MEDIAS, fileId });
    const entetes: Record<string, string> = {};
    try {
      const secours = window.localStorage.getItem('cookieFallback');
      if (secours) entetes['X-Fallback-Cookies'] = secours;
    } catch {
      /* stockage local indisponible : la session par cookie suffira */
    }
    // « no-cache » : le navigateur revalide aupres d'Appwrite, pour qu'un logo
    // remplace sous le meme identifiant ne reste pas affiche dans son ancienne version.
    const reponse = await fetch(url, { credentials: 'include', headers: entetes, cache: 'no-cache' });
    if (!reponse.ok) return null;
    const contenu = await reponse.blob();
    if (!contenu.type.startsWith('image/')) return null;
    return URL.createObjectURL(contenu);
  } catch {
    return null;
  }
}

/** Renvoie une URL affichable pour le fichier, ou null s'il n'existe pas. */
export function chargerMedia(fileId: string): Promise<string | null> {
  const existant = cache.get(fileId);
  if (existant) return existant;

  const promesse = telecharger(fileId);
  cache.set(fileId, promesse);
  enCours.add(promesse);
  void promesse.finally(() => enCours.delete(promesse));
  return promesse;
}

/**
 * Retire un fichier du cache, apres son remplacement ou sa suppression : le
 * prochain affichage ira chercher la nouvelle version.
 */
export function oublierMedia(fileId: string): void {
  // L'ancienne URL n'est pas revoquee : une image encore affichee l'utilise
  // peut-etre. Le navigateur la liberera a la fermeture de la page.
  cache.delete(fileId);
}

/** Resout quand tous les telechargements lances sont termines. */
export async function attendreMedias(): Promise<void> {
  while (enCours.size > 0) {
    await Promise.allSettled([...enCours]);
  }
}

/**
 * Attend que la page soit prete a etre imprimee : visuels telecharges, images
 * decodees et polices chargees. Sans cette attente, le navigateur imprimerait
 * des emplacements vides.
 */
export async function attendreRenduComplet(): Promise<void> {
  await attendreMedias();
  // Laisse React inserer les images obtenues avant de les inspecter.
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const images = Array.from(document.images).filter((img) => !img.complete);
  await Promise.allSettled(
    images.map(
      (img) =>
        new Promise((r) => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', r, { once: true });
        }),
    ),
  );
  if ('fonts' in document) await document.fonts.ready;
}
