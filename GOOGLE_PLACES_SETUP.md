# Google Places API Setup for Multi-Step Save Recording Form

## 📍 What You Need:

To enable the location autocomplete feature in the multi-step save recording form, you need a **Google Places API key**.

## 🔑 How to Get Your API Key:

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it something like "Pray App" or "Encounter Tracker"

### Step 2: Enable Required APIs

**⚠️ CRITICAL:** You MUST enable these APIs BEFORE creating your API key. Otherwise they won't appear in the API restriction dropdown.

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "**Places API**" (not "Places API New")
3. Click on "Places API" and click **Enable**
4. Go back to Library, search for "**Geocoding API**"
5. Click on "Geocoding API" and click **Enable**
6. Wait for both to fully enable before proceeding to Step 3

## Step 3: Create an API Key

**Note:** Only do this AFTER enabling the APIs in Step 2.

1. In the left sidebar, go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **API key**
4. A dialog will appear with your new API key - **copy it immediately**
5. Click **Restrict Key** (recommended for security)

### Step 4: Secure Your API Key (Important!)
1. Click on your API key to edit it
2. Under "Application restrictions":
   - For development: Choose "None" (but add restrictions before production!)
   - For production: Choose "Android apps" or "iOS apps" and add your bundle IDs
3. Under "API restrictions":
   - Select "Restrict key"
   - Check **Places API** and **Geocoding API**
4. Save your changes

### Step 5: Add API Key to Your .env File
1. Open your `.env` file in the project root
2. Find the line:
   ```
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=YOUR_GOOGLE_API_KEY_HERE
   ```
3. Replace `YOUR_GOOGLE_API_KEY_HERE` with your actual API key:
   ```
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSyD...your-key-here
   ```
4. **Restart your Expo dev server** for the env variable to be loaded:
   ```bash
   # Stop the current server (Ctrl+C) then run:
   npx expo start -c
   ```

## 💰 Pricing Info:
- Google Places API has a **free tier**: $200/month credit
- Autocomplete requests: $2.83 per 1000 requests
- With free tier, you get ~70,000 free autocomplete requests per month
- For most apps, this is more than enough!

## 🧪 Testing:
Once you add your API key:
1. Record a new audio
2. Stop recording
3. On Step 2, start typing a city name
4. You should see autocomplete suggestions appear!

## 🗺️ Future Map View:
The form now saves `latitude` and `longitude` with each encounter, which will enable:
- Map view showing all your encounter locations
- Clustering of nearby encounters
- Visual journey of where God has met you

---

**Need help?** Check the [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
