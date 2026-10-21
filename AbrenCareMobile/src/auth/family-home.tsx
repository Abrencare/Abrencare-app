import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import FamilyProfilePhoto from '@/components/family/FamilyProfilePhoto';
import Replace from '@/components/gates/Replace';
import ServiceBackButton from '@/components/navigation/ServiceBackButton';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';
import type { FamilyMember } from '@/types/auth';
import { memberSummary } from '@/utilities/familyMember';

export default function FamilyHomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, hasService, selectFamilyMember } = useAuth();
  const theme = useServiceTheme('family');
  const copy = t.familyAdd;
  const members = user?.familyMembers ?? [];

  if (!user || !hasService('family')) {
    return <Replace href="/signup?service=family" />;
  }

  if (!user.emailVerified) {
    return <Replace href="/verify-email" />;
  }

  if (members.length === 0) {
    return <Replace href="/family-setup" />;
  }

  function openMember(member: FamilyMember) {
    selectFamilyMember(member.id);
    router.replace({
      pathname: '/family',
      params: { member: member.id },
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <ServiceBackButton color={theme.accent} size={32} />
        </View>

        <Text style={[styles.kicker, { color: theme.accent }]}>
          {copy.selectKicker}
        </Text>
        <Text style={[styles.title, { color: theme.text }]}>
          {copy.selectTitle}
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {copy.selectSubtitle}
        </Text>

        <View style={styles.list}>
          {members.map((member) => (
            <Pressable
              key={member.id}
              onPress={() => openMember(member)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.pressed,
              ]}
            >
              <FamilyProfilePhoto size={48} />
              <View style={styles.cardCopy}>
                <Text style={[styles.name, { color: theme.text }]}>
                  {member.name}
                </Text>
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {memberSummary(member, copy)}
                </Text>
                <Text style={[styles.tapHint, { color: theme.accent }]}>
                  {copy.tapToOpen}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.accent} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() =>
            router.push({ pathname: '/family-setup', params: { add: '1' } })
          }
          style={({ pressed }) => [
            styles.addCard,
            { borderColor: theme.accent },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.plus, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name="add" size={22} color={theme.accent} />
          </View>
          <Text style={[styles.addTitle, { color: theme.text }]}>
            {copy.addAnother}
          </Text>
        </Pressable>

        <View style={styles.privacy}>
          <Ionicons name="lock-closed-outline" size={13} color={theme.muted} />
          <Text style={[styles.privacyText, { color: theme.muted }]}>
            {copy.privacy}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  topRow: {
    marginBottom: 18,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  list: {
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  pressed: { opacity: 0.88 },
  cardCopy: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    marginTop: 3,
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  addCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
  },
  plus: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  privacyText: {
    fontSize: 12,
  },
});
