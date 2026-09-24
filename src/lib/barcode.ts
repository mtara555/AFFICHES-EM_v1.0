/**
 * AFFICHES-EM v1.0 — Generation de codes-barres EAN-13
 *
 * Implemente la norme GS1 : 95 modules, encodage a parite variable sur la
 * moitie gauche, marqueurs de garde en debut, milieu et fin.
 *
 * Le catalogue reel comporte 110 codes qui ne sont pas des EAN-13 — des
 * references internes de 7 a 12 chiffres. Ils ne peuvent pas produire de
 * code-barres valide : la fonction renvoie alors null plutot que de dessiner
 * un code errone, qui serait refuse en caisse.
 */

/** Tables d'encodage GS1. Chaque chiffre occupe 7 modules. */
const GAUCHE_IMPAIR = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
] as const;

const GAUCHE_PAIR = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
] as const;

const DROITE = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
] as const;

/**
 * Le premier chiffre n'est pas dessine : il est encode par l'alternance de
 * parite des six chiffres suivants. C'est ce qui permet a l'EAN-13 de tenir
 * dans la meme largeur que l'EAN-8.
 */
const PARITE = [
  'IIIIII', 'IIPIPP', 'IIPPIP', 'IIPPPI', 'IPIIPP',
  'IPPIIP', 'IPPPII', 'IPIPIP', 'IPIPPI', 'IPPIPI',
] as const;

/** Calcule la cle de controle d'un code de 12 chiffres. */
export function calculerCleControle(douzeChiffres: string): number {
  let somme = 0;
  for (let i = 0; i < 12; i++) {
    somme += Number(douzeChiffres[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (somme % 10)) % 10;
}

/** Verifie qu'un code de 13 chiffres porte une cle de controle correcte. */
export function estEan13Valide(code: string): boolean {
  const c = code.trim();
  if (!/^\d{13}$/.test(c)) return false;
  return calculerCleControle(c.slice(0, 12)) === Number(c[12]);
}

export interface CodeBarres {
  /** Les 13 chiffres, cle de controle comprise. */
  readonly chiffres: string;
  /** Suite de 95 modules, « 1 » pour une barre, « 0 » pour un blanc. */
  readonly modules: string;
}

/**
 * Prepare un code-barres a partir d'un code article.
 *
 * Un code de 12 chiffres se voit completer par sa cle de controle. Un code de
 * 13 chiffres est verifie : une cle fausse renvoie null, car imprimer un
 * code-barres invalide est pire que ne pas en imprimer du tout.
 */
export function preparerCodeBarres(code: string): CodeBarres | null {
  const c = code.trim();

  let treize: string;
  if (/^\d{12}$/.test(c)) {
    treize = c + String(calculerCleControle(c));
  } else if (/^\d{13}$/.test(c)) {
    if (!estEan13Valide(c)) return null;
    treize = c;
  } else {
    return null;
  }

  const parite = PARITE[Number(treize[0])];
  if (!parite) return null;

  let modules = '101'; // garde de debut

  for (let i = 0; i < 6; i++) {
    const chiffre = Number(treize[1 + i]);
    const table = parite[i] === 'I' ? GAUCHE_IMPAIR : GAUCHE_PAIR;
    modules += table[chiffre];
  }

  modules += '01010'; // garde centrale

  for (let i = 0; i < 6; i++) {
    modules += DROITE[Number(treize[7 + i])];
  }

  modules += '101'; // garde de fin

  return { chiffres: treize, modules };
}

/**
 * Convertit les modules en rectangles SVG.
 *
 * Les barres de garde descendent plus bas que les autres, conformement a la
 * norme : c'est ce qui permet aux lecteurs de reperer les extremites.
 */
export function modulesEnRectangles(
  modules: string,
  largeur: number,
  hauteur: number,
): { x: number; largeur: number; hauteur: number }[] {
  const unite = largeur / 95;
  const positionsGardes = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  const rectangles: { x: number; largeur: number; hauteur: number }[] = [];

  let i = 0;
  while (i < modules.length) {
    if (modules[i] === '0') {
      i += 1;
      continue;
    }
    // Regroupe les modules noirs adjacents en une seule barre.
    let fin = i;
    while (fin + 1 < modules.length && modules[fin + 1] === '1') fin += 1;

    let estGarde = false;
    for (let k = i; k <= fin; k++) {
      if (positionsGardes.has(k)) estGarde = true;
    }

    rectangles.push({
      x: i * unite,
      largeur: (fin - i + 1) * unite,
      hauteur: estGarde ? hauteur : hauteur * 0.9,
    });
    i = fin + 1;
  }

  return rectangles;
}
