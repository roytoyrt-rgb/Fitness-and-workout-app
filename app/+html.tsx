import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Customizes the root HTML document for the web build - this is where PWA
// installability (manifest + iOS-specific meta tags) is wired up. Native
// builds don't use this file at all.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="description" content="A simple, high-protein macro tracker and meal planner." />

        {/* Base RN-web scroll styling, matches the native scroll feel. */}
        <ScrollViewStyleReset />

        {/* Installable as a home-screen app ("Add to Home Screen" on iOS). */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2a78d6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Simple Macros" />
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
