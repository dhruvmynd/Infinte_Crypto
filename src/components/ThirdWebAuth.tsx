import React, { useState } from 'react';
import { ConnectWallet, useAddress, useConnectionStatus } from "@thirdweb-dev/react";
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useActivity } from '../hooks/useActivity';
import { Toast } from './Toast';

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

          const normalizedAddress = address.toLowerCase();
          
          // Create or update profile with just the wallet address
          await createProfile({
            wallet_address: normalizedAddress,
            web3_provider: 'thirdweb'
          });

          // Track the connection activity
          await trackActivity({
            activity_type: 'wallet_connected',
            details: {
              provider: 'thirdweb',
              wallet_address: normalizedAddress
            }
          });

          setToast({
            message: 'Connected successfully!',
            type: 'success'
          });

          setTimeout(() => {
            navigate('/infinite_crypto');
          }, 1000);
        } catch (err) {
          console.error('Error creating web3 profile:', err);
          setToast({
            message: err instanceof Error 
              ? `Failed to connect: ${err.message}`
              : 'Failed to connect wallet',
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
        btnTitle="Connect with Web3"
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
            <Wallet size={20} />
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