import * as SecureStore from 'expo-secure-store';

export const STORAGE_DROPBOX_ACCESS_TOKEN = 'dropboxAccessToken';
export const STORAGE_DROPBOX_REFRESH_TOKEN = 'dropboxRefreshToken';

export async function saveDropboxTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(STORAGE_DROPBOX_ACCESS_TOKEN, accessToken);
  await SecureStore.setItemAsync(STORAGE_DROPBOX_REFRESH_TOKEN, refreshToken);
}

export async function loadDropboxTokens() {
  const accessToken = await SecureStore.getItemAsync(STORAGE_DROPBOX_ACCESS_TOKEN);
  const refreshToken = await SecureStore.getItemAsync(STORAGE_DROPBOX_REFRESH_TOKEN);
  return { accessToken, refreshToken };
}

export async function clearDropboxTokens() {
  await SecureStore.deleteItemAsync(STORAGE_DROPBOX_ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(STORAGE_DROPBOX_REFRESH_TOKEN);
}
