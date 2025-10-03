// types/UserProfile.ts

/**
 * UserProfile
 * - Used for both local-first and cloud-synced user profiles.
 * - `uid` is optional and only set when the user is authenticated (Firebase or other backend).
 * - Add additional fields as needed (e.g., avatar, preferences, etc.).
 */
export type UserProfile = {
  uid?: string;      // Firebase UID or other unique ID (set if/when user logs in or syncs)
  email?: string;    // User's email (if provided)
  name?: string;     // User's display name
  avatarUrl?: string; // User's avatar image URL
  // preferences?: Record<string, any>;
  [key: string]: any;
};
