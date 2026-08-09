import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Header() {
  return (
    <View style={styles.container}>

      
      <View style={styles.leftSection}>

        
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>NA</Text>
        </View>

        
        <View style={styles.brandInfo}>
          <Text style={styles.brandName}>
            Nordic AbrenCare
          </Text>

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={8}
              color="#9CA3AF"
            />

            <Text style={styles.locationText}>
              Healthcare · Ethiopia
            </Text>
          </View>
        </View>

      </View>

      
      <TouchableOpacity style={styles.notificationButton}>
        <Ionicons
          name="notifications-outline"
          size={17}
          color="#D1D5DB"
        />

        
        <View style={styles.notificationDot} />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 58,
    backgroundColor: "#FAF9F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },

  
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  
  logoCircle: {
    width: 29,
    height: 29,
    borderRadius: 8,
    backgroundColor: "#DDA62E",
    alignItems: "center",
    justifyContent: "center",

    // Small shadow/elevation
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  /* Brand */
  brandInfo: {
    marginLeft: 8,
  },

  brandName: {
    color: "#DCA62D",
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 2,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationText: {
    color: "#9CA3AF",
    fontSize: 6.5,
    marginLeft: 2,
  },

  /* Notification */
  notificationButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: "#30363F",
    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "#3A414B",
  },

  notificationDot: {
    position: "absolute",
    top: 6,
    right: 7,

    width: 4,
    height: 4,
    borderRadius: 2,

    backgroundColor: "#DDA62E",
  },
});