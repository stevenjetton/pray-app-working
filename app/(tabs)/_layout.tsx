import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2f95dc',
        tabBarStyle: { backgroundColor: '#fff' },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <FontAwesome name="home" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerShown: true,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <FontAwesome name="dashboard" color={color} size={size} />
          ),
        }}
      />

      {/* ✅ VoiceRecorder tab — let VoiceRecorder.tsx supply its own headerRight from export const options */}
      <Tabs.Screen
        name="voiceRecorder"
        // no inline headerRight here — let the page's export const options run
        options={{
          title: 'Record',
          headerShown: true,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <FontAwesome name="microphone" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons
              name="person-circle-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
