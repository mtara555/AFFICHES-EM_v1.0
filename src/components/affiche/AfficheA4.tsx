import type { CSSProperties } from 'react';
import { COTES, GABARITS, VISUELS, type Zone } from '../../config/gabarits';
import { decouperMontant, type DonneesAffiche } from '../../lib/affiche-rendu';
import { formaterMontant } from '../../lib/regles';
import { Visuel } from './Visuel';
import { Pictogramme } from './Pictogramme';
import { TexteAjuste } from './TexteAjuste';
import './AfficheA4.css';

/** Positionne un element sur la zone du modele, en millimetres. */
const zone = (z: Zone): CSSProperties => ({
  left: `${z.x}mm`,
  top: `${z.y}mm`,
  width: `${z.l}mm`,
  height: `${z.h}mm`,
});

interface AfficheA4Props {
  readonly donnees: DonneesAffiche;
}

/**
 * Affiche prix A4 — equivalent d'une diapositive generee par la macro
 * `ExporterVersPowerPointEM1`.
 *
 * Les regles d'affichage sont celles de `InsererDonnees` :
 * - prix barre (et son trait) des que le prix barre depasse le prix de vente ;
 * - bandeau « economie » seulement si la remise atteint le seuil (10 %) ;
 * - credit 0 % a partir du premier palier du bareme, masque en dessous ;
 * - livraison gratuite au-dela du seuil, sauf article exclu.
 *
 * L'ordre des elements reproduit l'ordre d'empilement du modele : le bandeau
 * rouge passe sous le bloc bleu, le cadre decoratif recouvre l'ensemble.
 */
export function AfficheA4({ donnees }: AfficheA4Props) {
  const { regles } = donnees;
  const gabarit = GABARITS[donnees.gabarit];
  const principal = decouperMontant(donnees.prixPrincipal);
  const barre = decouperMontant(donnees.prixBarre);
  const mensualite = regles.mensualite !== null ? decouperMontant(regles.mensualite) : null;
  const badges = [
    donnees.badges.nouveaute ? 'Nouveauté' : null,
    donnees.badges.stockLimite ? 'Stock limité' : null,
    donnees.badges.promotion ? 'Offre limitée' : null,
  ].filter((b): b is string => b !== null);

  return (
    <article className={`affiche affiche--${donnees.gabarit}`} aria-label={donnees.designation}>
      {/* Bandeau economie : sous le bloc prix, seule sa partie basse depasse. */}
      {regles.afficherEconomie ? (
        <div className="affiche__economie" style={zone(COTES.economie)} />
      ) : null}

      <div className="affiche__logo" style={zone(COTES.logo)}>
        <Visuel
          fileId={donnees.logoFileId}
          alt={donnees.marqueNom}
          className="affiche__logo-image"
          secours={
            <TexteAjuste className="affiche__logo-texte" taillePt={60} minPt={16} contenu={donnees.marqueNom}>
              {donnees.marqueNom}
            </TexteAjuste>
          }
        />
      </div>

      {badges.length > 0 ? (
        <div className="affiche__badges" style={zone(COTES.badge)}>
          {badges.map((b) => (
            <span key={b} className="affiche__badge">
              {b}
            </span>
          ))}
        </div>
      ) : null}

      <TexteAjuste
        className="affiche__designation"
        style={zone(COTES.designation)}
        taillePt={24}
        minPt={12}
        multiligne
        contenu={donnees.designation}
      >
        {donnees.designation}
      </TexteAjuste>

      <TexteAjuste
        className="affiche__reference"
        style={zone(COTES.reference)}
        taillePt={20}
        minPt={10}
        multiligne
        contenu={donnees.reference}
      >
        {donnees.reference}
      </TexteAjuste>

      {COTES.pictos.map((z, i) => {
        const code = donnees.pictos[i] ?? '';
        return code ? (
          <div key={i} className="affiche__picto" style={zone(z)}>
            <Pictogramme code={code} />
          </div>
        ) : null;
      })}

      {regles.livraisonGratuite ? (
        <img
          className="affiche__image"
          style={zone(COTES.livraison)}
          src={VISUELS.livraison}
          alt="Livraison gratuite"
        />
      ) : null}

      <div className="affiche__bloc-prix" style={zone(COTES.blocPrix)} />

      {donnees.afficherPrixBarre ? (
        <div className="affiche__prix-barre" style={zone(COTES.prixBarre)}>
          <span className="affiche__prix-barre-montant">
            <span className="affiche__prix-barre-entier">{barre.entier}</span>
            <span className="affiche__prix-barre-reste">{barre.reste}</span>
          </span>
        </div>
      ) : null}

      <TexteAjuste
        className="affiche__prix-principal"
        style={zone(COTES.prixPrincipal)}
        taillePt={90}
        minPt={40}
        contenu={`${principal.entier}${principal.reste}`}
      >
        <span className="affiche__prix-entier">{principal.entier}</span>
        <span className="affiche__prix-reste">{principal.reste}</span>
      </TexteAjuste>

      {regles.afficherEconomie ? (
        <>
          <TexteAjuste
            className="affiche__economie-texte"
            style={zone(COTES.economieTexte)}
            taillePt={36}
            minPt={16}
            contenu={String(regles.economie)}
          >
            {formaterMontant(regles.economie)} dh
          </TexteAjuste>
          <div className="affiche__economie-arabe" style={zone(COTES.economieArabe)} lang="ar" dir="rtl">
            وفر
          </div>
        </>
      ) : null}

      {regles.dureeCredit !== null && mensualite ? (
        <>
          <img
            className="affiche__image"
            style={zone(COTES.credit)}
            src={VISUELS.credit}
            alt="Crédit 0 %"
          />
          <TexteAjuste
            className="affiche__mensualite"
            style={zone(COTES.mensualite)}
            taillePt={30}
            minPt={14}
            contenu={`${mensualite.entier}${mensualite.reste}`}
          >
            <span>{mensualite.entier}</span>
            <span className="affiche__mensualite-reste">{mensualite.reste}</span>
          </TexteAjuste>
          <div className="affiche__duree" style={zone(COTES.duree)}>
            {regles.dureeCredit} Mois
          </div>
        </>
      ) : null}

      <img className="affiche__cadre" src={gabarit.cadre} alt="" aria-hidden="true" />
    </article>
  );
}
