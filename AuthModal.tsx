import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string, token: string) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }
    if (password.length < 4) {
      setError('Password is too short');
      setLoading(false);
      return;
    }

    setTimeout(() => {
      onSuccess(username, 'session_token_secure_auth_v1');
      onClose();
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-md p-8 relative animate-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/30">
            {isLogin ? <LogIn className="text-emerald-400" /> : <UserPlus className="text-emerald-400" />}
          </div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white">
            {isLogin ? 'Welcome Back' : 'Join AgroSphere AI'}
          </h2>
          <p className="text-white/60 text-sm mt-2 text-center">
            {isLogin ? 'Enter credentials to access your fields' : 'Start monitoring crops with satellite AI'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1 ml-1">Username</label>
            <input
              type="text"
              required
              className="input-field w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-emerald-500/50"
              placeholder="agronomist_01"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-1 ml-1">Password</label>
            <input
              type="password"
              required
              className="input-field w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-emerald-500/50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-sm text-white/40 hover:text-emerald-400 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}