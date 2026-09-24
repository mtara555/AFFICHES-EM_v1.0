/**
 * AFFICHES-EM v1.0 — Export PDF
 *
 * Remplace la generation PowerPoint du classeur VBA. Le rendu HTML est capture
 * a 300 dpi puis place dans un PDF aux dimensions reelles du format.
 *
 * Les affiches A6 sont imposees quatre par planche A4, conformement au kit
 * papier : « Le papier template au format A6 sera livre sur du A4 afin de
 * faciliter l'impression du fichier de saisie. »
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FORMATS, type FormatAffiche } from '../config/constants';

/** Pixels par millimetre a 300 dpi — resolution attendue en impression. */
export const ECHELLE_IMPRESSION = 11.811;

/**
 * Capture un element deja rendu dans la page.
 *
 * L'element doit etre presente a l'echelle d'impression : html2canvas
 * photographie ce qui est affiche, une capture d'un apercu reduit produirait
 * une image floue une fois imprimee.
 */
async function capturer(element: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 1,
    useCORS: true,
    logging: false,
  });
}

/** Positions des quatre emplacements A6 sur une planche A4. */
const POSITIONS_A6: readonly (readonly [number, number])[] = [
  [0, 0],
  [105, 0],
  [0, 148.5],
  [105, 148.5],
];

export interface ElementAExporter {
  readonly element: HTMLElement;
  readonly format: FormatAffiche;
  readonly nom: string;
}

/** Exporte une affiche unique, au format reel. */
export async function exporterUnePage(
  element: HTMLElement,
  format: FormatAffiche,
  nomFichier: string,
): Promise<void> {
  const dimensions = FORMATS[format];
  const canvas = await capturer(element);

  const pdf = new jsPDF({
    unit: 'mm',
    format: [dimensions.largeurMm, dimensions.hauteurMm],
    orientation: dimensions.largeurMm > dimensions.hauteurMm ? 'landscape' : 'portrait',
  });

  pdf.addImage(
    canvas.toDataURL('image/png'),
    'PNG',
    0,
    0,
    dimensions.largeurMm,
    dimensions.hauteurMm,
  );
  pdf.save(`${nomFichier}.pdf`);
}

/**
 * Exporte un lot d'affiches dans un seul PDF.
 *
 * Les A4, A5 et A7 occupent une page chacun. Les A6 sont regroupes par quatre
 * sur une planche A4 ; un groupe incomplet occupe la planche suivante sans
 * attendre d'etre rempli.
 */
export async function exporterLot(
  elements: readonly ElementAExporter[],
  nomFichier: string,
  surProgression?: (traites: number, total: number) => void,
): Promise<void> {
  if (elements.length === 0) return;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let premierePage = true;
  let traites = 0;

  const lotA6: ElementAExporter[] = [];

  async function viderLotA6() {
    if (lotA6.length === 0) return;
    if (!premierePage) pdf.addPage('a4', 'portrait');
    premierePage = false;

    for (let i = 0; i < lotA6.length; i++) {
      const position = POSITIONS_A6[i];
      const item = lotA6[i];
      if (!position || !item) continue;
      const canvas = await capturer(item.element);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', position[0], position[1], 105, 148.5);
    }
    lotA6.length = 0;
  }

  for (const item of elements) {
    if (item.format === 'A6') {
      lotA6.push(item);
      if (lotA6.length === 4) await viderLotA6();
    } else {
      await viderLotA6();
      const dimensions = FORMATS[item.format];
      if (!premierePage) {
        pdf.addPage(
          [dimensions.largeurMm, dimensions.hauteurMm],
          dimensions.largeurMm > dimensions.hauteurMm ? 'landscape' : 'portrait',
        );
      }
      premierePage = false;
      const canvas = await capturer(item.element);
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        dimensions.largeurMm,
        dimensions.hauteurMm,
      );
    }

    traites += 1;
    surProgression?.(traites, elements.length);
  }

  await viderLotA6();
  pdf.save(`${nomFichier}.pdf`);
}

/** Nom de fichier sur : sans accents, sans caracteres interdits. */
export function nomFichierSur(base: string): string {
  return (
    base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'affiches'
  );
}
