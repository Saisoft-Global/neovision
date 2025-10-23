import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { AUTH_ERROR_MESSAGES } from '../../services/auth/errors/ErrorMessages';
import { GradientBackground } from '../ui/GradientBackground';
import { ModernCard } from '../ui/ModernCard';
import { ModernInput } from '../ui/ModernInput';
import { ModernButton } from '../ui/ModernButton';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { signIn, signUp, error, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const validateForm = (): string | null => {
    if (!email) return 'Email is required';
    if (!email.includes('@')) return 'Please enter a valid email address';
    if (!password) return 'Password is required';
    if (password.length < 6) return AUTH_ERROR_MESSAGES.WEAK_PASSWORD;
    return null;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      return;
    }

    try {
      if (isRegistering) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate('/');
    } catch (err) {
      // Error is handled by the auth store
      console.error('Authentication error:', err);
    }
  }, [email, password, isRegistering, signIn, signUp, navigate]);

  const isSubmitDisabled = !email || !password || isLoading || password.length < 6;

  return (
    <GradientBackground variant="primary">
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Logo and Title */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 glass-card rounded-2xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white text-shadow-lg mb-2">
            Multi-Agent AI Platform
          </h2>
          <p className="text-white/80 text-lg">
            {isRegistering ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <ModernCard variant="glass" className="backdrop-blur-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <ModernInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                label="Email address"
                placeholder="Enter your email"
                icon={<Mail className="w-5 h-5" />}
                className="bg-white/90"
              />
            </div>

            <div>
              <div className="relative">
                <ModernInput
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  label="Password"
                  placeholder="Enter your password"
                  icon={<Lock className="w-5 h-5" />}
                  error={password && password.length < 6 ? AUTH_ERROR_MESSAGES.WEAK_PASSWORD : undefined}
                  className="bg-white/90"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 backdrop-blur-sm border border-red-500/20 p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              </div>
            )}

            <ModernButton
              type="submit"
              disabled={isSubmitDisabled}
              loading={isLoading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {isRegistering ? 'Create Account' : 'Sign In'}
            </ModernButton>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </div>
          </form>
          </ModernCard>
        </div>
      </div>
    </GradientBackground>
  );
};

export default LoginForm;