import { Amplify } from 'aws-amplify';

// Load Cognito configuration from environment variables
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      loginWith: {
        oauth: {
          // Format complet: <domain>.auth.<region>.amazoncognito.com
          domain: `${import.meta.env.VITE_COGNITO_DOMAIN || 'lyricscape-prod'}.auth.${import.meta.env.VITE_AWS_REGION || 'eu-north-1'}.amazoncognito.com`,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: ['http://localhost:8089', 'http://localhost:8089/', 'http://localhost:8089/login', 'http://localhost:8090', 'http://localhost:8090/', 'http://localhost:8090/login'],
          redirectSignOut: ['http://localhost:8089', 'http://localhost:8089/', 'http://localhost:8089/login', 'http://localhost:8090', 'http://localhost:8090/', 'http://localhost:8090/login'],
          responseType: 'code' as const,
        },
        email: true,
        username: false,
      },
    },
  },
};

// Configure Amplify
Amplify.configure(amplifyConfig);

export default amplifyConfig;
