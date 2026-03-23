import { useState } from 'react';
import NavBar from './features/nav/NavBar';
import Dashboard from './features/dashboard/Dashboard';
import HealthPage from './features/nav/HealthPage';
import CategoryPage from './features/nav/CategoryPage';
import TimelineTable from './features/timeline/TimelineTable';

function App() {
  const [view, setView] = useState('dashboard');

  const renderView = () => {
    if (view === 'dashboard') return <Dashboard />;
    if (view === 'timeline')  return <TimelineTable />;
    if (view === 'health')    return <HealthPage />;
    return <CategoryPage category={view} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <NavBar active={view} onSelect={setView} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderView()}
      </div>
    </div>
  );
}

export default App;
