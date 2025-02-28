import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAddress } from "@thirdweb-dev/react";
import InfiniteCrypto from './pages/InfiniteCrypto';
import { SuccessPage } from './pages/SuccessPage';
import { CancelPage } from './pages/CancelPage';
import { useAuth } from './hooks/useAuth';
import { useUserElements } from './hooks/useUserElements';

function App() {
  const { loading } = useAuth();
  const address = useAddress();
  const { refetchElements } = useUserElements();

  // Prefetch user elements when app loads if user is authenticated
  useEffect(() => {
    if (address) {
      console.log('App mounted with authenticated user, prefetching elements');
      refetchElements();
    }
  }, [address, refetchElements]);

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