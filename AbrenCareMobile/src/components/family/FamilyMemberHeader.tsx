import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import FamilyProfilePhoto from '@/components/family/FamilyProfilePhoto';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useThemedStyles } from '@/theme/useThemedStyles';
import { activeFamilyMember } from '@/utilities/familyMember';

export default function FamilyMemberHeader() {
  const styles = useThemedStyles(baseStyles);
  const { user, selectFamilyMember } = useAuth();
  const { t } = useLanguage();
  const member = activeFamilyMember(user);
  const members = user?.familyMembers ?? [];
  const [open, setOpen] = useState(false);

  if (!member) {
    return null;
  }

  const age =
    member.ageYears !== null
      ? t.familyAdd.dobAge.replace('{age}', String(member.ageYears))
      : '';

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.row}
        onPress={() => {
          if (members.length > 1) {
            setOpen((current) => !current);
          }
        }}
      >
        <FamilyProfilePhoto size={48} />
        <View style={styles.info}>
          <Text style={styles.name}>{member.name}</Text>
          {age ? <Text style={styles.age}>{age}</Text> : null}
        </View>
        {members.length > 1 ? (
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#6F6A64" />
        ) : null}
      </Pressable>

      {open
        ? members.map((item) => {
            const selected = item.id === member.id;
            const itemAge =
              item.ageYears !== null
                ? t.familyAdd.dobAge.replace('{age}', String(item.ageYears))
                : '';
            return (
              <Pressable
                key={item.id}
                style={[styles.option, selected && styles.optionOn]}
                onPress={() => {
                  selectFamilyMember(item.id);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionName}>{item.name}</Text>
                {itemAge ? <Text style={styles.optionAge}>{itemAge}</Text> : null}
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6EAE2',
    padding: 14,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16332C',
  },
  age: {
    marginTop: 2,
    fontSize: 13,
    color: '#5C6B65',
  },
  option: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  optionOn: {
    backgroundColor: '#E7EEEA',
  },
  optionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16332C',
  },
  optionAge: {
    marginTop: 2,
    fontSize: 12,
    color: '#5C6B65',
  },
});
