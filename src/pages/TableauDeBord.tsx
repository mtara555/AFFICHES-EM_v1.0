import { AppShell } from '../components/AppShell';
import { estConfigure } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import { LIBELLE_ROLE } from '../lib/auth';
import { APP_FULL_NAME, FORMATS, FORMATS_ORDONNES } from '../config/constants';
import './TableauDeBord.css';

interface Etape {
  readonly code: string;
  readonly libelle: string;
  readonly etat: 'fait' | 'en-cours' | 'a-venir';
}

const ETAPES: readonly Etape[] = [
  { code: '0.1', libelle: 'Structure du depot et coquille PWA', etat: 'fait' },
  { code: '0.2', libelle: 'Deploiement automatique sur GitHub Pages', etat: 'fait' },
  { code: '0.3', libelle: 'Creation du projet Appwrite', etat: 'fait' },
  { code: '0.4', libelle: 'Tables, compartiment et permissions', etat: 'fait' },
  { code: '0.5', libelle: 'Connexion utilisateur et roles', etat: 'fait' },
  { code: '1.0', libelle: 'Catalogue produits et marques', etat: 'en-cours' },
];

const LIBELLE_ETAT: Record<Etape['etat'], string> = {
  fait: 'Termine',
  'en-cours': 'En cours',
  'a-venir': 'A venir',
};

export function TableauDeBord() {
  const { utilisateur } = useAuth();

  return (
    <AppShell
      titre="Tableau de bord"
      sousTitre={`${APP_FULL_NAME} — phase 0 terminee`}
    >
      {utilisateur ? (
        <section className="carte carte--session">
          <h2 className="carte__titre">Session</h2>
          <p className="carte__texte">
            Connecte en tant que <strong>{utilisateur.nom}</strong> ({utilisateur.email}),
            avec le role <strong>{LIBELLE_ROLE[utilisateur.role]}</strong>.
          </p>
          <p className="carte__texte carte__texte--discret">
            Ce role decoule de votre appartenance aux equipes Appwrite. Il determine aussi ce que
            le serveur autorise, et pas seulement ce que l&apos;interface affiche.
          </p>
        </section>
      ) : null}

      <section className="carte carte--statut">
        <h2 className="carte__titre">Etat de l'installation</h2>
        <ol className="etapes">
          {ETAPES.map((etape) => (
            <li key={etape.code} className={`etape etape--${etape.etat}`}>
              <span className="etape__code">{etape.code}</span>
              <span className="etape__libelle">{etape.libelle}</span>
              <span className="etape__etat">{LIBELLE_ETAT[etape.etat]}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`carte carte--verification ${estConfigure ? 'est-ok' : 'est-attente'}`}>
        <h2 className="carte__titre">Connexion a Appwrite</h2>
        {estConfigure ? (
          <p className="carte__texte">
            Les parametres de connexion sont renseignes. Les collections seront creees a
            l&apos;etape 0.4.
          </p>
        ) : (
          <>
            <p className="carte__texte">
              Aucun projet Appwrite n&apos;est encore relie. C&apos;est normal a ce stade :
              l&apos;etape 0.3 consiste precisement a le creer.
            </p>
            <p className="carte__texte carte__texte--discret">
              Les valeurs attendues sont <code>VITE_APPWRITE_ENDPOINT</code> et{' '}
              <code>VITE_APPWRITE_PROJECT_ID</code>, a placer dans un fichier{' '}
              <code>.env.local</code> a la racine du projet.
            </p>
          </>
        )}
      </section>

      <section className="carte">
        <h2 className="carte__titre">Formats prevus</h2>
        <table className="tableau">
          <thead>
            <tr>
              <th scope="col">Format</th>
              <th scope="col">Dimensions</th>
              <th scope="col">Par planche A4</th>
            </tr>
          </thead>
          <tbody>
            {FORMATS_ORDONNES.map((code) => {
              const format = FORMATS[code];
              return (
                <tr key={code}>
                  <th scope="row">{format.code}</th>
                  <td>
                    {format.largeurMm} × {format.hauteurMm} mm
                  </td>
                  <td>{format.parPlancheA4}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
