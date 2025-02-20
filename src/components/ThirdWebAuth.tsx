import React from 'react';
import { ConnectWallet, useAddress, useChainId, useConnectionStatus } from "@thirdweb-dev/react";
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useActivity } from '../hooks/useActivity';

export function ThirdWebAuth() {
  const address = useAddress();
  const chainId = useChainId();
  const connectionStatus = useConnectionStatus();
  const navigate = useNavigate();
  const { createProfile, isLoading, error } = useProfile();
  const { trackActivity } = useActivity();

  React.useEffect(() => {
    const handleConnection = async () => {
      if (address && connectionStatus === "connected") {
        try {
          // Create or update profile when wallet is connected
          await createProfile({
            wallet_address: address,
            web3_provider: 'thirdweb',
            chain_id: chainId?.toString()
          });

          // Track the connection activity
          await trackActivity({
            activity_type: 'wallet_connected',
            details: {
              provider: 'thirdweb',
              chain_id: chainId
            }
          });

          navigate('/infinite_crypto');
        } catch (err) {
          console.error('Error creating profile:', err);
        }
      }
    };

    handleConnection();
  }, [address, chainId, connectionStatus, createProfile, trackActivity, navigate]);

  if (error) {
    console.error('Profile error:', error);
  }

  return (
    <div className="flex justify-center">
      <ConnectWallet
        theme="dark"
        btnTitle="Connect with Web3"
        modalTitle="Connect Wallet"
        modalTitleIconUrl=""
        detailsBtn={() => (
          <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors">
            <Wallet size={20} />
            <span className="truncate">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}</span>
          </button>
        )}
        modalSize="wide"
        className="w-full max-w-md !bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 !text-white !rounded-lg !py-3 !transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}