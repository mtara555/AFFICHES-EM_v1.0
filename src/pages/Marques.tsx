import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import {
  creerMarque,
  importerMarques,
  listerMarques,
  messageErreur,
  modifierMarque,
  supprimerMarque,
  type Marque,
} from '../lib/marques';
import { MARQUES_CATALOGUE } from '../config/marques-catalogue';
import './Marques.css';

type Edition = { readonly id: string | null; nom: string; actif: boolean };

const EDITION_VIDE: Edition = { id: null, nom: '', actif: true };

export function Marques() {
  const [marques, setMarques] = useState<Marque[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [edition, setEdition] = useState<Edition>(EDITION_VIDE);
  const [enregistrement, setEnregistrement] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [importEnCours, setImportEnCours] = useState<{ traites: number; total: number } | null>(
    null,
  );

  const recharger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setMarques(await listerMarques());
    } catch (probleme) {
      setErreur(messageErreur(probleme));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  const filtrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return marques;
    return marques.filter((m) => m.nom.toLowerCase().includes(terme));
  }, [marques, recherche]);

  const manquantes = useMemo(() => {
    const existantes = new Set(marques.map((m) => m.nom.toUpperCase()));
    return MARQUES_CATALOGUE.filter((nom) => !existantes.has(nom.toUpperCase()));
  }, [marques]);

  async function enregistrer() {
    const nom = edition.nom.trim();
    if (!nom) return;

    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      if (edition.id) {
        await modifierMarque(edition.id, { nom, actif: edition.actif });
        setMessage(`Marque « ${nom} » modifiee.`);
      } else {
        await creerMarque({ nom, actif: edition.actif });
        setMessage(`Marque « ${nom} » creee.`);
      }
      setEdition(EDITION_VIDE);
      await recharger();
    } catch (probleme) {
      setErreur(messageErreur(probleme));
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimer(marque: Marque) {
    const confirme = window.confirm(
      `Supprimer la marque « ${marque.nom} » ?\n\n` +
        'Les articles qui y sont rattaches perdront leur reference de marque.',
    );
    if (!confirme) return;

    setErreur(null);
    setMessage(null);
    try {
      await supprimerMarque(marque.id);
      setMessage(`Marque « ${marque.nom} » supprimee.`);
      if (edition.id === marque.id) setEdition(EDITION_VIDE);
      await recharger();
    } catch (probleme) {
      setErreur(messageErreur(probleme));
    }
  }

  async function importerCatalogue() {
    const confirme = window.confirm(
      `Creer les ${manquantes.length} marques absentes du catalogue existant ?\n\n` +
        'Les marques deja presentes seront ignorees.',
    );
    if (!confirme) return;

    setErreur(null);
    setMessage(null);
    setImportEnCours({ traites: 0, total: manquantes.length });
    try {
      const resultat = await importerMarques(manquantes, (traites, total) =>
        setImportEnCours({ traites, total }),
      );
      const details = [
        `${resultat.crees} creee(s)`,
        resultat.ignores > 0 ? `${resultat.ignores} deja presente(s)` : null,
        resultat.erreurs.length > 0 ? `${resultat.erreurs.length} en echec` : null,
      ].filter(Boolean);
      setMessage(`Import termine : ${details.join(', ')}.`);
      if (resultat.erreurs.length > 0) {
        setErreur(
          `Echecs : ${resultat.erreurs
            .slice(0, 3)
            .map((e) => e.nom)
            .join(', ')}${resultat.erreurs.length > 3 ? '…' : ''}`,
        );
      }
      await recharger();
    } catch (probleme) {
      setErreur(messageErreur(probleme));
    } finally {
      setImportEnCours(null);
    }
  }

  const actives = marques.filter((m) => m.actif).length;

  return (
    <AppShell
      titre="Marques"
      sousTitre={
        chargement
          ? 'Chargement…'
          : `${marques.length} marque(s) — ${actives} active(s) — ${
              marques.filter((m) => m.logoFileId).length
            } avec logo`
      }
    >
      {erreur ? (
        <p className="bandeau bandeau--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      {message ? <p className="bandeau bandeau--succes">{message}</p> : null}

      {manquantes.length > 0 && !chargement ? (
        <section className="carte carte--import">
          <h2 className="carte__titre">Import du catalogue existant</h2>
          <p className="carte__texte">
            {manquantes.length} marque(s) du fichier <code>BD-EM-1108.xlsx</code> ne sont pas
            encore enregistrees. Les logos pourront etre ajoutes ensuite, marque par marque.
          </p>
          {importEnCours ? (
            <div className="progression">
              <div
                className="progression__barre"
                style={{ width: `${(importEnCours.traites / importEnCours.total) * 100}%` }}
              />
              <span className="progression__texte">
                {importEnCours.traites} / {importEnCours.total}
              </span>
            </div>
          ) : (
            <button type="button" className="bouton bouton--principal" onClick={importerCatalogue}>
              Importer {manquantes.length} marque(s)
            </button>
          )}
        </section>
      ) : null}

      <section className="carte">
        <h2 className="carte__titre">{edition.id ? 'Modifier la marque' : 'Nouvelle marque'}</h2>
        <div className="formulaire-ligne">
          <div className="champ champ--extensible">
            <label htmlFor="nomMarque">Nom</label>
            <input
              id="nomMarque"
              type="text"
              value={edition.nom}
              placeholder="SAMSUNG"
              onChange={(e) => setEdition({ ...edition, nom: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void enregistrer();
                if (e.key === 'Escape') setEdition(EDITION_VIDE);
              }}
              disabled={enregistrement}
            />
          </div>

          <label className="case">
            <input
              type="checkbox"
              checked={edition.actif}
              onChange={(e) => setEdition({ ...edition, actif: e.target.checked })}
              disabled={enregistrement}
            />
            Active
          </label>

          <button
            type="button"
            className="bouton bouton--principal"
            onClick={enregistrer}
            disabled={enregistrement || !edition.nom.trim()}
          >
            {edition.id ? 'Enregistrer' : 'Ajouter'}
          </button>

          {edition.id ? (
            <button
              type="button"
              className="bouton bouton--discret"
              onClick={() => setEdition(EDITION_VIDE)}
              disabled={enregistrement}
            >
              Annuler
            </button>
          ) : null}
        </div>
      </section>

      <section className="carte">
        <div className="carte__entete">
          <h2 className="carte__titre">Liste des marques</h2>
          <input
            type="search"
            className="recherche"
            placeholder="Rechercher…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>

        {chargement ? (
          <p className="carte__texte carte__texte--discret">Chargement des marques…</p>
        ) : filtrees.length === 0 ? (
          <p className="carte__texte carte__texte--discret">
            {marques.length === 0
              ? 'Aucune marque enregistree pour le moment.'
              : 'Aucune marque ne correspond a cette recherche.'}
          </p>
        ) : (
          <table className="tableau tableau--marques">
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Logo</th>
                <th scope="col">Statut</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtrees.map((marque) => (
                <tr key={marque.id} className={edition.id === marque.id ? 'est-editee' : undefined}>
                  <th scope="row">{marque.nom}</th>
                  <td>
                    {marque.logoFileId ? (
                      <span className="etiquette etiquette--ok">Present</span>
                    ) : (
                      <span className="etiquette">A fournir</span>
                    )}
                  </td>
                  <td>
                    {marque.actif ? (
                      <span className="etiquette etiquette--ok">Active</span>
                    ) : (
                      <span className="etiquette etiquette--inactive">Inactive</span>
                    )}
                  </td>
                  <td className="colonne-actions">
                    <button
                      type="button"
                      className="bouton bouton--discret bouton--petit"
                      onClick={() =>
                        setEdition({ id: marque.id, nom: marque.nom, actif: marque.actif })
                      }
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="bouton bouton--danger bouton--petit"
                      onClick={() => void supprimer(marque)}
                    >
                      Supprimer
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
