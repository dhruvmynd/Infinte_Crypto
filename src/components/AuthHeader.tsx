import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { ThirdWebAuth } from './ThirdWebAuth';
import { AuthModal } from './AuthModal';
import { UserProfileMenu } from './UserProfileMenu';
import { useAddress } from "@thirdweb-dev/react";
import { useAuth } from '../hooks/useAuth';

export function AuthHeader() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const address = useAddress();
  const { user } = useAuth();

  if (address || user) {
    return (
      <div className="absolute top-4 right-4 z-50">
        <UserProfileMenu />
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
      <button
        onClick={() => setIsAuthModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors text-sm"
      >
        <LogIn size={16} />
        <span>Sign In</span>
      </button>
      <ThirdWebAuth />
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
}