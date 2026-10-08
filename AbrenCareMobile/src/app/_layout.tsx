import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '@/context/AuthContext';
import { AnimatedSplashOverlay } from '@/components/ui/animated-icon';
import { AppointmentsProvider } from '@/context/AppointmentsContext';
import { ReminderWatcher } from '@/components/watchers/ReminderWatcher';
import { VisitWatcher } from '@/components/watchers/VisitWatcher';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { VisitProvider } from '@/context/VisitContext';
import { landingFontMap } from '@/theme/loadLandingFonts';

SplashScreen.preventAutoHideAsync();

function ThemedNavigation() {
  const { isDark } = useAppTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <ReminderWatcher />
      <VisitWatcher />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useFonts(landingFontMap);

  return (
    <LanguageProvider>
      <AppThemeProvider>
        <AuthProvider>
          <AppointmentsProvider>
            <VisitProvider>
              <ThemedNavigation />
            </VisitProvider>
          </AppointmentsProvider>
        </AuthProvider>
      </AppThemeProvider>
    </LanguageProvider>
  );
}
