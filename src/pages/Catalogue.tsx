import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { listerMarques, type Marque } from '../lib/marques';
import {
  creerArticle,
  estEan13Valide,
  listerArticles,
  messageErreurArticle,
  modifierArticle,
  supprimerArticle,
  validerArticle,
  NB_PICTOS,
  type Article,
  type SaisieArticle,
} from '../lib/articles';
import { CATEGORIES, type CategorieProduit } from '../config/constants';
import './Catalogue.css';

const PAR_PAGE = 25;

const SAISIE_VIDE: SaisieArticle = {
  ean: '',
  marqueId: '',
  designation: '',
  reference: '',
  categorie: 'gem',
  pictos: Array.from({ length: NB_PICTOS }, () => ''),
  livraisonGratuiteExclue: false,
  actif: true,
};

function versSaisie(article: Article): SaisieArticle {
  return {
    ean: article.ean,
    marqueId: article.marqueId,
    designation: article.designation,
    reference: article.reference,
    categorie: article.categorie,
    pictos: [...article.pictos],
    livraisonGratuiteExclue: article.livraisonGratuiteExclue,
    actif: article.actif,
  };
}

export function Catalogue() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [chargement, setChargement] = useState(true);

  const [marques, setMarques] = useState<Marque[]>([]);
  const [recherche, setRecherche] = useState('');
  const [termeApplique, setTermeApplique] = useState('');
  const [filtreMarque, setFiltreMarque] = useState('');
  const [filtreCategorie, setFiltreCategorie] = useState<CategorieProduit | ''>('');

  const [saisie, setSaisie] = useState<SaisieArticle | null>(null);
  const [idEdite, setIdEdite] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const nomsMarques = useMemo(() => {
    const table = new Map<string, string>();
    for (const m of marques) table.set(m.id, m.nom);
    return table;
  }, [marques]);

  useEffect(() => {
    listerMarques()
      .then(setMarques)
      .catch((probleme) => setErreur(messageErreurArticle(probleme)));
  }, []);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const resultat = await listerArticles({
        recherche: termeApplique,
        marqueId: filtreMarque || undefined,
        categorie: filtreCategorie || undefined,
        page,
        parPage: PAR_PAGE,
      });
      setArticles(resultat.articles);
      setTotal(resultat.total);
    } catch (probleme) {
      setErreur(messageErreurArticle(probleme));
    } finally {
      setChargement(false);
    }
  }, [termeApplique, filtreMarque, filtreCategorie, page]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function lancerRecherche() {
    setPage(0);
    setTermeApplique(recherche);
  }

  async function enregistrer() {
    if (!saisie) return;

    const problemes = validerArticle(saisie);
    if (problemes.length > 0) {
      setErreur(problemes.join(' '));
      return;
    }

    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      if (idEdite) {
        await modifierArticle(idEdite, saisie);
        setMessage(`Article « ${saisie.designation} » modifie.`);
      } else {
        await creerArticle(saisie);
        setMessage(`Article « ${saisie.designation} » cree.`);
      }
      fermerFormulaire();
      await charger();
    } catch (probleme) {
      setErreur(messageErreurArticle(probleme));
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimer(article: Article) {
    const confirme = window.confirm(
      `Supprimer l'article « ${article.designation} » (${article.ean}) ?`,
    );
    if (!confirme) return;

    setErreur(null);
    try {
      await supprimerArticle(article.id);
      setMessage('Article supprime.');
      await charger();
    } catch (probleme) {
      setErreur(messageErreurArticle(probleme));
    }
  }

  function ouvrirCreation() {
    setIdEdite(null);
    setSaisie({ ...SAISIE_VIDE, pictos: Array.from({ length: NB_PICTOS }, () => '') });
    setErreur(null);
  }

  function ouvrirEdition(article: Article) {
    setIdEdite(article.id);
    setSaisie(versSaisie(article));
    setErreur(null);
  }

  function fermerFormulaire() {
    setSaisie(null);
    setIdEdite(null);
  }

  function majPicto(index: number, valeur: string) {
    if (!saisie) return;
    const pictos = [...saisie.pictos];
    pictos[index] = valeur;
    setSaisie({ ...saisie, pictos });
  }

  const nbPages = Math.ceil(total / PAR_PAGE);
  const eanSuspect =
    saisie !== null && saisie.ean.trim().length > 0 && !estEan13Valide(saisie.ean);

  return (
    <AppShell
      titre="Catalogue"
      sousTitre={chargement ? 'Chargement…' : `${total} article(s)`}
      actions={
        <button type="button" className="bouton bouton--principal" onClick={ouvrirCreation}>
          Nouvel article
        </button>
      }
    >
      {erreur ? (
        <p className="bandeau bandeau--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      {message ? <p className="bandeau bandeau--succes">{message}</p> : null}

      {saisie ? (
        <section className="carte carte--formulaire">
          <h2 className="carte__titre">{idEdite ? "Modifier l'article" : 'Nouvel article'}</h2>

          <div className="grille">
            <div className="champ">
              <label htmlFor="ean">Code article / EAN</label>
              <input
                id="ean"
                type="text"
                inputMode="numeric"
                value={saisie.ean}
                onChange={(e) => setSaisie({ ...saisie, ean: e.target.value })}
                disabled={enregistrement}
              />
              {eanSuspect ? (
                <p className="champ__aide champ__aide--alerte">
                  Ce code n&apos;est pas un EAN-13 valide. Il reste accepte — le catalogue
                  contient des references internes — mais aucun code-barres ne pourra etre
                  genere.
                </p>
              ) : null}
            </div>

            <div className="champ">
              <label htmlFor="marque">Marque</label>
              <select
                id="marque"
                value={saisie.marqueId}
                onChange={(e) => setSaisie({ ...saisie, marqueId: e.target.value })}
                disabled={enregistrement}
              >
                <option value="">— Choisir —</option>
                {marques.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="champ">
              <label htmlFor="designation">Designation</label>
              <input
                id="designation"
                type="text"
                placeholder="TV LED"
                value={saisie.designation}
                onChange={(e) => setSaisie({ ...saisie, designation: e.target.value })}
                disabled={enregistrement}
              />
            </div>

            <div className="champ">
              <label htmlFor="categorie">Categorie</label>
              <select
                id="categorie"
                value={saisie.categorie}
                onChange={(e) =>
                  setSaisie({ ...saisie, categorie: e.target.value as CategorieProduit })
                }
                disabled={enregistrement}
              >
                {Object.entries(CATEGORIES).map(([cle, libelle]) => (
                  <option key={cle} value={cle}>
                    {libelle}
                  </option>
                ))}
              </select>
            </div>

            <div className="champ champ--large">
              <label htmlFor="reference">Reference constructeur</label>
              <input
                id="reference"
                type="text"
                placeholder="OLED QA83S85HAEXMV SAMSUNG"
                value={saisie.reference}
                onChange={(e) => setSaisie({ ...saisie, reference: e.target.value })}
                disabled={enregistrement}
              />
            </div>
          </div>

          <h3 className="sous-titre">Pictogrammes</h3>
          <p className="carte__texte carte__texte--discret">
            Six emplacements dans l&apos;ordre d&apos;affichage sur l&apos;affiche. Leur contenu
            depend du produit : capacite et classe energetique pour un lave-linge, memoire et
            taille d&apos;ecran pour un smartphone.
          </p>
          <div className="grille grille--pictos">
            {saisie.pictos.map((valeur, index) => (
              <div className="champ" key={index}>
                <label htmlFor={`picto${index}`}>Emplacement {index + 1}</label>
                <input
                  id={`picto${index}`}
                  type="text"
                  placeholder={index === 0 ? '4KUHD' : ''}
                  value={valeur}
                  onChange={(e) => majPicto(index, e.target.value)}
                  disabled={enregistrement}
                />
              </div>
            ))}
          </div>

          <div className="options">
            <label className="case">
              <input
                type="checkbox"
                checked={saisie.actif}
                onChange={(e) => setSaisie({ ...saisie, actif: e.target.checked })}
                disabled={enregistrement}
              />
              Article actif
            </label>
            <label className="case">
              <input
                type="checkbox"
                checked={saisie.livraisonGratuiteExclue}
                onChange={(e) =>
                  setSaisie({ ...saisie, livraisonGratuiteExclue: e.target.checked })
                }
                disabled={enregistrement}
              />
              Exclu de la livraison gratuite
            </label>
          </div>

          <div className="actions-formulaire">
            <button
              type="button"
              className="bouton bouton--principal"
              onClick={enregistrer}
              disabled={enregistrement}
            >
              {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              className="bouton bouton--discret"
              onClick={fermerFormulaire}
              disabled={enregistrement}
            >
              Annuler
            </button>
          </div>
        </section>
      ) : null}

      <section className="carte">
        <div className="barre-filtres">
          <input
            type="search"
            className="recherche"
            placeholder="Code article ou designation…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') lancerRecherche();
            }}
          />
          <button type="button" className="bouton bouton--discret" onClick={lancerRecherche}>
            Rechercher
          </button>

          <select
            value={filtreMarque}
            onChange={(e) => {
              setPage(0);
              setFiltreMarque(e.target.value);
            }}
          >
            <option value="">Toutes les marques</option>
            {marques.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>

          <select
            value={filtreCategorie}
            onChange={(e) => {
              setPage(0);
              setFiltreCategorie(e.target.value as CategorieProduit | '');
            }}
          >
            <option value="">Toutes les categories</option>
            {Object.entries(CATEGORIES).map(([cle, libelle]) => (
              <option key={cle} value={cle}>
                {libelle}
              </option>
            ))}
          </select>
        </div>

        {chargement ? (
          <p className="carte__texte carte__texte--discret">Chargement du catalogue…</p>
        ) : articles.length === 0 ? (
          <p className="carte__texte carte__texte--discret">
            {total === 0 && !termeApplique
              ? "Le catalogue est vide. L'import des 2 419 articles est prevu a l'etape suivante."
              : 'Aucun article ne correspond a cette recherche.'}
          </p>
        ) : (
          <>
            <table className="tableau tableau--articles">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Designation</th>
                  <th scope="col">Marque</th>
                  <th scope="col">Pictogrammes</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className={article.actif ? undefined : 'est-inactif'}>
                    <th scope="row" className="colonne-code">
                      {article.ean}
                    </th>
                    <td>
                      {article.designation}
                      {article.reference ? (
                        <span className="reference">{article.reference}</span>
                      ) : null}
                    </td>
                    <td>{nomsMarques.get(article.marqueId) ?? '—'}</td>
                    <td>
                      <div className="pastilles">
                        {article.pictos
                          .filter((p) => p.length > 0)
                          .map((p, i) => (
                            <span className="pastille" key={i}>
                              {p}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="colonne-actions">
                      <button
                        type="button"
                        className="bouton bouton--discret bouton--petit"
                        onClick={() => ouvrirEdition(article)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="bouton bouton--danger bouton--petit"
                        onClick={() => void supprimer(article)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {nbPages > 1 ? (
              <div className="pagination">
                <button
                  type="button"
                  className="bouton bouton--discret bouton--petit"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Precedent
                </button>
                <span className="pagination__position">
                  Page {page + 1} sur {nbPages}
                </span>
                <button
                  type="button"
                  className="bouton bouton--discret bouton--petit"
                  onClick={() => setPage((p) => Math.min(nbPages - 1, p + 1))}
                  disabled={page >= nbPages - 1}
                >
                  Suivant
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </AppShell>
  );
}
