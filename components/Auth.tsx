import React, { useState } from 'react';
import { authService } from '../services/authService';
import { APP_NAME } from '../constants';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login State
  const [loginId, setLoginId] = useState(''); // Email or Username
  
  // Register State
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');

  // Shared State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        await authService.signIn(loginId, password);
      } else {
        // Validasi sederhana
        if (regUsername.includes('@')) throw new Error("Username tidak boleh mengandung karakter '@'");
        if (regUsername.length < 3) throw new Error("Username minimal 3 karakter");
        if (!regEmail.includes('@')) throw new Error("Email tidak valid");

        const { user } = await authService.signUp(regEmail, password, regUsername, regFullName);
        
        if (user && !user.email_confirmed_at) {
             alert("Pendaftaran berhasil! Anda akan masuk otomatis.");
        } else {
             alert("Pendaftaran berhasil!");
        }
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
      setIsLogin(!isLogin);
      setErrorMsg('');
      setPassword('');
      setLoginId('');
      setRegEmail('');
      setRegUsername('');
      setRegFullName('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-telegram-dark transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-telegram-darkSecondary rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 animate-fade-in-up flex flex-col items-center">
        
        {/* Logo Section */}
        <div className="mb-6 relative group">
          <div className="absolute inset-0 bg-telegram-primary blur-xl opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
          <div className="w-20 h-20 bg-telegram-primary rounded-full flex items-center justify-center shadow-lg relative z-10 animate-scale-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-1 text-gray-800 dark:text-white tracking-tight">{APP_NAME}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
          {isLogin ? 'Masuk untuk mulai mengobrol' : 'Buat akun baru dalam hitungan detik'}
        </p>

        {errorMsg && (
          <div className="w-full mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm rounded-lg text-center animate-fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          
          {isLogin ? (
              /* LOGIN FIELDS */
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Username / Email</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  placeholder="email@contoh.com atau username"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 outline-none transition-all text-gray-800 dark:text-white"
                />
              </div>
          ) : (
              /* REGISTER FIELDS */
              <>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Email</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      placeholder="nama@email.com"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 outline-none transition-all text-gray-800 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Username</label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      required
                      minLength={3}
                      placeholder="username_unik"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 outline-none transition-all text-gray-800 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      required
                      placeholder="Nama Anda"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 outline-none transition-all text-gray-800 dark:text-white"
                    />
                </div>
              </>
          )}

          {/* PASSWORD FIELD (SHARED) */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 ml-1">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/20 outline-none transition-all text-gray-800 dark:text-white pr-10"
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-500 dark:text-gray-400 hover:text-telegram-primary focus:outline-none"
            >
                {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-telegram-primary hover:bg-telegram-secondary text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transform transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
               <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
               <span>{isLogin ? 'Masuk Sekarang' : 'Daftar Akun'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}</span>
          <button 
            onClick={toggleMode}
            className="font-bold text-telegram-primary hover:underline focus:outline-none"
          >
            {isLogin ? 'Daftar di sini' : 'Login di sini'}
          </button>
        </div>

        <div className="mt-8 text-xs text-center text-gray-400 dark:text-gray-600">
          Created by Valmortheos
        </div>
      </div>
    </div>
  );
};