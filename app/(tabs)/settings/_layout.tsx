// /app/(tabs)/settings/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: true 
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Settings" 
        }} 
      />
      <Stack.Screen 
        name="tags" 
        options={{ 
          title: "",
        }} 
      />
    </Stack>
  );
}
