import {
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
} from 'expo-auth-session';
import React, { useEffect } from 'react';
import { Alert, Button } from 'react-native';

const DROPBOX_CLIENT_ID = process.env.EXPO_PUBLIC_DROPBOX_APP_KEY || '<YOUR_DROPBOX_APP_KEY>';

const REDIRECT_URI = makeRedirectUri({
  scheme: 'com.pray.identityinchristapp', // Replace with your app scheme from app.json if different
  path: 'redirect',
});

const discovery = {
  authorizationEndpoint: 'https://www.dropbox.com/oauth2/authorize',
  tokenEndpoint: 'https://api.dropboxapi.com/oauth2/token',
};

type DropboxLoginProps = {
  onTokensReceived: (tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
    tokenType?: string;
  }) => void;
};

export default function DropboxLogin({ onTokensReceived }: DropboxLoginProps) {
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: DROPBOX_CLIENT_ID,
      redirectUri: REDIRECT_URI,
scopes: ['files.metadata.read', 'files.content.read', 'files.content.write'],
    extraParams: {
  token_access_type: 'offline', // Important to get refresh token
  response_type: 'code', // Authorization code flow
},

    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params.code) {
      const authCode = response.params.code;

      async function fetchTokens() {
        if (!request) {
          Alert.alert('OAuth Error', 'Request object missing.');
          return;
        }
        if (!request.codeVerifier) {
          Alert.alert('OAuth Error', 'Code verifier missing.');
          return;
        }

        try {
          const tokenResponse = await exchangeCodeAsync(
            {
              clientId: DROPBOX_CLIENT_ID,
              redirectUri: REDIRECT_URI,
              code: authCode,
              extraParams: {
                code_verifier: request.codeVerifier,
              },
            },
            discovery
          );

          if (!tokenResponse.refreshToken) {
            Alert.alert('OAuth Error', 'No refresh token received from Dropbox.');
            return;
          }

          onTokensReceived({
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            expiresIn: tokenResponse.expiresIn,
            tokenType: tokenResponse.tokenType,
          });
        } catch (error: any) {
          Alert.alert(
            'Dropbox Authentication Error',
            error.message || 'Failed to exchange authorization code for tokens.'
          );
        }
      }

      fetchTokens();
    }
  }, [response]);

  return (
    <Button
      title="Connect to Dropbox"
      disabled={!request}
      onPress={() => promptAsync()} // Removed useProxy as per updated typings
      accessibilityLabel="Connect to Dropbox button"
    />
  );
}
