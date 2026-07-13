import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../utils/apiError';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(parseApiError(err, 'Authentication failed. Validate credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#120A1D] text-white px-6 font-sans relative overflow-hidden">
      {/* Background glowing blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#DE638A]/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#C6BADE]/5 rounded-full filter blur-[120px] pointer-events-none" />

      <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#231634]/60 backdrop-blur-xl border border-[#4A3267]/30 p-10 rounded-3xl space-y-6 shadow-2xl shadow-black/80 relative z-10">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DE638A]" />
            <h2 className="text-2xl font-extrabold text-white tracking-widest font-display">STADIUMOS</h2>
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Operations Console</p>
          <div className="h-px bg-gradient-to-r from-transparent via-[#4A3267]/40 to-transparent my-4" />
          <p className="text-xs text-gray-400">Operations Control Portal Authentication</p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-xl font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#180F25]/60 border border-[#4A3267]/40 focus:border-[#DE638A] px-4 py-3.5 rounded-xl text-xs outline-none transition-all duration-300 placeholder-gray-600 focus:shadow-md focus:shadow-[#DE638A]/5"
              placeholder="operator@stadiumos.dev"
              required
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#180F25]/60 border border-[#4A3267]/40 focus:border-[#DE638A] px-4 py-3.5 rounded-xl text-xs outline-none transition-all duration-300 placeholder-gray-600 focus:shadow-md focus:shadow-[#DE638A]/5"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#DE638A] hover:bg-[#c44f75] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition-all duration-300 text-xs uppercase tracking-widest shadow-lg shadow-[#DE638A]/20"
        >
          {loading ? "Decrypting token key..." : "Authorize Session"}
        </button>

        <div className="text-center text-[11px] text-gray-500 font-medium">
          New operator account?{' '}
          <button type="button" onClick={() => navigate('/register')} className="text-[#F7B9C4] hover:underline">
            Register console
          </button>
        </div>
      </form>
    </div>
  );
};
export default Login;
