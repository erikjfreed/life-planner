import { useState } from 'react';
import NavBar from './features/nav/NavBar';
import Dashboard from './features/dashboard/Dashboard';
import CategoryPage from './features/nav/CategoryPage';

function App() {
  const [view, setView] = useState('dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <NavBar active={view} onSelect={setView} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'dashboard'
          ? <Dashboard />
          : <CategoryPage category={view} />
        }
      </div>
    </div>
  );
}

export default App;
