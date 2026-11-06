import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BrandLogo, { BrandHomeLink } from '@/components/ui/BrandLogo';
import {
  FLOW_CHIP,
  FLOW_CHIP_BORDER,
  FLOW_INK,
  FLOW_MUTED,
} from '@/components/ui/FlowGlassHero';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useHomeNotifications } from '@/hooks/useHomeNotifications';

export default function Header({ tone = 'page' }: { tone?: 'page' | 'hero' }) {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { isSignedIn, user } = useAuth();
  const notices = useHomeNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasDot = notices.length > 0;
  const onHero = tone === 'hero';
  const ink = onHero ? FLOW_INK.family : colors.text;
  const muted = onHero ? FLOW_MUTED.family : colors.muted;
  const icon = onHero ? FLOW_INK.family : colors.icon;
  const button = onHero ? FLOW_CHIP : colors.button;
  const buttonBorder = onHero ? FLOW_CHIP_BORDER : colors.buttonBorder;

  function openNotice(href: string) {
    setMenuOpen(false);
    router.push(href as Parameters<typeof router.push>[0]);
  }

  return (
    <View style={styles.container}>
      <BrandHomeLink style={styles.leftSection}>
        <BrandLogo size={42} link={false} />
        <View>
          <Text style={[styles.brandName, { color: ink }]}>{t.header.brand}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color={muted} />
            <Text style={[styles.locationText, { color: muted }]}>{t.header.location}</Text>
          </View>
        </View>
      </BrandHomeLink>

      <View style={styles.rightSection}>
        <Pressable
          onPress={() => setLanguage(language === 'en' ? 'am' : 'en')}
          style={[
            styles.iconButton,
            { backgroundColor: button, borderColor: buttonBorder },
          ]}
        >
          <Text style={[styles.langText, { color: ink }]}>
            {language === 'en' ? 'EN' : 'አማ'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.header.darkTheme}
          onPress={toggleTheme}
          style={[
            styles.iconButton,
            { backgroundColor: button, borderColor: buttonBorder },
          ]}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={icon}
          />
        </Pressable>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={[
            styles.iconButton,
            { backgroundColor: button, borderColor: buttonBorder },
          ]}
        >
          <Ionicons name="notifications-outline" size={18} color={icon} />
          {hasDot ? (
            <View style={[styles.notificationDot, { borderColor: colors.button }]} />
          ) : null}
        </Pressable>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            style={[
              styles.dropdown,
              { backgroundColor: colors.dropdown, borderColor: colors.dropdownBorder },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.menuTitle, { color: colors.muted }]}>
              {t.header.notifications}
            </Text>

            {notices.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="notifications-off-outline" size={22} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t.header.caughtUp}
                </Text>
                {!isSignedIn || !user?.services.length ? (
                  <Text style={[styles.emptyBody, { color: colors.muted }]}>
                    {t.header.emptyHint}
                  </Text>
                ) : null}
              </View>
            ) : (
              <ScrollView
                style={styles.noticeList}
                showsVerticalScrollIndicator={false}
              >
                {notices.map((notice) => (
                  <Pressable
                    key={notice.id}
                    style={styles.menuItem}
                    onPress={() => openNotice(notice.href)}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: colors.chip }]}>
                      <Ionicons name={notice.icon} size={16} color={notice.color} />
                    </View>
                    <View style={styles.menuCopy}>
                      <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                        {notice.title}
                      </Text>
                      <Text style={[styles.menuItemBody, { color: colors.muted }]}>
                        {notice.body}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
    zIndex: 20,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  iconButton: {
    minWidth: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#C4A05A',
    borderWidth: 1.5,
  },
  overlay: {
    flex: 1,
    paddingTop: 72,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  dropdown: {
    width: 292,
    maxHeight: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  noticeList: {
    maxHeight: 340,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  menuItemBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
