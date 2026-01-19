import React, { useState } from 'react';
import { authService } from '../services/authService';
import { APP_NAME } from '../constants';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login State
  const [loginId, setLoginId] = useState(''); 
  
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#0f1115] relative overflow-hidden font-sans">
      
      {/* Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/30 blur-[120px] mix-blend-screen animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/30 blur-[120px] mix-blend-screen animate-pulse delay-1000"></div>

      <div className="w-full max-w-[420px] z-10 p-6">
        <div className="bg-white/70 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8 animate-fade-in-up">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-telegram-primary to-blue-600 shadow-lg shadow-blue-500/30 mb-4 transform rotate-[-5deg] hover:rotate-0 transition-transform duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
               </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{APP_NAME}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 font-medium">
              {isLogin ? 'Selamat datang kembali!' : 'Mulai perjalanan barumu'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl text-center flex items-center justify-center gap-2">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isLogin ? (
                <div className="group">
                   <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1 mb-1.5 transition-colors group-focus-within:text-telegram-primary">EMAIL / USERNAME</label>
                   <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black focus:border-telegram-primary outline-none transition-all text-gray-900 dark:text-white font-medium placeholder-gray-400"
                    placeholder="Masukkan kredensial"
                   />
                </div>
            ) : (
                <>
                  <div className="group">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1 mb-1.5 transition-colors group-focus-within:text-telegram-primary">EMAIL</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black focus:border-telegram-primary outline-none transition-all text-gray-900 dark:text-white font-medium"
                      placeholder="nama@email.com"
                    />
                  </div>
                  <div className="group">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1 mb-1.5 transition-colors group-focus-within:text-telegram-primary">USERNAME</label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      required
                      minLength={3}
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black focus:border-telegram-primary outline-none transition-all text-gray-900 dark:text-white font-medium"
                      placeholder="username_unik"
                    />
                  </div>
                  <div className="group">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1 mb-1.5 transition-colors group-focus-within:text-telegram-primary">NAMA LENGKAP</label>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black focus:border-telegram-primary outline-none transition-all text-gray-900 dark:text-white font-medium"
                      placeholder="Nama Anda"
                    />
                  </div>
                </>
            )}

            <div className="group relative">
               <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1 mb-1.5 transition-colors group-focus-within:text-telegram-primary">PASSWORD</label>
               <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-black focus:border-telegram-primary outline-none transition-all text-gray-900 dark:text-white font-medium"
                placeholder="••••••••"
               />
               <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[38px] text-gray-400 hover:text-telegram-primary transition-colors"
               >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
               </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-telegram-primary to-blue-600 hover:from-telegram-secondary hover:to-blue-700 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/30 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                 <span>{isLogin ? 'MASUK' : 'BUAT AKUN'}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
             <button 
                onClick={toggleMode}
                className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-telegram-primary dark:hover:text-telegram-primary transition-colors"
             >
                {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
                <span className="font-bold underline decoration-2 underline-offset-4 decoration-transparent hover:decoration-current transition-all">
                    {isLogin ? 'Daftar' : 'Login'}
                </span>
             </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold">Created by Valmortheos</p>
          </div>
        </div>
      </div>
    </div>
  );
};