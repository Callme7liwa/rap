import { Authenticator, ThemeProvider, Theme, useTheme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import '../amplify-overrides.css';
import { useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Music, Sparkles, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Custom theme matching the app's indigo/violet color palette
const customTheme: Theme = {
  name: 'lyricshub-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: { value: '#f3f4ff' },
          20: { value: '#e0e3ff' },
          40: { value: '#a5abf5' },
          60: { value: '#6366f1' },
          80: { value: '#4f46e5' },
          90: { value: '#4338ca' },
          100: { value: '#3730a3' },
        },
      },
    },
  },
};

function LoginContent() {
  const navigate = useNavigate();
  const { user } = useAuthenticator((context) => [context.user]);

  // Redirect to home if user is authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return null;
}

export default function Login() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check if dark mode is enabled
    const darkMode = document.documentElement.classList.contains('dark');
    setIsDark(darkMode);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background gradient matching home page */}
      <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      {/* Theme toggle button */}


      <div className="w-full max-w-md mx-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >

          {/* Auth form with glass effect */}
          <div className="glass rounded-2xl p-8 w-fit">
            <ThemeProvider theme={customTheme}>
              <Authenticator
                socialProviders={['google', 'facebook']}
                signUpAttributes={['name', 'email']}
                components={{
                  Header() {
                    return (
                      <div className="text-center py-4">
                        <h2 className="text-2xl font-bold">
                          Welcome Back
                        </h2>
                        <p className="text-sm text-muted-foreground mt-2">
                          Sign in to continue your journey
                        </p>
                      </div>
                    );
                  },
                  SignUp: {
                    Header() {
                      return (
                        <div className="text-center py-4">
                          <h2 className="text-2xl font-bold">
                            Create Your Account
                          </h2>
                          <p className="text-sm text-muted-foreground mt-2">
                            Start exploring music and lyrics
                          </p>
                        </div>
                      );
                    },
                  },
                }}
              >
                <LoginContent />
              </Authenticator>
            </ThemeProvider>
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
