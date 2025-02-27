import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useAddress } from "@thirdweb-dev/react";
import { Toast } from './Toast';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('suggestion');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const address = useAddress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setToast({
        message: 'Please enter your feedback',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    setLoading(true);
    
    try {
      // Get user identifier (email, wallet address, or anonymous)
      const userIdentifier = user?.email || address || 'anonymous';
      const userId = profile?.id || null;
      
      // Insert feedback into Supabase
      const { error } = await supabase
        .from('user_feedback')
        .insert([{
          user_id: userId,
          user_identifier: userIdentifier,
          feedback: feedback.trim(),
          category,
          created_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error('Database error: ' + error.message);
      }
      
      // Show success message
      setToast({
        message: 'Thank you for your feedback!',
        type: 'success'
      });
      
      // Reset form
      setFeedback('');
      setCategory('suggestion');
      
      // Close modal after a delay
      setTimeout(() => {
        setIsOpen(false);
        setToast(null);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setToast({
        message: 'Failed to submit feedback. Please try again.',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-colors"
        aria-label="Provide feedback"
      >
        <MessageSquare size={24} />
      </button>
      
      {/* Feedback modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close feedback form"
            >
              <X size={20} />
            </button>
            
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white" id="feedback-dialog-title">Share Your Feedback</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="suggestion">Suggestion</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="praise">Praise</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Feedback
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Tell us what you think..."
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}