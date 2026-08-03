import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InfoChip({ label }: { label: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E5F6FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: '#1B6EA5',
    fontWeight: '600',
    fontSize: 12,
  },
});
