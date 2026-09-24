import { useMemo } from 'react';
import { FORMATS, type FormatAffiche } from '../config/constants';
import { modulesEnRectangles, preparerCodeBarres } from '../lib/barcode';
import { appliquerRegles, formaterMontant, type ParametresRegles } from '../lib/regles';
import './Affiche.css';

export interface DonneesAffiche {
  readonly ean: string;
  readonly marque: string;
  readonly designation: string;
  readonly reference: string;
  readonly pictos: readonly string[];
  readonly prixBarre: number;
  readonly prixPrincipal: number;
  readonly format: FormatAffiche;
  readonly stockLimite: boolean;
  readonly nouveaute: boolean;
  readonly promotion: boolean;
  readonly livraisonGratuiteExclue: boolean;
}

interface AfficheProps {
  readonly donnees: DonneesAffiche;
  readonly parametres: ParametresRegles;
  /**
   * Millimetres par pixel a l'affichage. La valeur d'impression (11,811,
   * soit 300 dpi) est utilisee pour l'export ; une valeur plus faible sert a
   * l'apercu ecran.
   */
  readonly echelle: number;
}

/** Convertit une taille typographique en millimetres (1 pt = 1/72 pouce). */
const pt = (valeur: number) => valeur * 0.352_777_8;

/**
 * Separe la partie entiere des centimes.
 *
 * Les affiches existantes composent la partie entiere en tres gros et les
 * centimes en plus petit — c'est cette hierarchie qui rend le prix lisible de
 * loin en rayon.
 */
function decouperPrix(valeur: number): { entier: string; centimes: string } {
  const entier = Math.floor(Math.abs(valeur));
  const centimes = Math.round((Math.abs(valeur) - entier) * 100);
  return {
    entier: entier.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' '),
    centimes: String(centimes).padStart(2, '0'),
  };
}

export function Affiche({ donnees, parametres, echelle }: AfficheProps) {
  const format = FORMATS[donnees.format];
  const regles = appliquerRegles(
    donnees.prixBarre,
    donnees.prixPrincipal,
    donnees.livraisonGratuiteExclue,
    parametres,
  );

  /**
   * Les tailles typographiques du guide PLV sont donnees pour l'A4. Les autres
   * formats reprennent les memes proportions, mises a l'echelle de la largeur.
   */
  const facteur = format.largeurMm / FORMATS.A4.largeurMm;

  const codeBarres = useMemo(() => preparerCodeBarres(donnees.ean), [donnees.ean]);
  const prix = decouperPrix(donnees.prixPrincipal);
  const barre = decouperPrix(donnees.prixBarre);

  /**
   * La designation doit tenir sur une ligne : le guide prevoit une plage de 28
   * a 60 pt selon sa longueur. On interpole plutot que de laisser le texte
   * deborder ou etre tronque.
   */
  const tailleDesignation = Math.max(28, Math.min(60, 900 / Math.max(donnees.designation.length, 1)));

  const style = {
    '--mm': `${echelle}px`,
    '--largeur': format.largeurMm,
    '--hauteur': format.hauteurMm,
    '--facteur': facteur,
  } as React.CSSProperties;

  const pictosVisibles = donnees.pictos.filter((p) => p.trim().length > 0);

  return (
    <div className={`affiche affiche--${donnees.format.toLowerCase()}`} style={style}>
      <div className="affiche__fond" />

      <header className="affiche__entete">
        <div className="affiche__marque">{donnees.marque || 'MARQUE'}</div>
        <div
          className="affiche__designation"
          style={{ fontSize: `calc(${pt(tailleDesignation * facteur)} * var(--mm))` }}
        >
          {donnees.designation || 'DESIGNATION'}
        </div>
        {donnees.reference ? (
          <div className="affiche__reference">{donnees.reference}</div>
        ) : null}
      </header>

      {pictosVisibles.length > 0 ? (
        <div className="affiche__pictos">
          {pictosVisibles.map((picto, i) => (
            <span className="picto" key={i}>
              {picto}
            </span>
          ))}
        </div>
      ) : null}

      <div className="affiche__badges">
        {regles.livraisonGratuite ? (
          <span className="badge badge--rouge">LIVRAISON GRATUITE</span>
        ) : null}
        {donnees.stockLimite ? <span className="badge badge--jaune">STOCK LIMITE</span> : null}
        {donnees.nouveaute ? <span className="badge badge--bleu">NOUVEAUTE</span> : null}
        {donnees.promotion ? <span className="badge badge--rouge">PROMOTION</span> : null}
      </div>

      <div className="affiche__espace" />

      <div className="affiche__prix">
        {donnees.prixBarre > 0 ? (
          <div className="affiche__barre">
            {barre.entier},{barre.centimes} dh
          </div>
        ) : null}

        <div className="affiche__bande">
          <span className="affiche__entier">{prix.entier}</span>
          <span className="affiche__centimes">,{prix.centimes}dh</span>
        </div>

        {regles.afficherEconomie ? (
          <div className="affiche__economie">
            <span className="affiche__economie-montant">
              {formaterMontant(regles.economie)} dh
            </span>
            <span className="affiche__economie-arabe">وفر</span>
          </div>
        ) : null}
      </div>

      <footer className="affiche__pied">
        {regles.dureeCredit && regles.mensualite !== null ? (
          <div className="affiche__credit">
            <span className="affiche__credit-titre">Credit sans interet</span>
            <span className="affiche__credit-montant">
              {formaterMontant(regles.mensualite)} dh
            </span>
            <span className="affiche__credit-duree">x {regles.dureeCredit} mois</span>
          </div>
        ) : (
          <div />
        )}

        {codeBarres ? (
          <div className="affiche__codebarres">
            <svg
              viewBox={`0 0 ${95} ${30}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Code barres ${codeBarres.chiffres}`}
            >
              {modulesEnRectangles(codeBarres.modules, 95, 30).map((r, i) => (
                <rect key={i} x={r.x} y={0} width={r.largeur} height={r.hauteur} fill="#101636" />
              ))}
            </svg>
            <span className="affiche__codebarres-texte">{codeBarres.chiffres}</span>
          </div>
        ) : (
          <div className="affiche__codebarres affiche__codebarres--absent">
            <span className="affiche__codebarres-texte">{donnees.ean}</span>
          </div>
        )}
      </footer>

      <div className="affiche__logo" aria-hidden="true">
        m
      </div>
    </div>
  );
}
