import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Alert } from 'react-native';

const DROPBOX_CLIENT_ID = process.env.EXPO_PUBLIC_DROPBOX_APP_KEY || '<YOUR_DROPBOX_APP_KEY>';

const DROPBOX_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'com.pray.identityinchristapp', // Must match your app configuration (app.json)
  path: 'redirect',
});

const ACCESS_TOKEN_KEY = 'dropboxAccessToken';
const REFRESH_TOKEN_KEY = 'dropboxRefreshToken';
const TOKEN_ENDPOINT = 'https://api.dropboxapi.com/oauth2/token';

interface DropboxAuthContextData {
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
}

const DropboxAuthContext = createContext<DropboxAuthContextData | undefined>(undefined);

export function useDropboxAuth() {
  const context = useContext(DropboxAuthContext);
  if (!context) {
    throw new Error('useDropboxAuth must be used within a DropboxAuthProvider');
  }
  return context;
}

export function DropboxAuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const discovery = {
    authorizationEndpoint: 'https://www.dropbox.com/oauth2/authorize',
    tokenEndpoint: TOKEN_ENDPOINT,
  };

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: DROPBOX_CLIENT_ID,
      redirectUri: DROPBOX_REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      scopes: ['files.metadata.read', 'files.content.read', 'files.content.write'],
      extraParams: {
        token_access_type: 'offline',
      },
    },
    discovery
  );

  useEffect(() => {
    (async () => {
      try {
        const storedAccess = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (storedAccess && storedRefresh) {
          setAccessToken(storedAccess);
          setRefreshToken(storedRefresh);
        }
      } catch {
        setError('Failed to load tokens');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const exchangeCodeForTokens = async () => {
      if (response?.type === 'success' && response.params.code) {
        if (!request?.codeVerifier) {
          setError('No code verifier found, login failed');
          return;
        }
        setIsLoading(true);
        try {
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId: DROPBOX_CLIENT_ID,
              code: response.params.code,
              redirectUri: DROPBOX_REDIRECT_URI,
              extraParams: { code_verifier: request.codeVerifier },
            },
            discovery
          );

          if (!tokenResponse.refreshToken) {
            setError('No refresh token received. Please authorize with offline access.');
            Alert.alert('Authentication Error', 'Please authorize with offline access.');
            setIsLoading(false);
            return;
          }

          setAccessToken(tokenResponse.accessToken);
          setRefreshToken(tokenResponse.refreshToken);
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokenResponse.accessToken);
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenResponse.refreshToken);
          setError(null);
        } catch (e: any) {
          setError(e.message || 'Failed to exchange token');
          Alert.alert('Authentication failed', e.message || 'Please try again');
        } finally {
          setIsLoading(false);
        }
      }
    };
    exchangeCodeForTokens();
  }, [response, request]);

  const DROPBOX_CLIENT_SECRET = process.env.EXPO_PUBLIC_DROPBOX_APP_SECRET || '<YOUR_DROPBOX_APP_SECRET>';

  const refreshAccessToken = useCallback(async (): Promise<string> => {
    if (!refreshToken) {
      throw new Error('No refresh token available, please log in.');
    }
    setIsLoading(true);
    try {
      const bodyParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: DROPBOX_CLIENT_ID,
        client_secret: DROPBOX_CLIENT_SECRET,
      });

      const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to refresh token: ${res.status} ${text}`);
      }

      const json = await res.json();

      if (!json.access_token) throw new Error('No access token in response');

      const newRefreshToken = json.refresh_token || refreshToken;

      setAccessToken(json.access_token);
      setRefreshToken(newRefreshToken);
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, json.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
      setError(null);

      return json.access_token;
    } catch (e: any) {
      setError(e.message || 'Token refresh failed');
      setAccessToken(null);
      setRefreshToken(null);
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      Alert.alert('Session expired', 'Please log in again');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken]);

  const signIn = useCallback(async () => {
    setError(null);
    if (!request) {
      setError('Authentication request not ready');
      return;
    }
    await promptAsync();
  }, [request, promptAsync]);

  const signOut = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    setError(null);
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }, []);

  return (
    <DropboxAuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        isLoading,
        error,
        signIn,
        signOut,
        refreshAccessToken,
      }}
    >
      {children}
    </DropboxAuthContext.Provider>
  );
}
  