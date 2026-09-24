import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Affiche, type DonneesAffiche } from '../components/Affiche';
import { listerAffiches, messageErreurCampagne, obtenirCampagne, type Campagne } from '../lib/campagnes';
import { listerArticles, type Article } from '../lib/articles';
import { listerMarques } from '../lib/marques';
import { chargerParametres, PARAMETRES_DEFAUT, type ParametresRegles } from '../lib/regles';
import {
  ECHELLE_IMPRESSION,
  exporterLot,
  exporterUnePage,
  nomFichierSur,
  type ElementAExporter,
} from '../lib/export-pdf';
import { FORMATS } from '../config/constants';
import './Apercu.css';

/** Echelle d'affichage a l'ecran : lisible sans saturer la page. */
const ECHELLE_ECRAN = 1.1;

export function Apercu() {
  const { campagneId } = useParams<{ campagneId: string }>();

  const [campagne, setCampagne] = useState<Campagne | null>(null);
  const [donnees, setDonnees] = useState<DonneesAffiche[]>([]);
  const [parametres, setParametres] = useState<ParametresRegles>(PARAMETRES_DEFAUT);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [export_, setExport] = useState<{ traites: number; total: number } | null>(null);

  // Conteneur hors-ecran ou les affiches sont rendues a l'echelle d'impression.
  const zoneImpression = useRef<HTMLDivElement>(null);

  const charger = useCallback(async () => {
    if (!campagneId) return;
    setChargement(true);
    setErreur(null);
    try {
      const [c, affiches, marques, p] = await Promise.all([
        obtenirCampagne(campagneId),
        listerAffiches(campagneId),
        listerMarques(),
        chargerParametres(),
      ]);

      const nomsMarques = new Map(marques.map((m) => [m.id, m.nom]));

      // Les articles sont recuperes par lots : une requete par affiche serait
      // inutilement bavarde sur une campagne de plusieurs dizaines de lignes.
      const articles = new Map<string, Article>();
      const page = await listerArticles({ parPage: 100 });
      for (const article of page.articles) articles.set(article.ean, article);

      const manquants = affiches.filter((a) => !articles.has(a.ean));
      for (const affiche of manquants) {
        const resultat = await listerArticles({ recherche: affiche.ean, parPage: 1 });
        const trouve = resultat.articles[0];
        if (trouve) articles.set(trouve.ean, trouve);
      }

      setCampagne(c);
      setParametres(p);
      setDonnees(
        affiches.map((affiche) => {
          const article = articles.get(affiche.ean);
          return {
            ean: affiche.ean,
            marque: article ? (nomsMarques.get(article.marqueId) ?? '') : '',
            designation: article?.designation ?? 'Article introuvable',
            reference: article?.reference ?? '',
            pictos: article?.pictos ?? [],
            prixBarre: affiche.prixBarre,
            prixPrincipal: affiche.prixPrincipal,
            format: affiche.format,
            stockLimite: affiche.stockLimite,
            nouveaute: affiche.nouveaute,
            promotion: affiche.promotion,
            livraisonGratuiteExclue: article?.livraisonGratuiteExclue ?? false,
          };
        }),
      );
    } catch (probleme) {
      setErreur(messageErreurCampagne(probleme));
    } finally {
      setChargement(false);
    }
  }, [campagneId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const repartition = useMemo(() => {
    const table = new Map<string, number>();
    for (const d of donnees) table.set(d.format, (table.get(d.format) ?? 0) + 1);
    return [...table.entries()];
  }, [donnees]);

  function elementsImpression(): ElementAExporter[] {
    const zone = zoneImpression.current;
    if (!zone) return [];
    const noeuds = Array.from(zone.querySelectorAll<HTMLElement>('[data-affiche]'));
    return noeuds.map((element, i) => ({
      element,
      format: donnees[i]?.format ?? 'A4',
      nom: donnees[i]?.ean ?? String(i),
    }));
  }

  async function exporterTout() {
    if (donnees.length === 0) return;
    setErreur(null);
    setExport({ traites: 0, total: donnees.length });
    try {
      await exporterLot(
        elementsImpression(),
        nomFichierSur(campagne?.nom ?? 'campagne'),
        (traites, total) => setExport({ traites, total }),
      );
    } catch (probleme) {
      setErreur(
        probleme instanceof Error ? `Export impossible : ${probleme.message}` : 'Export impossible.',
      );
    } finally {
      setExport(null);
    }
  }

  async function exporterUne(index: number) {
    const elements = elementsImpression();
    const item = elements[index];
    const info = donnees[index];
    if (!item || !info) return;

    setErreur(null);
    setExport({ traites: 0, total: 1 });
    try {
      await exporterUnePage(item.element, info.format, nomFichierSur(`${info.ean}-${info.designation}`));
    } catch (probleme) {
      setErreur(
        probleme instanceof Error ? `Export impossible : ${probleme.message}` : 'Export impossible.',
      );
    } finally {
      setExport(null);
    }
  }

  return (
    <AppShell
      titre={campagne ? `Apercu — ${campagne.nom}` : 'Apercu'}
      sousTitre={
        chargement
          ? 'Chargement…'
          : `${donnees.length} affiche(s) · ${repartition.map(([f, n]) => `${n} ${f}`).join(', ')}`
      }
      actions={
        <>
          <Link to={`/saisie/${campagneId}`} className="bouton bouton--discret">
            Retour a la saisie
          </Link>
          <button
            type="button"
            className="bouton bouton--principal"
            onClick={exporterTout}
            disabled={export_ !== null || donnees.length === 0}
          >
            {export_ ? `Export ${export_.traites}/${export_.total}…` : 'Exporter en PDF'}
          </button>
        </>
      }
    >
      {erreur ? (
        <p className="bandeau bandeau--erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {!chargement && donnees.length === 0 ? (
        <section className="carte">
          <p className="carte__texte carte__texte--discret">
            Cette campagne ne contient aucune affiche. Ajoutez-en depuis l&apos;ecran de saisie.
          </p>
        </section>
      ) : null}

      {donnees.some((d) => d.format === 'A6') ? (
        <p className="bandeau bandeau--info">
          Les affiches A6 seront imposees quatre par planche A4 dans le PDF, conformement au kit
          papier.
        </p>
      ) : null}

      <div className="planches">
        {donnees.map((d, i) => (
          <figure className="planche" key={`${d.ean}-${i}`}>
            <div className="planche__scene">
              <Affiche donnees={d} parametres={parametres} echelle={ECHELLE_ECRAN} />
            </div>
            <figcaption className="planche__pied">
              <span className="planche__format">{FORMATS[d.format].code}</span>
              <span className="planche__code">{d.ean}</span>
              <button
                type="button"
                className="bouton bouton--discret bouton--petit"
                onClick={() => void exporterUne(i)}
                disabled={export_ !== null}
              >
                PDF
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      {/*
        Rendu hors-ecran a l'echelle d'impression. Place hors du flux plutot que
        masque : un element en display:none n'est pas mesurable, et html2canvas
        produirait une capture vide.
      */}
      <div className="zone-impression" ref={zoneImpression} aria-hidden="true">
        {donnees.map((d, i) => (
          <div data-affiche key={`impression-${d.ean}-${i}`}>
            <Affiche donnees={d} parametres={parametres} echelle={ECHELLE_IMPRESSION} />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
