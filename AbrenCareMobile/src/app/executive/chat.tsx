import React, { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Avatar } from "@/components/executive/ExecutiveUI";
import { useLanguage } from "@/context/LanguageContext";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";

type Message = {
  id: string;
  mine: boolean;
  text: string;
  time: string;
};

export default function ExecutiveChat() {
  const c = useExecutiveTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const isNurse = params.who === "nurse";
  const person = isNurse
    ? {
        initials: "NS",
        tone: "slate" as const,
        name: t.executiveHome.nurseName,
        role: t.executiveHome.nurseRole,
      }
    : {
        initials: "HB",
        tone: "accent" as const,
        name: t.executiveHome.doctorName,
        role: t.executiveHome.doctorRole,
      };

  const copy = t.executiveChat;
  const nextId = useRef(4);

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", mine: false, text: copy.msg1, time: "18:42" },
    { id: "2", mine: true, text: copy.msg2, time: "18:44" },
    { id: "3", mine: false, text: copy.msg3, time: "18:45" },
  ]);

  const send = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;

    setMessages((current) => [
      ...current,
      { id: String(nextId.current++), mine: true, text, time },
    ]);
    setDraft("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </Pressable>

        <Avatar initials={person.initials} tone={person.tone} size={38} />

        <View style={styles.headerCopy}>
          <Text style={styles.headerName}>{person.name}</Text>

          <View style={styles.presenceRow}>
            <View style={styles.presenceDot} />
            <Text style={styles.presenceText}>{copy.online}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.callButton}
          onPress={() =>
            router.push({
              pathname: "/executive/call",
              params: { who: isNurse ? "nurse" : "doctor" },
            })
          }
        >
          <Ionicons name="call" size={17} color={c.onAccent} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.dayLabel}>{copy.todayLabel}</Text>

          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubbleRow, message.mine && styles.bubbleRowMine]}
            >
              <View
                style={[styles.bubble, message.mine && styles.bubbleMine]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    message.mine && styles.bubbleTextMine,
                  ]}
                >
                  {message.text}
                </Text>

                <Text
                  style={[
                    styles.bubbleTime,
                    message.mine && styles.bubbleTimeMine,
                  ]}
                >
                  {message.time}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.encryptedRow}>
            <Ionicons name="lock-closed" size={11} color={c.faint} />
            <Text style={styles.encryptedText}>{copy.encrypted}</Text>
          </View>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={copy.placeholder}
            placeholderTextColor={c.faint}
            style={styles.input}
            multiline
            onSubmitEditing={send}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.sent}
            style={[styles.sendButton, !draft.trim() && styles.sendButtonIdle]}
            onPress={send}
          >
            <Ionicons
              name="send"
              size={16}
              color={draft.trim() ? c.onAccent : c.faint}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(c: ExecutivePalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.page,
    },
    flex: {
      flex: 1,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: c.page,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCopy: {
      flex: 1,
    },
    headerName: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    presenceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 3,
    },
    presenceDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.success,
    },
    presenceText: {
      fontSize: 11,
      color: c.muted,
    },
    callButton: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },

    thread: {
      padding: 18,
      paddingBottom: 8,
    },
    dayLabel: {
      alignSelf: "center",
      fontSize: 11,
      fontWeight: "600",
      color: c.faint,
      marginBottom: 16,
    },
    bubbleRow: {
      flexDirection: "row",
      marginBottom: 12,
    },
    bubbleRowMine: {
      justifyContent: "flex-end",
    },
    bubble: {
      maxWidth: "82%",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
      borderRadius: 18,
      borderBottomLeftRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    bubbleMine: {
      backgroundColor: c.accent,
      borderColor: c.accent,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 6,
    },
    bubbleText: {
      fontSize: 13,
      lineHeight: 19,
      color: c.text,
    },
    bubbleTextMine: {
      color: c.onAccent,
    },
    bubbleTime: {
      fontSize: 10,
      color: c.faint,
      marginTop: 5,
      alignSelf: "flex-end",
    },
    bubbleTimeMine: {
      color: c.onAccent,
      opacity: 0.7,
    },
    encryptedRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      marginTop: 10,
    },
    encryptedText: {
      fontSize: 10,
      color: c.faint,
    },

    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
    },
    input: {
      flex: 1,
      maxHeight: 110,
      minHeight: 44,
      borderRadius: 16,
      backgroundColor: c.page,
      borderWidth: 1,
      borderColor: c.cardBorder,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      fontSize: 13,
      color: c.text,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonIdle: {
      backgroundColor: c.track,
    },
  });
}
