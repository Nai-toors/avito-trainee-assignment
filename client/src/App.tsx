import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AdsList } from './pages/AdsList';
import { AdItem } from './pages/AdItem';
// import { Stats } from './pages/Stats';

// Простой Layout с хедером
const Layout = ({ children }: { children: React.ReactNode }) => (
  <>
    <header style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <nav style={{ display: 'flex', gap: '20px' }}>
        <Link to="/list">Список</Link>
        <Link to="/stats">Статистика</Link>
      </nav>
    </header>
    <main>{children}</main>
  </>
);

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/list" />} />
        <Route path="/list" element={<AdsList />} />
        <Route path="/item/:id" element={<AdItem />} />
        {/* <Route path="/stats" element={<Stats />} /> */}
      </Routes>
    </Layout>
  );
}

export default App;