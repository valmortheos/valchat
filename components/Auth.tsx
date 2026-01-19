import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { APP_NAME } from '../constants';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Redirect kembali ke app setelah login
        },
      });
      if (error) throw error;
    } catch (error: any) {
      alert('Gagal login: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-telegram-dark transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-telegram-darkSecondary rounded-xl shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-telegram-primary rounded-full flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">{APP_NAME}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Chatting realtime dengan antarmuka native yang cepat dan aman.
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 border border-gray-300 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
             <span className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full"></span>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </>
          )}
        </button>

        <div className="mt-8 text-xs text-gray-400 dark:text-gray-500">
          Created by Valmortheos
        </div>
      </div>
    </div>
  );
};
