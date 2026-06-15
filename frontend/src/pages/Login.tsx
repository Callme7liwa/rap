import { useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth.store';

export default function Login() {
  const [isDark, setIsDark] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Check if dark mode is enabled
    const darkMode = document.documentElement.classList.contains('dark');
    setIsDark(darkMode);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'ADMIN' ? '/admin' : '/');
    }
  }, [isAuthenticated, navigate, user?.role]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const authenticatedUser =
        mode === 'login'
          ? await login({ email, password })
          : await register({
              email,
              password,
              display_name: displayName || undefined,
            });

      navigate(authenticatedUser.role === 'ADMIN' ? '/admin' : '/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">

      {/* Theme toggle button */}


      <div className="w-full max-w-md mx-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >

          {/* Auth form with glass effect */}
          <div className="glass rounded-none border border-border p-8 w-full">
            <div className="text-center py-4">
              <Music className="w-10 h-10 mx-auto mb-3 text-primary" />
              <h2 className="font-display text-5xl uppercase tracking-wide">
                {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {mode === 'login'
                  ? 'Sign in to continue your journey'
                  : 'Start exploring music and lyrics'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {mode === 'register' && (
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Display name"
                />
              )}
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                required
              />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
              </Button>
            </form>

            <Button
              type="button"
              variant="ghost"
              className="w-full mt-3"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login'
                ? 'Need an account? Register'
                : 'Already have an account? Sign in'}
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              By signing in, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
