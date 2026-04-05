import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { DelegationsPage } from './pages/DelegationsPage';
import { AgentsPage } from './pages/AgentsPage';
import { ActivityPage } from './pages/ActivityPage';

export const App: React.FC = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/delegations" element={<DelegationsPage />} />
      <Route path="/agents" element={<AgentsPage />} />
      <Route path="/activity" element={<ActivityPage />} />
    </Route>
  </Routes>
);
