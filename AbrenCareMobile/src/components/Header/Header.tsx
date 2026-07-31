import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./Header.styles";

export default function Header() {
  return (
    <View style={styles.container}>

      <View style={styles.leftSection}>

        <View style={styles.logo}>
          <Text style={styles.logoText}>NA</Text>
        </View>

        <View>
          <Text style={styles.company}>
            Nordic Abrencare
          </Text>

          <Text style={styles.subtitle}>
            Healthcare • Ethiopia
          </Text>
        </View>

      </View>

      <TouchableOpacity style={styles.notification}>

        <Ionicons
          name="notifications-outline"
          size={22}
          color="#ffffff"
        />

      </TouchableOpacity>

    </View>
  );
}