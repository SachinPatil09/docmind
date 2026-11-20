import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, User, Mail, Lock, Eye, EyeOff, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, login, token, isLoading } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // If already authenticated, redirect to home
  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await register(username.trim(), email.trim(), password);
      toast.success('Account created successfully! Signing in...');

      // Auto-login upon registration
      try {
        await login(username.trim(), password);
        navigate('/', { replace: true });
      } catch {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.error ? err.response.data.error : 'Registration failed. Please try a different username or email.');
      toast.error(msg);
      setFieldErrors({ username: msg });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-blue-600/15 to-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand Mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 text-white mb-4">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">DocMind</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-3 h-3" /> AI RAG
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Create an account to begin questioning your documents
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username Input */}
            <div>
              <label htmlFor="reg-username" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  aria-invalid={!!fieldErrors.username}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  placeholder="e.g. sachin"
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#090d16] border rounded-xl text-sm text-slate-100 placeholder-slate-400 outline-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    fieldErrors.username ? 'border-red-500/80 focus-visible:ring-red-500' : 'border-[#233252] focus:border-blue-500'
                  }`}
                />
              </div>
              {fieldErrors.username && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.username}</span>
                </p>
              )}
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="name@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#090d16] border rounded-xl text-sm text-slate-100 placeholder-slate-400 outline-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    fieldErrors.email ? 'border-red-500/80 focus-visible:ring-red-500' : 'border-[#233252] focus:border-blue-500'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.password}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="At least 6 characters"
                  className={`w-full pl-10 pr-11 py-2.5 bg-[#090d16] border rounded-xl text-sm text-slate-100 placeholder-slate-400 outline-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    fieldErrors.password ? 'border-red-500/80 focus-visible:ring-red-500' : 'border-[#233252] focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.confirmPassword}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Repeat your password"
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#090d16] border rounded-xl text-sm text-slate-100 placeholder-slate-400 outline-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    fieldErrors.confirmPassword ? 'border-red-500/80 focus-visible:ring-red-500' : 'border-[#233252] focus:border-blue-500'
                  }`}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.confirmPassword}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-5 border-t border-[#1e293b] text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 font-semibold underline-offset-4 hover:underline focus-visible:ring-1 focus-visible:ring-blue-500 rounded px-1"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          DocMind AI • Built with Spring Boot, PGVector & Gemini
        </p>
      </div>
    </motion.div>
  );
};
