import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/context/AuthContext';
import { AnimatedSplashOverlay } from '@/components/ui/animated-icon';
import { AppointmentsProvider } from '@/context/AppointmentsContext';
import { ReminderWatcher } from '@/components/watchers/ReminderWatcher';
import { LanguageProvider } from '@/context/LanguageContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <LanguageProvider>
      <AuthProvider>
        <AppointmentsProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            <ReminderWatcher />
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </AppointmentsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
