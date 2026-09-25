import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BrandLogo from '@/components/ui/BrandLogo';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function Header() {
  const { t, language, setLanguage } = useLanguage();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <BrandLogo size={42} />
        <View>
          <Text style={[styles.brandName, { color: colors.text }]}>{t.header.brand}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color={colors.muted} />
            <Text style={[styles.locationText, { color: colors.muted }]}>{t.header.location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Pressable
          onPress={() => setLanguage(language === 'en' ? 'am' : 'en')}
          style={[
            styles.iconButton,
            { backgroundColor: colors.button, borderColor: colors.buttonBorder },
          ]}
        >
          <Text style={[styles.langText, { color: colors.text }]}>
            {language === 'en' ? 'EN' : 'አማ'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={[
            styles.iconButton,
            { backgroundColor: colors.button, borderColor: colors.buttonBorder },
          ]}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.icon} />
          <View style={[styles.notificationDot, { borderColor: colors.button }]} />
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

            <View style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.chip }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.gold} />
              </View>
              <View style={styles.menuCopy}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                  {t.header.appointmentTitle}
                </Text>
                <Text style={[styles.menuItemBody, { color: colors.muted }]}>
                  {t.header.appointmentBody}
                </Text>
              </View>
            </View>

            <View style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.chip }]}>
                <Ionicons name="heart-outline" size={16} color={colors.navActive} />
              </View>
              <View style={styles.menuCopy}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                  {t.header.careTitle}
                </Text>
                <Text style={[styles.menuItemBody, { color: colors.muted }]}>
                  {t.header.careBody}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <Pressable style={styles.toggleRow} onPress={toggleTheme}>
              <View style={[styles.menuIcon, { backgroundColor: colors.chip }]}>
                <Ionicons
                  name={isDark ? 'moon' : 'moon-outline'}
                  size={16}
                  color={colors.icon}
                />
              </View>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                {t.header.darkTheme}
              </Text>
              <Switch
                value={isDark}
                style={{ pointerEvents: 'none' }}
                trackColor={{ false: '#D5DDD8', true: '#1A4A42' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D5DDD8"
              />
            </Pressable>
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
  divider: {
    height: 1,
    marginVertical: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
});
