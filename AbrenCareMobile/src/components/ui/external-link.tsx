import { Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { createElement, type ReactNode } from 'react';

type Props = {
  href: string;
  children?: ReactNode;
};

export function ExternalLink({ href, children }: Props) {
  return createElement(
    Link as never,
    {
      href,
      target: '_blank',
      onPress: async (event: { preventDefault: () => void }) => {
        if (process.env.EXPO_OS !== 'web') {
          event.preventDefault();
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      },
    },
    children,
  );
}
