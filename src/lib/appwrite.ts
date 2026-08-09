/**
 * AFFICHES-EM v1.0 — Connexion Appwrite
 *
 * Le client est configure a partir des variables d'environnement Vite.
 * Ces deux valeurs sont publiques par conception : l'identifiant de projet et
 * l'URL du point d'entree figurent dans tout code client Appwrite. La securite
 * ne repose jamais sur leur confidentialite, mais sur les permissions declarees
 * cote serveur (collections, buckets, Teams).
 *
 * AUCUNE CLE API NE DOIT FIGURER DANS CE FICHIER NI DANS AUCUN FICHIER DU DEPOT.
 *
 * Les valeurs reelles seront renseignees a l'etape 0.3, apres creation du projet
 * Appwrite. En leur absence, `estConfigure` vaut false et l'application affiche
 * un message explicite plutot que d'echouer silencieusement.
 */

import { Client, Account, Databases, Storage, Teams } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT ?? '';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID ?? '';

/** Indique si les variables d'environnement Appwrite sont renseignees. */
export const estConfigure = endpoint.length > 0 && projectId.length > 0;

const client = new Client();

if (estConfigure) {
  client.setEndpoint(endpoint).setProject(projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const teams = new Teams(client);

export { client };

/**
 * Identifiants des collections et buckets, definis a l'etape 0.4.
 * Regroupes ici pour eviter les chaines de caracteres disseminees dans le code.
 */
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID ?? 'affiches-em';

export const COLLECTIONS = {
  MARQUES: 'marques',
  ARTICLES: 'articles',
  CAMPAGNES: 'campagnes',
  AFFICHES: 'affiches',
  PARAMETRES: 'parametres',
  JOURNAL: 'journal',
  DEMANDES_ARTICLE: 'demandes-article',
} as const;

export const BUCKETS = {
  PHOTOS_PRODUITS: 'photos-produits',
  LOGOS_MARQUES: 'logos-marques',
  PICTOGRAMMES: 'pictogrammes',
} as const;
