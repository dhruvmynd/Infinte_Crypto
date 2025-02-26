import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAddress } from "@thirdweb-dev/react";
import InfiniteCrypto from './pages/InfiniteCrypto';
import { useAuth } from './hooks/useAuth';

function App() {
  const { loading } = useAuth();

  // Show nothing while checking authentication status
  if (loading) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InfiniteCrypto />} />
        <Route path="/infinite_ideas" element={<InfiniteCrypto />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;