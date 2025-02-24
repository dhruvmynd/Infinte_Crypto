import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAddress } from "@thirdweb-dev/react";
import { InfiniteIdeas } from './pages/InfiniteCrypto';
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
        <Route path="/" element={<InfiniteIdeas />} />
        <Route path="/infinite_ideas" element={<InfiniteIdeas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;