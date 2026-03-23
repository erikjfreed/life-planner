import { useState } from 'react';
import NavBar from './features/nav/NavBar';
import Dashboard from './features/dashboard/Dashboard';
import HealthPage from './features/nav/HealthPage';
import CategoryPage from './features/nav/CategoryPage';
import TimelineTable from './features/timeline/TimelineTable';
import DogsPage from './features/nav/DogsPage';
import CarsPage from './features/nav/CarsPage';
import TravelPage from './features/nav/TravelPage';
import LivingPage from './features/nav/LivingPage';

function App() {
  const [view, setView] = useState('dashboard');

  const renderView = () => {
    if (view === 'dashboard') return <Dashboard />;
    if (view === 'timeline')  return <TimelineTable />;
    if (view === 'health')    return <HealthPage />;
    if (view === 'dogs')      return <DogsPage />;
    if (view === 'cars')      return <CarsPage />;
    if (view === 'travel')    return <TravelPage />;
    if (view === 'living')    return <LivingPage />;
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
