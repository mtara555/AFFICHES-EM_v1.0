/**
 * AFFICHES-EM v1.0 — Service d'authentification
 *
 * Le role d'un utilisateur n'est pas stocke dans un champ applicatif : il
 * decoule de son appartenance aux equipes Appwrite. C'est ce qui rend le
 * modele fiable — les memes equipes servent a la fois a determiner ce que
 * l'interface affiche et a autoriser chaque requete cote serveur. Un
 * utilisateur ne peut donc pas s'attribuer un role en manipulant le code.
 */

import { AppwriteException, type Models } from 'appwrite';
import { account, teams, EQUIPES } from './appwrite';

export type Role = 'administrateur' | 'operateur' | 'aucun';

export interface Utilisateur {
  readonly id: string;
  readonly nom: string;
  readonly email: string;
  readonly role: Role;
}

/**
 * Determine le role a partir des equipes auxquelles le compte appartient.
 * Un administrateur dispose aussi de tous les droits d'un operateur, d'ou la
 * priorite donnee a ce role lorsque les deux appartenances existent.
 */
async function resolverRole(): Promise<Role> {
  const liste = await teams.list();
  const identifiants = liste.teams.map((equipe) => equipe.$id);

  if (identifiants.includes(EQUIPES.ADMINISTRATEURS)) return 'administrateur';
  if (identifiants.includes(EQUIPES.OPERATEURS)) return 'operateur';
  return 'aucun';
}

function versUtilisateur(compte: Models.User<Models.Preferences>, role: Role): Utilisateur {
  return {
    id: compte.$id,
    nom: compte.name || compte.email,
    email: compte.email,
    role,
  };
}

/**
 * Recupere l'utilisateur de la session en cours.
 * Renvoie null si personne n'est connecte — ce n'est pas une erreur, c'est
 * l'etat normal au premier chargement.
 */
export async function utilisateurCourant(): Promise<Utilisateur | null> {
  try {
    const compte = await account.get();
    const role = await resolverRole();
    return versUtilisateur(compte, role);
  } catch {
    return null;
  }
}

/** Ouvre une session. Leve une erreur porteuse d'un message lisible en cas d'echec. */
export async function seConnecter(email: string, motDePasse: string): Promise<Utilisateur> {
  try {
    await account.createEmailPasswordSession({ email, password: motDePasse });
  } catch (erreur) {
    throw new Error(messageErreurConnexion(erreur));
  }

  const compte = await account.get();
  const role = await resolverRole();
  return versUtilisateur(compte, role);
}

/** Ferme la session en cours. */
export async function seDeconnecter(): Promise<void> {
  try {
    await account.deleteSession({ sessionId: 'current' });
  } catch {
    // Session deja expiree cote serveur : l'objectif est atteint.
  }
}

/**
 * Traduit les erreurs Appwrite en messages exploitables par l'utilisateur.
 * Les identifiants invalides recoivent volontairement un message unique, qui
 * ne revele pas si l'adresse existe.
 */
function messageErreurConnexion(erreur: unknown): string {
  if (!(erreur instanceof AppwriteException)) {
    return 'Connexion au serveur impossible. Verifiez votre reseau.';
  }

  switch (erreur.type) {
    case 'user_invalid_credentials':
      return 'Adresse e-mail ou mot de passe incorrect.';
    case 'user_blocked':
      return 'Ce compte est bloque. Contactez un administrateur.';
    case 'general_rate_limit_exceeded':
      return 'Trop de tentatives. Patientez quelques minutes avant de reessayer.';
    case 'user_session_already_exists':
      return 'Une session est deja ouverte. Rechargez la page.';
    default:
      return erreur.message || 'La connexion a echoue.';
  }
}

/** Libelle affichable d'un role. */
export const LIBELLE_ROLE: Readonly<Record<Role, string>> = {
  administrateur: 'Administrateur',
  operateur: 'Operateur',
  aucun: 'Aucun acces',
};
