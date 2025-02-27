import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAddress } from "@thirdweb-dev/react";
import InfiniteCrypto from './pages/InfiniteCrypto';
import { SuccessPage } from './pages/SuccessPage';
import { CancelPage } from './pages/CancelPage';
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
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/cancel" element={<CancelPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;