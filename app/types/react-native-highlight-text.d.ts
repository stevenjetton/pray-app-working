declare module '@sanar/react-native-highlight-text' {
  import * as React from 'react';
  import { TextProps } from 'react-native';

  export interface HighlightTextProps extends TextProps {
    searchWords: string[];
    textToHighlight: string;
    highlightStyle?: TextProps['style'];
    sanitize?: (text: string) => string;
    caseSensitive?: boolean;
    autoEscape?: boolean;
    highlightComponent?: React.ComponentType<TextProps>;
    textComponent?: React.ComponentType<TextProps>;
  }

  const HighlightText: React.FC<HighlightTextProps>;

  export default HighlightText;
}
