import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Activity, LogIn, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please enter both email and password');
    }

    setLoading(true);
    try {
      await login({ email, password });
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative">
      <div className="absolute top-10 right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl z-0" />
      
      <div className="w-full max-w-md glass-card p-8 border-slate-200/50 dark:border-slate-800/80 z-10 relative">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-white mb-3 shadow-lg shadow-blue-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black">Welcome Back</h2>
          <p className="text-xs text-slate-400 mt-1">Access the Every Second Counts Health Triage Network</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="doctor@Every Second Counts.ai or patient@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-12 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-12 text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center text-sm py-3.5 mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Authenticate & Access Portal
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-bold hover:underline">
            Register on platform
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
