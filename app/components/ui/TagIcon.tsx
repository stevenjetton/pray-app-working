// app/components/ui/TagIcon.tsx

import React from 'react';
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native';

import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

export type IconFamily =
  | 'Ionicons'
  | 'MaterialCommunityIcons'
  | 'FontAwesome5'
  | 'MaterialIcons';

export type TagIconProps = {
  icon: string;
  iconFamily?: IconFamily;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle | ViewStyle | ImageStyle>;
  accessibilityIgnoresInvertColors?: boolean;
  accessibilityLabel?: string;
  [key: string]: any; // additional props forwarded to icon components
};

export default function TagIcon({
  icon,
  iconFamily = 'Ionicons',
  size = 20,
  color = '#000',
  style,
  accessibilityIgnoresInvertColors,
  accessibilityLabel,
  ...otherProps
}: TagIconProps) {
  // Fallback icon if no icon name is provided
  if (!icon) {
    return (
      <Ionicons
        name="pricetag-outline"
        size={size}
        color={color}
        style={style}
        accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}
        accessibilityLabel={accessibilityLabel}
        {...otherProps}
      />
    );
  }

  // Render the requested icon from the specified icon family
  switch (iconFamily) {
    case 'MaterialIcons':
      return (
        <MaterialIcons
          name={icon as any}
          size={size}
          color={color}
          style={style}
          accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}
          accessibilityLabel={accessibilityLabel}
          {...otherProps}
        />
      );
    case 'MaterialCommunityIcons':
      return (
        <MaterialCommunityIcons
          name={icon as any}
          size={size}
          color={color}
          style={style}
          accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}
          accessibilityLabel={accessibilityLabel}
          {...otherProps}
        />
      );
    case 'FontAwesome5':
      return (
        <FontAwesome5
          name={icon as any}
          size={size}
          color={color}
          style={style}
          accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}
          accessibilityLabel={accessibilityLabel}
          {...otherProps}
        />
      );
    case 'Ionicons':
    default:
      return (
        <Ionicons
          name={icon as any}
          size={size}
          color={color}
          style={style}
          accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}
          accessibilityLabel={accessibilityLabel}
          {...otherProps}
        />
      );
  }
}
