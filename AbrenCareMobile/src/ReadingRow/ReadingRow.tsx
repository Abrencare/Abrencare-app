import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ReadingRowProps = {
  label: string;
  value: string;
  unit?: string;
};

export default function ReadingRow({ label, value, unit }: ReadingRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}{unit ? ` ${unit}` : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    color: '#4B5563',
    fontSize: 14,
  },
  value: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
});
