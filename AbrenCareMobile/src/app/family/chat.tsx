import React from "react";
import {
  View,
 Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function FamilyChat() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="chevron-back" size={22} color="#444" />
        </TouchableOpacity>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>MT</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.name}>Marta Tesfaye</Text>
          <Text style={styles.subtitle}>
            Your coordinator · replies in 1hr
          </Text>
        </View>

        <View style={styles.onlineContainer}>
          <View style={styles.onlineDot} />
          <Text style={styles.online}>Online</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Incoming */}
        <View style={styles.messageRow}>
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarText}>MT</Text>
          </View>

          <View>
            <View style={styles.receiverBubble}>
              <Text style={styles.receiverText}>
                Good morning! Nurse Meron completed today's visit. I flagged
                the ankle swelling to Dr. Bekele.
              </Text>
            </View>

            <Text style={styles.timeLeft}>10:52 AM</Text>
          </View>
        </View>

        {/* Outgoing */}
        <View style={styles.myRow}>
          <View style={styles.myBubble}>
            <Text style={styles.myText}>
              Thank you Marta. When will we hear back?
            </Text>
          </View>

          <Text style={styles.timeRight}>11:04 AM</Text>
        </View>

        {/* Incoming */}
        <View style={styles.messageRow}>
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarText}>MT</Text>
          </View>

          <View>
            <View style={styles.receiverBubble}>
              <Text style={styles.receiverText}>
                Dr. Bekele will review and update you before 3pm today.
              </Text>
            </View>

            <Text style={styles.timeLeft}>11:06 AM</Text>
          </View>
        </View>
      </ScrollView>

      {/* Message Box */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type a message..."
          placeholderTextColor="#999"
          style={styles.input}
        />

        <TouchableOpacity style={styles.sendButton}>
          <Ionicons name="send" color="white" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F5F0",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 55,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#FFF",
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  avatarText: {
    color: "#B8F18D",
    fontWeight: "700",
    fontSize: 12,
  },

  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },

  subtitle: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },

  onlineContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 5,
  },

  online: {
    color: "#4CAF50",
    fontSize: 11,
  },

  chatArea: {
    flex: 1,
    padding: 15,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 18,
  },

  smallAvatar: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 4,
  },

  smallAvatarText: {
    color: "#B8F18D",
    fontSize: 8,
    fontWeight: "700",
  },

  receiverBubble: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    maxWidth: 270,
    elevation: 1,
  },

  receiverText: {
    color: "#374151",
    fontSize: 13,
    lineHeight: 18,
  },

  myRow: {
    alignItems: "flex-end",
    marginBottom: 18,
  },

  myBubble: {
    backgroundColor: "#91A887",
    padding: 12,
    borderRadius: 14,
    maxWidth: 260,
  },

  myText: {
    color: "#FFF",
    fontSize: 13,
    lineHeight: 18,
  },

  timeLeft: {
    fontSize: 10,
    color: "#AAA",
    marginTop: 4,
    marginLeft: 5,
  },

  timeRight: {
    fontSize: 10,
    color: "#AAA",
    marginTop: 4,
    marginRight: 5,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    backgroundColor: "#FFF",
  },

  input: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 45,
    fontSize: 14,
  },

  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#91A887",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});