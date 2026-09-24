import { Routes, Route, Navigate } from 'react-router-dom';
import { FournisseurAuth } from './context/AuthContext';
import { RouteProtegee } from './components/RouteProtegee';
import { Connexion } from './pages/Connexion';
import { TableauDeBord } from './pages/TableauDeBord';
import { Marques } from './pages/Marques';
import { Catalogue } from './pages/Catalogue';
import { ImportCatalogue } from './pages/ImportCatalogue';
import { Campagnes } from './pages/Campagnes';
import { Saisie } from './pages/Saisie';
import { Apercu } from './pages/Apercu';

export function App() {
  return (
    <FournisseurAuth>
      <Routes>
        <Route path="/connexion" element={<Connexion />} />

        <Route
          path="/"
          element={
            <RouteProtegee>
              <TableauDeBord />
            </RouteProtegee>
          }
        />

        {/* La gestion des marques est reservee aux administrateurs : les
            operateurs consultent le catalogue mais ne le modifient pas. */}
        <Route
          path="/marques"
          element={
            <RouteProtegee roles={['administrateur']}>
              <Marques />
            </RouteProtegee>
          }
        />

        {/* Le catalogue est consultable par tous, modifiable par les seuls
            administrateurs : le controle fin se fait cote Appwrite. */}
        <Route
          path="/catalogue"
          element={
            <RouteProtegee>
              <Catalogue />
            </RouteProtegee>
          }
        />

        <Route
          path="/catalogue/import"
          element={
            <RouteProtegee roles={['administrateur']}>
              <ImportCatalogue />
            </RouteProtegee>
          }
        />

        <Route
          path="/campagnes"
          element={
            <RouteProtegee>
              <Campagnes />
            </RouteProtegee>
          }
        />

        <Route
          path="/saisie/:campagneId"
          element={
            <RouteProtegee>
              <Saisie />
            </RouteProtegee>
          }
        />

        <Route
          path="/apercu/:campagneId"
          element={
            <RouteProtegee>
              <Apercu />
            </RouteProtegee>
          }
        />

        {/* Sans campagne indiquee, on renvoie vers la liste plutot que vers un
            ecran de saisie vide. */}
        <Route path="/saisie" element={<Navigate to="/campagnes" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </FournisseurAuth>
  );
}
