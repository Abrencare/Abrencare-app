import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '@/context/AuthContext';
import { AnimatedSplashOverlay } from '@/components/ui/animated-icon';
import { AppointmentsProvider } from '@/context/AppointmentsContext';
import { ReminderWatcher } from '@/components/watchers/ReminderWatcher';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppThemeProvider, useAppTheme } from '@/context/ThemeContext';

SplashScreen.preventAutoHideAsync();

function ThemedNavigation() {
  const { isDark } = useAppTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <ReminderWatcher />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AppThemeProvider>
        <AuthProvider>
          <AppointmentsProvider>
            <ThemedNavigation />
          </AppointmentsProvider>
        </AuthProvider>
      </AppThemeProvider>
    </LanguageProvider>
  );
}
