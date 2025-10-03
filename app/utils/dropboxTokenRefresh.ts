// app/utils/dropboxTokenRefresh.ts

import * as SecureStore from 'expo-secure-store';

const DROPBOX_CLIENT_ID = process.env.EXPO_PUBLIC_DROPBOX_APP_KEY || '<YOUR_APP_CLIENT_ID>';
const DROPBOX_TOKEN_ENDPOINT = 'https://api.dropboxapi.com/oauth2/token';

export async function refreshDropboxAccessToken() {
  const refreshToken = await SecureStore.getItemAsync('dropboxRefreshToken');
  if (!refreshToken) throw new Error('No Dropbox refresh token found.');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: DROPBOX_CLIENT_ID,
  }).toString();

  const response = await fetch(DROPBOX_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Dropbox token refresh failed: ${response.status}\n${errorText}`
    );
  }

  const json = await response.json();

  // Save new access token
  if (json.access_token) {
    await SecureStore.setItemAsync('dropboxAccessToken', json.access_token);
  }
  // Optionally update refresh token if Dropbox returns a new one
  if (json.refresh_token) {
    await SecureStore.setItemAsync('dropboxRefreshToken', json.refresh_token);
  }

  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in,
    tokenType: json.token_type,
    refreshToken: json.refresh_token || refreshToken, // use new or fallback to previous
  };
}
