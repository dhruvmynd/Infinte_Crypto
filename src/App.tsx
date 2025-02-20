import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAddress } from "@thirdweb-dev/react";
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { InfiniteCrypto } from './pages/InfiniteCrypto';
import { useAuth } from './hooks/useAuth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const address = useAddress();
  const { user, loading } = useAuth();

  // Show nothing while checking authentication
  if (loading) {
    return null;
  }

  // Allow access if either web3 or web2 authentication is present
  if (!address && !user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { loading } = useAuth();

  // Show nothing while checking authentication status
  if (loading) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/infinite_crypto"
          element={
            <PrivateRoute>
              <InfiniteCrypto />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;