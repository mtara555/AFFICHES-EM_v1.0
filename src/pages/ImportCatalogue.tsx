import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { listerMarques, type Marque } from '../lib/marques';
import { creerArticle, messageErreurArticle } from '../lib/articles';
import { analyser, lireClasseur, type Analyse } from '../lib/import-catalogue';
import { CATEGORIES, type CategorieProduit } from '../config/constants';
import './ImportCatalogue.css';

type Progression = { traites: number; total: number; crees: number; ignores: number };

export function ImportCatalogue() {
  const [marques, setMarques] = useState<Marque[]>([]);
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [nomFichier, setNomFichier] = useState('');
  const [categorieDefaut, setCategorieDefaut] = useState<CategorieProduit>('gem');
  const [limite, setLimite] = useState<number | null>(50);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [erreurs, setErreurs] = useState<{ ligne: number; message: string }[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [termine, setTermine] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listerMarques()
      .then(setMarques)
      .catch((probleme) => setErreur(messageErreurArticle(probleme)));
  }, []);

  const analyserFichier = useCallback(
    async (fichier: File) => {
      setErreur(null);
      setTermine(false);
      setErreurs([]);
      setNomFichier(fichier.name);
      try {
        const donnees = await fichier.arrayBuffer();
        const lignes = lireClasseur(donnees);
        const table = new Map(marques.map((m) => [m.nom.toUpperCase(), m.id]));
        setAnalyse(analyser(lignes, table, categorieDefaut));
      } catch (probleme) {
        setErreur(
          probleme instanceof Error
            ? `Lecture impossible : ${probleme.message}`
            : 'Fichier illisible.',
        );
        setAnalyse(null);
      }
    },
    [marques, categorieDefaut],
  );

  async function lancerImport() {
    if (!analyse) return;

    const aTraiter = limite === null ? analyse.pretes : analyse.pretes.slice(0, limite);
    const confirme = window.confirm(
      `Importer ${aTraiter.length} article(s) dans le catalogue ?\n\n` +
        'Les articles dont le code existe deja seront ignores.',
    );
    if (!confirme) return;

    setErreur(null);
    setErreurs([]);
    setTermine(false);

    let crees = 0;
    let ignores = 0;
    const echecs: { ligne: number; message: string }[] = [];

    for (const [index, ligne] of aTraiter.entries()) {
      try {
        await creerArticle(ligne.saisie);
        crees += 1;
      } catch (probleme) {
        const message = messageErreurArticle(probleme);
        // Un code deja present n'est pas un echec : l'import reste relançable.
        if (message.includes('deja ce code')) ignores += 1;
        else echecs.push({ ligne: ligne.numero, message });
      }
      setProgression({ traites: index + 1, total: aTraiter.length, crees, ignores });
    }

    setErreurs(echecs);
    setProgression(null);
    setTermine(true);
  }

  const nbAImporter = analyse
    ? limite === null
      ? analyse.pretes.length
      : Math.min(limite, analyse.pretes.length)
    : 0;

  return (
    <AppShell titre="Import du catalogue" sousTitre="Fichier Excel ou CSV — analyse avant ecriture">
      {erreur ? (
        <p className="bandeau bandeau--erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      <section className="carte">
        <h2 className="carte__titre">1. Choisir le fichier</h2>
        <p className="carte__texte">
          Le fichier doit reprendre la structure de <code>BASE_DONNEES_EM</code> : code en
          colonne A, marque en B, designation en C, reference en D, puis six emplacements de
          pictogrammes de E a J. Les en-tetes sont ignores, seule la position compte.
        </p>

        <div className="depot" onClick={() => champFichier.current?.click()}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          <span>{nomFichier || 'Cliquer pour choisir un fichier .xlsx ou .csv'}</span>
        </div>
        <input
          ref={champFichier}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="visually-hidden"
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            if (fichier) void analyserFichier(fichier);
            e.target.value = '';
          }}
        />
      </section>

      {analyse ? (
        <>
          <section className="carte">
            <h2 className="carte__titre">2. Rapport d&apos;analyse</h2>

            <div className="chiffres">
              <div className="chiffre">
                <span className="chiffre__valeur">{analyse.total}</span>
                <span className="chiffre__libelle">lignes lues</span>
              </div>
              <div className="chiffre chiffre--ok">
                <span className="chiffre__valeur">{analyse.pretes.length}</span>
                <span className="chiffre__libelle">pretes a importer</span>
              </div>
              <div className="chiffre">
                <span className="chiffre__valeur">{analyse.doublons.length}</span>
                <span className="chiffre__libelle">doublons resolus</span>
              </div>
              <div className="chiffre">
                <span className="chiffre__valeur">{analyse.marquesInconnues.length}</span>
                <span className="chiffre__libelle">marques inconnues</span>
              </div>
            </div>

            {analyse.doublons.length > 0 ? (
              <details className="detail">
                <summary>
                  {analyse.doublons.length} code(s) en double — la ligne la plus complete a ete
                  retenue
                </summary>
                <ul className="liste-detail">
                  {analyse.doublons.slice(0, 20).map((d) => (
                    <li key={d.code}>
                      <code>{d.code}</code> — ligne {d.retenue} retenue, ligne(s){' '}
                      {d.ecartees.join(', ')} ecartee(s)
                    </li>
                  ))}
                  {analyse.doublons.length > 20 ? (
                    <li className="liste-detail__reste">
                      … et {analyse.doublons.length - 20} autre(s)
                    </li>
                  ) : null}
                </ul>
              </details>
            ) : null}

            {analyse.formesUnifiees.length > 0 ? (
              <details className="detail">
                <summary>
                  {analyse.formesUnifiees.length} libelle(s) unifie(s) — variantes d&apos;ecriture
                  rapprochees
                </summary>
                <p className="detail__note">
                  La forme accentuee est retenue : c&apos;est elle qui sera imprimee sur les
                  affiches.
                </p>
                <ul className="liste-detail">
                  {analyse.formesUnifiees.map((f) => (
                    <li key={f.canonique}>
                      <strong>{f.canonique}</strong> ← {f.variantes.join(', ')}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {analyse.marquesInconnues.length > 0 ? (
              <details className="detail detail--alerte">
                <summary>
                  {analyse.marquesInconnues.reduce((n, m) => n + m.lignes, 0)} article(s) ecarte(s)
                  — marque absente du referentiel
                </summary>
                <p className="detail__note">
                  Creez ces marques depuis l&apos;ecran Marques, puis relancez l&apos;import.
                </p>
                <ul className="liste-detail">
                  {analyse.marquesInconnues.map((m) => (
                    <li key={m.nom}>
                      <strong>{m.nom}</strong> — {m.lignes} article(s)
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {analyse.sansDesignation.length > 0 ? (
              <details className="detail detail--alerte">
                <summary>
                  {analyse.sansDesignation.length} ligne(s) ecartee(s) — designation manquante
                </summary>
                <p className="detail__note">
                  Lignes {analyse.sansDesignation.join(', ')} du fichier.
                </p>
              </details>
            ) : null}

            {analyse.nonClassees > 0 ? (
              <details className="detail">
                <summary>
                  {analyse.nonClassees} article(s) sans categorie deduite
                </summary>
                <p className="detail__note">
                  La categorie est deduite de la designation. Faute de correspondance, ces
                  articles recevront la categorie par defaut choisie ci-dessous et pourront etre
                  corriges depuis le catalogue.
                </p>
              </details>
            ) : null}
          </section>

          <section className="carte">
            <h2 className="carte__titre">3. Lancer l&apos;import</h2>

            <div className="options-import">
              <div className="champ">
                <label htmlFor="categorieDefaut">Categorie par defaut</label>
                <select
                  id="categorieDefaut"
                  value={categorieDefaut}
                  onChange={(e) => setCategorieDefaut(e.target.value as CategorieProduit)}
                  disabled={progression !== null}
                >
                  {Object.entries(CATEGORIES).map(([cle, libelle]) => (
                    <option key={cle} value={cle}>
                      {libelle}
                    </option>
                  ))}
                </select>
                <p className="champ__aide">
                  Utilisee uniquement pour les articles dont la categorie n&apos;a pas pu etre
                  deduite.
                </p>
              </div>

              <div className="champ">
                <label htmlFor="limite">Etendue</label>
                <select
                  id="limite"
                  value={limite === null ? 'tout' : String(limite)}
                  onChange={(e) =>
                    setLimite(e.target.value === 'tout' ? null : Number(e.target.value))
                  }
                  disabled={progression !== null}
                >
                  <option value="50">Echantillon de 50 articles</option>
                  <option value="200">200 articles</option>
                  <option value="tout">Tout le fichier ({analyse.pretes.length})</option>
                </select>
                <p className="champ__aide">
                  L&apos;import est relançable : les codes deja presents sont ignores, pas
                  dupliques.
                </p>
              </div>
            </div>

            {progression ? (
              <div className="progression">
                <div
                  className="progression__barre"
                  style={{ width: `${(progression.traites / progression.total) * 100}%` }}
                />
                <span className="progression__texte">
                  {progression.traites} / {progression.total} — {progression.crees} cree(s)
                  {progression.ignores > 0 ? `, ${progression.ignores} ignore(s)` : ''}
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="bouton bouton--principal"
                onClick={lancerImport}
                disabled={nbAImporter === 0}
              >
                Importer {nbAImporter} article(s)
              </button>
            )}

            {termine ? (
              <p className="bandeau bandeau--succes" style={{ marginTop: 'var(--space-4)' }}>
                Import termine.
                {erreurs.length > 0 ? ` ${erreurs.length} ligne(s) en echec.` : ''}
              </p>
            ) : null}

            {erreurs.length > 0 ? (
              <details className="detail detail--alerte">
                <summary>{erreurs.length} echec(s)</summary>
                <ul className="liste-detail">
                  {erreurs.slice(0, 20).map((e, i) => (
                    <li key={i}>
                      Ligne {e.ligne} — {e.message}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
