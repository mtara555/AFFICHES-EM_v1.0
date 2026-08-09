import { Routes, Route, Navigate } from 'react-router-dom';
import { TableauDeBord } from './pages/TableauDeBord';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<TableauDeBord />} />
      {/* Les autres routes seront ajoutees au fil des etapes. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
