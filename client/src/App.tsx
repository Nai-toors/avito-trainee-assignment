import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Box, Button, IconButton, Container } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

import { AdsList } from './pages/AdsList';
import { AdItem } from './pages/AdItem';
import { Stats } from './pages/Stats';
import { useColorMode } from './theme/themeContext';

// layout с хедером
const Layout = ({ children }: { children: React.ReactNode }) => {
  const { toggleColorMode, mode } = useColorMode();
  const location = useLocation();

  return (
    <>
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            {/* Навигация */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                component={Link} 
                to="/list" 
                color={location.pathname.includes('/list') || location.pathname.includes('/item') ? "primary" : "inherit"}
                sx={{ fontSize: '1rem' }}
              >
                Список
              </Button>
              <Button 
                component={Link} 
                to="/stats" 
                color={location.pathname === '/stats' ? "primary" : "inherit"}
                sx={{ fontSize: '1rem' }}
              >
                Статистика
              </Button>
            </Box>

            {/* Кнопка переключения темы */}
            <IconButton onClick={toggleColorMode} color="inherit">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      
      <main>{children}</main>
    </>
  );
};

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/list" />} />
        <Route path="/list" element={<AdsList />} />
        <Route path="/item/:id" element={<AdItem />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </Layout>
  );
}

export default App;