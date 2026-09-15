import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Activity, UserPlus, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !phone) {
      return toast.error('Please fill out all required fields');
    }

    setLoading(true);
    try {
      await register({ name, email, password, phone, role });
      toast.success('Account successfully registered!');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 relative py-8">
      <div className="absolute bottom-10 left-20 w-80 h-80 bg-[#06B6D4]/10 rounded-full blur-3xl z-0" />

      <div className="w-full max-w-lg glass-card p-8 border-slate-200/50 dark:border-slate-800/80 z-10 relative">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/20">
            <UserPlus className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black">Register Account</h2>
          <p className="text-xs text-slate-400 mt-1">Register for smart emergency assistance and tracking</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field pl-12 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field pl-12 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="your.name@gmail.com"
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Account Role</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'PATIENT', label: 'Patient / User' },
                { value: 'DOCTOR', label: 'Doctor / Medical' },
                { value: 'SUPER_ADMIN', label: 'Admin Portal' },
                { value: 'AMBULANCE_DRIVER', label: 'Emergency Responder' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={`p-3 rounded-xl border-2 text-xs font-bold text-center transition-all ${
                    role === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700/80 text-slate-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center text-sm py-3.5 mt-4"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Finalize Registration
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Authenticate here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
