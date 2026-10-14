import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BrandLogo from '@/components/ui/BrandLogo';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLandingType } from '@/theme/landingType';

type HeaderProps = {
  showBack?: boolean;
};

export function FamilyFlowHeader({ showBack = true }: HeaderProps) {
  const router = useRouter();
  const type = useLandingType('family');
  const { t, language, setLanguage } = useLanguage();
  const { colors } = useAppTheme();

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  }

  const brand = (
    <View style={styles.brandMark}>
      <BrandLogo size={32} />
      <Text style={[styles.brandName, { fontFamily: type.display, color: colors.text }]}>
        AbrenCare
      </Text>
    </View>
  );

  return (
    <View style={styles.topBar}>
      {showBack ? (
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.muted} />
        </Pressable>
      ) : (
        <Pressable onPress={goBack} style={styles.brandMark} hitSlop={8}>
          {brand}
        </Pressable>
      )}

      {showBack ? <View style={styles.brandCenter}>{brand}</View> : <View style={styles.flex} />}

      <Pressable
        onPress={() => setLanguage(language === 'en' ? 'am' : 'en')}
        hitSlop={8}
        style={styles.lang}
      >
        <Text
          style={[
            styles.langText,
            type.caption,
            { color: language === 'en' ? colors.text : colors.muted },
          ]}
        >
          EN
        </Text>
        <Text style={[styles.langDot, { color: colors.muted }]}>·</Text>
        <Text
          style={[
            styles.langText,
            type.caption,
            { color: language === 'am' ? colors.text : colors.muted },
          ]}
        >
          {t.common.amharic}
        </Text>
      </Pressable>
    </View>
  );
}

type Props = {
  children: ReactNode;
  showBack?: boolean;
};

export default function FamilyRequestChrome({ children, showBack = true }: Props) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.page }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FamilyFlowHeader showBack={showBack} />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  brandName: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  lang: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 40,
    justifyContent: 'flex-end',
  },
  langText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  langDot: {
    marginHorizontal: 5,
    fontSize: 12,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 36,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
});
