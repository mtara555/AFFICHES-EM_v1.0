import { useEffect, useState, type ReactNode } from 'react';
import { chargerMedia } from '../../lib/medias';

interface VisuelProps {
  /** Identifiant du fichier dans le compartiment « medias ». */
  readonly fileId: string | null;
  readonly alt: string;
  readonly className?: string;
  /** Rendu utilise tant que le fichier n'est pas disponible, ou s'il n'existe pas. */
  readonly secours: ReactNode;
}

/**
 * Image issue d'Appwrite, avec rendu de secours.
 *
 * Une affiche ne doit jamais sortir avec un cadre d'image cassee : si le logo
 * ou le pictogramme n'a pas encore ete televerse, un equivalent typographique
 * prend sa place.
 */
export function Visuel({ fileId, alt, className, secours }: VisuelProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    let actif = true;
    setUrl(null);
    setEchec(false);
    if (!fileId) {
      setEchec(true);
      return;
    }
    void chargerMedia(fileId).then((resultat) => {
      if (!actif) return;
      if (resultat) setUrl(resultat);
      else setEchec(true);
    });
    return () => {
      actif = false;
    };
  }, [fileId]);

  if (url && !echec) {
    return <img className={className} src={url} alt={alt} onError={() => setEchec(true)} />;
  }
  return <>{secours}</>;
}
