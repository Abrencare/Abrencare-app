import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from './BottomTab.styles';

type BottomTabItem = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

type BottomTabProps = {
  items: BottomTabItem[];
};

export function BottomTab({ items }: BottomTabProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <TouchableOpacity key={item.label} onPress={item.onPress} style={styles.item}>
          <Text style={[styles.label, item.active && styles.activeLabel]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
