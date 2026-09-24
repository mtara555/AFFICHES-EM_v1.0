/**
 * AFFICHES-EM v1.0 — Gabarits d'affiche A4
 *
 * Reprise fidele du modele PowerPoint `EMPOTXA4.potx` utilise par la macro
 * `ExporterVersPowerPointEM1`. Toutes les cotes sont en millimetres, mesurees
 * directement dans le fichier (1 mm = 36 000 EMU) : l'affiche imprimee depuis
 * l'application se superpose donc exactement a celle produite par PowerPoint.
 *
 * Les deux gabarits partagent la meme mise en page ; seul le cadre decoratif
 * change (fond bleu « Electro », fond rose-violet « Nouvelles technologies »).
 */

import type { CategorieProduit } from './constants';

export type Gabarit = 'electro' | 'nouvelles-technologies';

export interface DefinitionGabarit {
  readonly code: Gabarit;
  readonly libelle: string;
  /** Cadre PNG transparent pose au-dessus du contenu (Image 12 du modele). */
  readonly cadre: string;
}

const base = import.meta.env.BASE_URL;

export const GABARITS: Readonly<Record<Gabarit, DefinitionGabarit>> = {
  electro: {
    code: 'electro',
    libelle: 'Electro',
    cadre: `${base}affiches/cadre-electro.png`,
  },
  'nouvelles-technologies': {
    code: 'nouvelles-technologies',
    libelle: 'Nouvelles technologies (Image & Son)',
    cadre: `${base}affiches/cadre-nouvelles-technologies.png`,
  },
} as const;

export const GABARITS_ORDONNES: readonly Gabarit[] = ['electro', 'nouvelles-technologies'];

/**
 * Gabarit retenu pour chaque categorie produit.
 * Image & Son, telephonie et informatique relevent des « Nouvelles technologies » ;
 * tout le reste (gros et petit electromenager, froid, lavage, cuisson) d'« Electro ».
 */
export const GABARIT_PAR_CATEGORIE: Readonly<Record<CategorieProduit, Gabarit>> = {
  gem: 'electro',
  pem: 'electro',
  cuisson: 'electro',
  froid: 'electro',
  lavage: 'electro',
  'image-son': 'nouvelles-technologies',
  nt: 'nouvelles-technologies',
  telephonie: 'nouvelles-technologies',
  pc: 'nouvelles-technologies',
};

export function gabaritPourCategorie(categorie: CategorieProduit | null | undefined): Gabarit {
  return (categorie && GABARIT_PAR_CATEGORIE[categorie]) || 'electro';
}

/* -------------------------------------------------------------------------- */
/* Visuels fixes                                                               */
/* -------------------------------------------------------------------------- */

export const VISUELS = {
  credit: `${base}affiches/credit-0.png`,
  livraison: `${base}affiches/livraison-gratuite.png`,
} as const;

/* -------------------------------------------------------------------------- */
/* Cotes du modele (mm)                                                        */
/* -------------------------------------------------------------------------- */

export interface Zone {
  readonly x: number;
  readonly y: number;
  readonly l: number;
  readonly h: number;
}

/**
 * Emplacements, avec le nom de la forme PowerPoint d'origine en commentaire.
 * Les six emplacements de pictogrammes suivent l'ordre des colonnes E a J du
 * classeur, exactement comme `InsererDonnees`.
 */
export const COTES = {
  logo: { x: 59.7, y: 39.2, l: 84.2, h: 34.8 }, // Rectangle 3
  badge: { x: 153.5, y: 38.1, l: 38.1, h: 35.9 }, // Rectangle 6
  designation: { x: 27.6, y: 74.0, l: 148.4, h: 16.5 }, // Rectangle 4
  reference: { x: 27.6, y: 90.5, l: 148.4, h: 16.5 }, // Rectangle 5
  pictos: [
    { x: 19.5, y: 107.9, l: 30.0, h: 25.0 }, // Rectangle 1  — colonne E
    { x: 55.8, y: 107.6, l: 30.0, h: 25.0 }, // Rectangle 19 — colonne F
    { x: 19.5, y: 133.9, l: 30.0, h: 25.0 }, // Rectangle 20 — colonne G
    { x: 55.8, y: 134.1, l: 30.0, h: 25.0 }, // Rectangle 21 — colonne H
    { x: 94.1, y: 133.9, l: 18.7, h: 25.0 }, // Rectangle 11 — colonne I (garantie)
    { x: 94.1, y: 107.6, l: 28.4, h: 25.0 }, // Rectangle 10 — colonne J
  ] as readonly Zone[],
  livraison: { x: 120.3, y: 137.8, l: 51.2, h: 25.0 }, // Image 16
  prixBarre: { x: 27.6, y: 159.3, l: 144.0, h: 17.1 }, // Rectangle 27
  blocPrix: { x: 27.6, y: 165.3, l: 143.5, h: 61.0 }, // Rectangle 124
  prixPrincipal: { x: 27.6, y: 186.8, l: 143.5, h: 41.0 }, // Rectangle 24
  economie: { x: 28.0, y: 185.8, l: 152.0, h: 59.5 }, // Organigramme1
  economieTexte: { x: 27.3, y: 228.4, l: 104.7, h: 18.0 }, // Rectangle 25
  economieArabe: { x: 132.7, y: 228.4, l: 51.3, h: 18.0 }, // Rectangle 26
  credit: { x: 18.8, y: 246.5, l: 81.8, h: 28.2 }, // Image 22
  mensualite: { x: 15.5, y: 257.1, l: 64.1, h: 15.4 }, // Rectangle 23
  duree: { x: 18.8, y: 267.1, l: 55.5, h: 9.4 }, // Rectangle 28
} as const;

/** Couleurs du modele. */
export const COULEURS = {
  bleu: '#004497',
  jaune: '#ffff00',
  orange: '#ffc000',
  rouge: '#ff0000',
} as const;
