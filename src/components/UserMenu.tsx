import React from 'react';
import { LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserMenuProps {
  email: string;
  onSignOut: () => void;
}

export function UserMenu({ email, onSignOut }: UserMenuProps) {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      onSignOut();
    }
  };

  return (
    <div className="absolute top-4 right-20 z-10 flex items-center gap-2">
      <div className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 rounded-full px-4 py-2 text-white">
        <User size={16} />
        <span className="text-sm truncate max-w-[150px]">{email}</span>
      </div>
      <button
        onClick={handleSignOut}
        className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors"
        title="Sign out"
      >
        <LogOut size={16} className="text-white" />
      </button>
    </div>
  );
}