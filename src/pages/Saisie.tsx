import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { trouverParEan, type Article } from '../lib/articles';
import { listerMarques, type Marque } from '../lib/marques';
import {
  ajouterAffiche,
  listerAffiches,
  messageErreurCampagne,
  obtenirCampagne,
  supprimerAffiche,
  type Affiche,
  type Campagne,
} from '../lib/campagnes';
import {
  appliquerRegles,
  chargerParametres,
  formaterMontant,
  PARAMETRES_DEFAUT,
  type ParametresRegles,
} from '../lib/regles';
import { FORMATS, FORMATS_ORDONNES, type FormatAffiche } from '../config/constants';
import { AfficheA4 } from '../components/affiche/AfficheA4';
import { Reduction } from '../components/affiche/Reduction';
import { preparerDonnees } from '../lib/affiche-rendu';
import './Saisie.css';

export function Saisie() {
  const { campagneId } = useParams<{ campagneId: string }>();
  const { utilisateur } = useAuth();

  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [affiches, setAffiches] = useState<Affiche[]>([]);
  const [marques, setMarques] = useState<Marque[]>([]);
  const [parametres, setParametres] = useState<ParametresRegles>(PARAMETRES_DEFAUT);

  const [ean, setEan] = useState('');
  const [article, setArticle] = useState<Article | null>(null);
  const [recherche, setRecherche] = useState(false);
  const [introuvable, setIntrouvable] = useState(false);

  const [prixBarre, setPrixBarre] = useState('');
  const [prixPrincipal, setPrixPrincipal] = useState('');
  const [format, setFormat] = useState<FormatAffiche>('A4');
  const [stockLimite, setStockLimite] = useState(false);
  const [nouveaute, setNouveaute] = useState(false);
  const [promotion, setPromotion] = useState(false);

  const [erreur, setErreur] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const champEan = useRef<HTMLInputElement>(null);

  const nomsMarques = useMemo(
    () => new Map(marques.map((m) => [m.id, m.nom])),
    [marques],
  );

  const charger = useCallback(async () => {
    if (!campagneId) return;
    setErreur(null);
    try {
      const [c, a, m, p] = await Promise.all([
        obtenirCampagne(campagneId),
        listerAffiches(campagneId),
        listerMarques(),
        chargerParametres(),
      ]);
      setCampagne(c);
      setAffiches(a);
      setMarques(m);
      setParametres(p);
    } catch (probleme) {
      setErreur(messageErreurCampagne(probleme));
    }
  }, [campagneId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  /** Recherche l'article des que le code saisi est plausible. */
  async function chercherArticle() {
    const code = ean.trim();
    if (!code) return;

    setRecherche(true);
    setIntrouvable(false);
    setErreur(null);
    try {
      const trouve = await trouverParEan(code);
      setArticle(trouve);
      setIntrouvable(trouve === null);
    } catch (probleme) {
      setErreur(messageErreurCampagne(probleme));
    } finally {
      setRecherche(false);
    }
  }

  /** Affiche telle qu'elle sera imprimee, recalculee a chaque frappe. */
  const apercu = useMemo(() => {
    if (!article) return null;
    return preparerDonnees(
      {
        cle: 'apercu',
        article,
        marque: marques.find((m) => m.id === article.marqueId),
        prixBarre: Number(prixBarre.replace(',', '.')) || 0,
        prixPrincipal: Number(prixPrincipal.replace(',', '.')) || 0,
        nouveaute,
        stockLimite,
        promotion,
      },
      parametres,
    );
  }, [article, marques, prixBarre, prixPrincipal, nouveaute, stockLimite, promotion, parametres]);

  const regles = useMemo(
    () =>
      appliquerRegles(
        Number(prixBarre.replace(',', '.')) || 0,
        Number(prixPrincipal.replace(',', '.')) || 0,
        article?.livraisonGratuiteExclue ?? false,
        parametres,
      ),
    [prixBarre, prixPrincipal, article, parametres],
  );

  function reinitialiser() {
    setEan('');
    setArticle(null);
    setIntrouvable(false);
    setPrixBarre('');
    setPrixPrincipal('');
    setStockLimite(false);
    setNouveaute(false);
    setPromotion(false);
    champEan.current?.focus();
  }

  async function ajouter() {
    if (!campagneId || !article || !utilisateur) return;
    const N = Number(prixPrincipal.replace(',', '.'));
    if (!Number.isFinite(N) || N <= 0) {
      setErreur('Le prix principal est obligatoire et doit etre superieur a zero.');
      return;
    }

    setAjout(true);
    setErreur(null);
    try {
      await ajouterAffiche(
        campagneId,
        {
          ean: article.ean,
          prixBarre: Number(prixBarre.replace(',', '.')) || 0,
          prixPrincipal: N,
          format,
          stockLimite,
          nouveaute,
          promotion,
        },
        affiches.length,
        utilisateur.id,
      );
      reinitialiser();
      await charger();
    } catch (probleme) {
      setErreur(messageErreurCampagne(probleme));
    } finally {
      setAjout(false);
    }
  }

  async function retirer(affiche: Affiche) {
    setErreur(null);
    try {
      await supprimerAffiche(affiche.id);
      await charger();
    } catch (probleme) {
      setErreur(messageErreurCampagne(probleme));
    }
  }

  return (
    <AppShell
      titre={campagne ? campagne.nom : 'Saisie'}
      sousTitre={`${affiches.length} affiche(s) — format par defaut ${FORMATS[format].code}`}
      actions={
        <>
          <Link to="/campagnes" className="bouton bouton--discret">
            Toutes les campagnes
          </Link>
          {campagneId && affiches.length > 0 ? (
            <Link to={`/affiches/${campagneId}`} className="bouton bouton--principal">
              Apercu & impression
            </Link>
          ) : null}
        </>
      }
    >
      {erreur ? (
        <p className="bandeau bandeau--erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      <section className="carte">
        <h2 className="carte__titre">Ajouter une affiche</h2>

        <div className="ligne-ean">
          <div className="champ champ--extensible">
            <label htmlFor="ean">Code article</label>
            <input
              ref={champEan}
              id="ean"
              type="text"
              inputMode="numeric"
              placeholder="Saisir un code puis Entree"
              value={ean}
              onChange={(e) => {
                setEan(e.target.value);
                setArticle(null);
                setIntrouvable(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void chercherArticle();
              }}
              onBlur={() => {
                if (ean.trim() && !article) void chercherArticle();
              }}
            />
          </div>
          <button
            type="button"
            className="bouton bouton--discret"
            onClick={chercherArticle}
            disabled={recherche || !ean.trim()}
          >
            {recherche ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>

        {introuvable ? (
          <p className="bandeau bandeau--alerte">
            Aucun article ne porte ce code. Verifiez la saisie, ou demandez a un administrateur
            de l&apos;ajouter au catalogue.
          </p>
        ) : null}

        {article ? (
          <>
            <div className="fiche-article">
              <div className="fiche-article__entete">
                <span className="fiche-article__marque">
                  {nomsMarques.get(article.marqueId) ?? '—'}
                </span>
                <span className="fiche-article__designation">{article.designation}</span>
                {article.reference ? (
                  <span className="fiche-article__reference">{article.reference}</span>
                ) : null}
              </div>
              <div className="pastilles">
                {article.pictos
                  .filter((p) => p)
                  .map((p, i) => (
                    <span className="pastille" key={i}>
                      {p}
                    </span>
                  ))}
              </div>
            </div>

            <div className="grille-prix">
              <div className="champ">
                <label htmlFor="prixBarre">Prix barre (dh)</label>
                <input
                  id="prixBarre"
                  type="text"
                  inputMode="decimal"
                  placeholder="46999"
                  value={prixBarre}
                  onChange={(e) => setPrixBarre(e.target.value)}
                />
              </div>
              <div className="champ">
                <label htmlFor="prixPrincipal">Prix principal (dh)</label>
                <input
                  id="prixPrincipal"
                  type="text"
                  inputMode="decimal"
                  placeholder="39999"
                  value={prixPrincipal}
                  onChange={(e) => setPrixPrincipal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void ajouter();
                  }}
                />
              </div>
              <div className="champ">
                <label htmlFor="format">Format</label>
                <select
                  id="format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as FormatAffiche)}
                >
                  {FORMATS_ORDONNES.map((code) => (
                    <option key={code} value={code}>
                      {FORMATS[code].libelle}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="badges-commerciaux">
              <label className="case">
                <input
                  type="checkbox"
                  checked={stockLimite}
                  onChange={(e) => setStockLimite(e.target.checked)}
                />
                Stock limite
              </label>
              <label className="case">
                <input
                  type="checkbox"
                  checked={nouveaute}
                  onChange={(e) => setNouveaute(e.target.checked)}
                />
                Nouveaute
              </label>
              <label className="case">
                <input
                  type="checkbox"
                  checked={promotion}
                  onChange={(e) => setPromotion(e.target.checked)}
                />
                Promotion limitee
              </label>
            </div>

            <div className="apercu-regles">
              <h3 className="sous-titre">Calcule automatiquement</h3>
              <div className="regles-grille">
                <div className={`regle ${regles.afficherEconomie ? 'est-active' : ''}`}>
                  <span className="regle__libelle">Bandeau economie</span>
                  <span className="regle__valeur">
                    {regles.afficherEconomie
                      ? `${formaterMontant(regles.economie)} dh (${regles.economiePourcent.toFixed(0)} %)`
                      : `masque — remise sous ${parametres.seuilEconomiePourcent} %`}
                  </span>
                </div>
                <div className={`regle ${regles.dureeCredit ? 'est-active' : ''}`}>
                  <span className="regle__libelle">Credit sans interet</span>
                  <span className="regle__valeur">
                    {regles.dureeCredit && regles.mensualite !== null
                      ? `${formaterMontant(regles.mensualite)} dh x ${regles.dureeCredit} mois`
                      : 'non eligible'}
                  </span>
                </div>
                <div className={`regle ${regles.livraisonGratuite ? 'est-active' : ''}`}>
                  <span className="regle__libelle">Livraison gratuite</span>
                  <span className="regle__valeur">
                    {regles.livraisonGratuite
                      ? 'badge affiche'
                      : article.livraisonGratuiteExclue
                        ? 'article exclu'
                        : `sous ${parametres.seuilLivraisonGratuite} dh`}
                  </span>
                </div>
                <div className={`regle ${article.pictos.some((p) => p) ? 'est-active' : ''}`}>
                  <span className="regle__libelle">Pictogrammes</span>
                  <span className="regle__valeur">
                    {article.pictos.filter((p) => p).length} depuis la fiche article
                  </span>
                </div>
              </div>
            </div>

            {apercu ? (
              <div className="apercu-affiche">
                <h3 className="sous-titre">Apercu de l&apos;affiche A4</h3>
                <Reduction echelle={0.42} className="apercu-affiche__feuille">
                  <AfficheA4 donnees={apercu} />
                </Reduction>
              </div>
            ) : null}

            <div className="actions-formulaire">
              <button
                type="button"
                className="bouton bouton--principal"
                onClick={ajouter}
                disabled={ajout || !prixPrincipal.trim()}
              >
                {ajout ? 'Ajout…' : "Ajouter a la campagne"}
              </button>
              <button type="button" className="bouton bouton--discret" onClick={reinitialiser}>
                Effacer
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className="carte">
        <h2 className="carte__titre">Affiches de la campagne</h2>

        {affiches.length === 0 ? (
          <p className="carte__texte carte__texte--discret">
            Aucune affiche pour le moment. Saisissez un code article ci-dessus.
          </p>
        ) : (
          <table className="tableau">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Prix barre</th>
                <th scope="col">Prix</th>
                <th scope="col">Format</th>
                <th scope="col">Badges</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {affiches.map((affiche) => (
                <tr key={affiche.id}>
                  <th scope="row" className="colonne-code">
                    {affiche.ean}
                  </th>
                  <td className="colonne-prix">
                    {affiche.prixBarre > 0 ? formaterMontant(affiche.prixBarre) : '—'}
                  </td>
                  <td className="colonne-prix colonne-prix--fort">
                    {formaterMontant(affiche.prixPrincipal)}
                  </td>
                  <td>{affiche.format}</td>
                  <td>
                    <div className="pastilles">
                      {affiche.stockLimite ? <span className="pastille">Stock limite</span> : null}
                      {affiche.nouveaute ? <span className="pastille">Nouveaute</span> : null}
                      {affiche.promotion ? <span className="pastille">Promotion</span> : null}
                    </div>
                  </td>
                  <td className="colonne-actions">
                    <button
                      type="button"
                      className="bouton bouton--danger bouton--petit"
                      onClick={() => void retirer(affiche)}
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
