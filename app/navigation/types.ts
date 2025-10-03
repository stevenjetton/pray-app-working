// navigation/types.ts (create this file)

import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

// Define the param list for drawer navigator routes
export type DrawerParamList = {
  // screens in the drawer navigator
  Home: undefined;
  VoiceRecorder: undefined;
  // Add others if needed...
};

// Define the param list for stack navigator routes
export type RootStackParamList = {
  VoiceRecorder: undefined;
  // other screens ...
};

// Compose navigation prop types that include both stack and drawer props 
export type VoiceRecorderNavigationProp = CompositeNavigationProp<
  StackNavigationProp<RootStackParamList, 'VoiceRecorder'>,
  DrawerNavigationProp<DrawerParamList>
>;
