import React from 'react';
import { Text, View } from 'react-native';

import { Colors } from '@/theme/colors';

export default function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ marginHorizontal: 20, marginTop: 20, marginBottom: 12 }}>
      <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: Colors.subtitle, fontSize: 12, marginTop: 4 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
