/**
 * AFFICHES-EM v1.0 — Contexte d'authentification
 *
 * Expose l'utilisateur connecte a toute l'application et centralise les
 * actions de session. Au premier rendu, l'etat est « en cours de
 * verification » : distinguer cet etat de « non connecte » evite de faire
 * clignoter l'ecran de connexion pour un utilisateur dont la session est
 * valide mais pas encore lue.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { seConnecter, seDeconnecter, utilisateurCourant, type Utilisateur } from '../lib/auth';
import { estConfigure } from '../lib/appwrite';

interface ContexteAuth {
  readonly utilisateur: Utilisateur | null;
  readonly enCoursDeVerification: boolean;
  readonly connexion: (email: string, motDePasse: string) => Promise<void>;
  readonly deconnexion: () => Promise<void>;
}

const Contexte = createContext<ContexteAuth | null>(null);

export function FournisseurAuth({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [enCoursDeVerification, setEnCoursDeVerification] = useState(true);

  useEffect(() => {
    let actif = true;

    if (!estConfigure) {
      setEnCoursDeVerification(false);
      return;
    }

    utilisateurCourant()
      .then((resultat) => {
        if (actif) setUtilisateur(resultat);
      })
      .finally(() => {
        if (actif) setEnCoursDeVerification(false);
      });

    // Evite de mettre a jour l'etat si le composant a ete demonte entre-temps.
    return () => {
      actif = false;
    };
  }, []);

  const connexion = useCallback(async (email: string, motDePasse: string) => {
    const resultat = await seConnecter(email, motDePasse);
    setUtilisateur(resultat);
  }, []);

  const deconnexion = useCallback(async () => {
    await seDeconnecter();
    setUtilisateur(null);
  }, []);

  const valeur = useMemo(
    () => ({ utilisateur, enCoursDeVerification, connexion, deconnexion }),
    [utilisateur, enCoursDeVerification, connexion, deconnexion],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useAuth(): ContexteAuth {
  const contexte = useContext(Contexte);
  if (!contexte) {
    throw new Error("useAuth doit etre utilise a l'interieur de <FournisseurAuth>.");
  }
  return contexte;
}
