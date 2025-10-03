// app/edit-recording/[id].tsx

import EditRecordingScreen from '@components/screens/EditRecordingScreen';

// This file simply renders your reusable edit screen.
// Expo Router automatically injects the [id] param, which your EditRecordingScreen reads via useLocalSearchParams.

export default function EditRecordingRoute() {
  return <EditRecordingScreen />;
}
