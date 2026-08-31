import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useLanguage } from '@/i18n/LanguageContext';

function formatDuration(seconds: number) {
  const minutes = `${Math.floor(seconds / 60)}`.padStart(2, '0');
  const rest = `${seconds % 60}`.padStart(2, '0');
  return `${minutes}:${rest}`;
}

export default function FamilyCall() {
  const router = useRouter();
  const { t } = useLanguage();

  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setConnected(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!connected) {
      return;
    }

    const interval = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [connected]);

  return (
    <View style={styles.container}>
      {/* Remote stream */}
      <View style={styles.stage}>
        <View style={styles.remoteAvatar}>
          <Text style={styles.remoteAvatarText}>MT</Text>
        </View>

        <Text style={styles.remoteName}>Marta Tesfaye</Text>
        <Text style={styles.status}>
          {connected ? formatDuration(seconds) : t.familyChat.callConnecting}
        </Text>

        <View style={styles.secureRow}>
          <Ionicons name="lock-closed" size={12} color="#8FE388" />
          <Text style={styles.secureText}>{t.familyChat.callSecure}</Text>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.familyChat.callTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Self view */}
      <View style={styles.selfView}>
        {cameraOn ? (
          <Text style={styles.selfViewText}>AT</Text>
        ) : (
          <Ionicons name="videocam-off" size={20} color="#9AA3AF" />
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <ControlButton
          icon={muted ? 'mic-off' : 'mic'}
          label={muted ? t.familyChat.callUnmute : t.familyChat.callMute}
          active={muted}
          onPress={() => setMuted((current) => !current)}
        />

        <ControlButton
          icon={cameraOn ? 'videocam' : 'videocam-off'}
          label={t.familyChat.callCamera}
          active={!cameraOn}
          onPress={() => setCameraOn((current) => !current)}
        />

        <ControlButton
          icon="camera-reverse"
          label={t.familyChat.callFlip}
          onPress={() => {}}
        />

        <View style={styles.control}>
          <TouchableOpacity
            style={[styles.controlCircle, styles.endCall]}
            onPress={() => router.back()}
          >
            <Ionicons name="call" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>{t.familyChat.callEnd}</Text>
        </View>
      </View>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.control}>
      <TouchableOpacity
        style={[styles.controlCircle, active && styles.controlCircleActive]}
        onPress={onPress}
      >
        <Ionicons
          name={icon}
          size={20}
          color={active ? '#1F2937' : '#FFFFFF'}
        />
      </TouchableOpacity>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16211B',
  },

  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  remoteAvatar: {
    width: 108,
    height: 108,
    borderRadius: 34,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  remoteAvatarText: {
    color: '#B8F18D',
    fontSize: 32,
    fontWeight: '700',
  },

  remoteName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  status: {
    color: '#A9B7A6',
    fontSize: 14,
    marginTop: 6,
  },

  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  secureText: {
    color: '#8FE388',
    fontSize: 11,
    fontWeight: '600',
  },

  header: {
    position: 'absolute',
    top: 55,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  headerSpacer: {
    width: 24,
  },

  selfView: {
    position: 'absolute',
    top: 110,
    right: 18,
    width: 84,
    height: 116,
    borderRadius: 16,
    backgroundColor: '#243B2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  selfViewText: {
    color: '#8FE388',
    fontSize: 18,
    fontWeight: '700',
  },

  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingBottom: 46,
    paddingTop: 20,
  },

  control: {
    alignItems: 'center',
    width: 72,
  },

  controlCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  controlCircleActive: {
    backgroundColor: '#FFFFFF',
  },

  endCall: {
    backgroundColor: '#D64545',
    transform: [{ rotate: '135deg' }],
  },

  controlLabel: {
    color: '#A9B7A6',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
});
