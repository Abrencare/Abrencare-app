import { useMemo, useRef, useState } from 'react';
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
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useLanguage } from '@/context/LanguageContext';
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from '@/theme/executiveTheme';

type Message = {
  id: string;
  mine: boolean;
  text: string;
  time: string;
};

function nowLabel() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
}

export default function ExecutivePreviewChat() {
  const c = useExecutiveTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { t } = useLanguage();
  const router = useRouter();
  const copy = t.executiveSignup;
  const nextId = useRef(2);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      mine: false,
      text: copy.previewMsg1,
      time: nowLabel(),
    },
  ]);

  const send = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }

    const time = nowLabel();
    const id = String(nextId.current++);
    setMessages((current) => [...current, { id, mine: true, text, time }]);
    setDraft('');

    setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: String(nextId.current++),
          mine: false,
          text: copy.previewMsg2,
          time: nowLabel(),
        },
      ]);
    }, 900);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace({ pathname: '/service', params: { service: 'executive' } });
          }}
          style={styles.back}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{copy.previewKicker}</Text>
          <Text style={styles.title}>{t.executiveHome.doctorName}</Text>
          <Text style={styles.role}>{t.executiveHome.doctorRole}</Text>
        </View>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/signup', params: { service: 'executive' } })
          }
          hitSlop={8}
        >
          <Text style={styles.headerCta}>{copy.submit}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.caption}>{copy.previewSubtitle}</Text>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}
            >
              <Text
                style={[styles.bubbleText, message.mine && styles.mineText]}
              >
                {message.text}
              </Text>
              <Text style={[styles.time, message.mine && styles.mineTime]}>
                {message.time}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t.executiveChat.placeholder}
            placeholderTextColor={c.faint}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={send}
            style={[styles.send, !draft.trim() && styles.sendOff]}
            disabled={!draft.trim()}
          >
            <Ionicons name="send" size={16} color={c.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(c: ExecutivePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.page },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.cardBorder,
    },
    back: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCopy: { flex: 1 },
    kicker: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.1,
      color: c.kicker,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
    },
    role: {
      fontSize: 12,
      color: c.muted,
    },
    headerCta: {
      fontSize: 12,
      fontWeight: '700',
      color: c.accent,
    },
    thread: {
      padding: 16,
      paddingBottom: 24,
      gap: 10,
    },
    caption: {
      fontSize: 13,
      lineHeight: 19,
      color: c.muted,
      marginBottom: 8,
    },
    bubble: {
      maxWidth: '84%',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    theirs: {
      alignSelf: 'flex-start',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    mine: {
      alignSelf: 'flex-end',
      backgroundColor: c.accent,
    },
    bubbleText: {
      fontSize: 14,
      lineHeight: 20,
      color: c.text,
    },
    mineText: { color: c.onAccent },
    time: {
      fontSize: 10,
      color: c.faint,
      marginTop: 6,
    },
    mineTime: { color: 'rgba(255,255,255,0.72)' },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.cardBorder,
      backgroundColor: c.page,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 110,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.text,
    },
    send: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendOff: { opacity: 0.4 },
  });
}
