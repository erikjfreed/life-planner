import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import NavBar from './features/nav/NavBar';
import Dashboard from './features/dashboard/Dashboard';
import HealthPage from './features/nav/HealthPage';
import CategoryPage from './features/nav/CategoryPage';
import TimelineTable from './features/timeline/TimelineTable';
import DogsPage from './features/nav/DogsPage';
import CarsPage from './features/nav/CarsPage';
import TravelPage from './features/nav/TravelPage';
import LivingPage from './features/nav/LivingPage';
import RealEstatePage from './features/nav/RealEstatePage';
import EventsPage from './features/nav/EventsPage';
import LoansPage from './features/nav/LoansPage';
import { fetchEvents } from './features/events/eventsSlice';
import { fetchEntities } from './features/entities/entitiesSlice';
import { fetchLoans } from './features/loans/loansSlice';
import { fetchParameters } from './features/parameters/parametersSlice';

function App() {
  const [view, setView] = useState('dashboard');
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchEvents());
    dispatch(fetchEntities());
    dispatch(fetchLoans());
    dispatch(fetchParameters());
  }, [dispatch]);

  const renderView = () => {
    if (view === 'dashboard')   return <Dashboard />;
    if (view === 'timeline')    return <TimelineTable />;
    if (view === 'health')      return <HealthPage />;
    if (view === 'dogs')        return <DogsPage />;
    if (view === 'vehicles')    return <CarsPage />;
    if (view === 'travel')      return <TravelPage />;
    if (view === 'living')      return <LivingPage />;
    if (view === 'real-estate') return <RealEstatePage />;
    if (view === 'loans')       return <LoansPage />;
    if (view === 'events')      return <EventsPage />;
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
