import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';

export function CancelPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/infinite_ideas');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-green-500 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl w-full max-w-md text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} className="text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Purchase Cancelled</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your purchase has been cancelled. No charges were made to your account.
        </p>
        
        <button
          onClick={handleBack}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Game</span>
        </button>
      </div>
    </div>
  );
}