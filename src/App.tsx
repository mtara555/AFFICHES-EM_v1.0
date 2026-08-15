import { Routes, Route, Navigate } from 'react-router-dom';
import { FournisseurAuth } from './context/AuthContext';
import { RouteProtegee } from './components/RouteProtegee';
import { Connexion } from './pages/Connexion';
import { TableauDeBord } from './pages/TableauDeBord';
import { Marques } from './pages/Marques';

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </FournisseurAuth>
  );
}
