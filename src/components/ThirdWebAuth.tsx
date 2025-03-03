import React, { useState } from 'react';
import { ConnectWallet, useAddress, useConnectionStatus } from "@thirdweb-dev/react";
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useActivity } from '../hooks/useActivity';
import { Toast } from './Toast';
import { checkSupabaseConnection, handleDatabaseError } from '../lib/supabase';

export function ThirdWebAuth() {
  const address = useAddress();
  const connectionStatus = useConnectionStatus();
  const navigate = useNavigate();
  const { createProfile } = useProfile();
  const { trackActivity } = useActivity();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // Track previous address to detect changes
  const prevAddressRef = React.useRef<string | undefined>();

  React.useEffect(() => {
    const handleConnection = async () => {
      // Only proceed if we have a new connection and aren't already creating a profile
      if (address && 
          connectionStatus === "connected" && 
          prevAddressRef.current !== address &&
          !isCreatingProfile) {
        
        prevAddressRef.current = address;
        setIsCreatingProfile(true);
        
        try {
          setToast({
            message: 'Creating Web3 profile...',
            type: 'loading'
          });

          // Check Supabase connection first
          const { connected, error: connectionError } = await checkSupabaseConnection();
          if (!connected) {
            const errorMessage = connectionError 
              ? handleDatabaseError(connectionError, 'Database connection issue')
              : 'Database connection issue. Please try again.';
              
            setToast({
              message: errorMessage,
              type: 'error'
            });
            setIsCreatingProfile(false);
            return;
          }

          const normalizedAddress = address.toLowerCase();
          console.log('Creating profile for wallet address:', normalizedAddress);
          
          // Create or update profile with just the wallet address
          const profile = await createProfile({
            wallet_address: normalizedAddress,
            web3_provider: 'thirdweb',
            email: null // Explicitly set email to null for Web3 users
          });

          console.log('Web3 profile created/updated:', profile);

          // Track the connection activity
          try {
            await trackActivity({
              activity_type: 'wallet_connected',
              details: {
                provider: 'thirdweb',
                wallet_address: normalizedAddress
              }
            });
          } catch (activityError) {
            console.log('Activity tracking error (non-critical):', activityError);
            // Continue execution even if activity tracking fails
          }

          setToast({
            message: 'Connected successfully!',
            type: 'success'
          });

          setTimeout(() => {
            navigate('/infinite_ideas');
          }, 1000);
        } catch (err) {
          console.error('Error creating web3 profile:', err);
          
          const errorMessage = err instanceof Error 
            ? handleDatabaseError(err, `Failed to connect: ${err.message}`)
            : 'Failed to connect wallet';
            
          setToast({
            message: errorMessage,
            type: 'error'
          });
        } finally {
          setIsCreatingProfile(false);
        }
      }
    };

    handleConnection();
  }, [address, connectionStatus, createProfile, trackActivity, navigate, isCreatingProfile]);

  return (
    <div className="relative flex flex-col items-center">
      <ConnectWallet
        theme="dark"
        btnTitle="Connect Wallet"
        modalTitle="Connect Your Wallet"
        modalTitleIconUrl=""
        modalSize="wide"
        auth={{
          loginOptional: false,
          onLogin: () => {},
          onLogout: () => {},
        }}
        welcomeScreen={{
          title: "Connect Your Wallet",
          subtitle: "Choose your preferred wallet to connect",
        }}
        detailsBtn={() => (
          <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors">
            <Wallet size={18} />
            <span className="truncate">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}</span>
          </button>
        )}
        className="w-full max-w-md !bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 !text-white !rounded-lg !py-3 !transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}