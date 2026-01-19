import { supabase } from './supabaseClient';

export const authService = {
  // Verifikasi OTP untuk pendaftaran
  verifySignupOtp: async (email: string, token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) throw error;
      return !!data.session;
    } catch (error: any) {
      console.error('OTP Verification error:', error);
      throw error;
    }
  },

  // Kirim ulang OTP jika user tidak menerima kode
  resendOtp: async (email: string) => {
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email
    });
    if (error) throw error;
  }
};