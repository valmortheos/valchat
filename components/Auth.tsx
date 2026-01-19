import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { APP_NAME } from '../constants';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false); // State visibility password
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
            if (error.message.includes("Email not confirmed")) {
                throw new Error("Email belum diverifikasi. Cek inbox/spam Anda.");
            } else if (error.message.includes("Invalid login credentials")) {
                throw new Error("Email atau password salah.");
            }
            throw error;
        }
      } else {
        const generatedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2AABEE&color=fff&bold=true`;
        
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              avatar_url: generatedAvatar
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          alert("Registrasi berhasil! Cek email untuk verifikasi.");
          setIsLogin(true);
        } else if (data.user && data.session) {
          alert("Selamat Datang!");
        }
      }
    } catch (error: any) {
      alert(error.message || 'Terjadi kesalahan saat autentikasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-telegram-dark transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-telegram-darkSecondary rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-telegram-primary rounded-full flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-center text-gray-800 dark:text-white">{APP_NAME}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center text-sm">
          {isLogin ? 'Masuk untuk melanjutkan' : 'Buat akun baru'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama Lengkap"
                required={!isLogin}
                className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-black/20 border border-transparent focus:bg-white dark:focus:bg-black/40 focus:border-telegram-primary outline-none transition-all text-gray-800 dark:text-white"
              />
            </div>
          )}

          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-black/20 border border-transparent focus:bg-white dark:focus:bg-black/40 focus:border-telegram-primary outline-none transition-all text-gray-800 dark:text-white"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata Sandi"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-black/20 border border-transparent focus:bg-white dark:focus:bg-black/40 focus:border-telegram-primary outline-none transition-all text-gray-800 dark:text-white pr-12"
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-telegram-primary focus:outline-none"
            >
                {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-telegram-primary hover:bg-telegram-secondary text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all duration-200 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-telegram-primary font-semibold hover:underline focus:outline-none"
            >
              {isLogin ? 'Daftar sekarang' : 'Login di sini'}
            </button>
          </p>
        </div>
        
        <div className="mt-8 text-xs text-center text-gray-400 dark:text-gray-500">
          Created by Valmortheos
        </div>
      </div>
    </div>
  );
};