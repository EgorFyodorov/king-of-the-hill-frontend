import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { MetaMaskProvider } from './contexts/MetaMaskContext';
import { KingOfTheHillProvider } from './contexts/KingOfTheHillContext';
import Home from './pages/Home';

const AppContent: React.FC = React.memo(() => {
  return (
    <KingOfTheHillProvider>
      <Home />
    </KingOfTheHillProvider>
  );
});

function App() {
  return (
    <Router>
      <MetaMaskProvider>
        <AppContent />
      </MetaMaskProvider>
    </Router>
  );
}

export default App; 