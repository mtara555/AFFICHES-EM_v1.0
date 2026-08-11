import { Routes, Route, Navigate } from 'react-router-dom';
import { FournisseurAuth } from './context/AuthContext';
import { RouteProtegee } from './components/RouteProtegee';
import { Connexion } from './pages/Connexion';
import { TableauDeBord } from './pages/TableauDeBord';

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

        {/* Les ecrans catalogue, campagnes et parametres arriveront en phase 1. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </FournisseurAuth>
  );
}
