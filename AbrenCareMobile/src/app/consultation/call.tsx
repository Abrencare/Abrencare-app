import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Replace from '@/components/gates/Replace';
import { initialsFor, useAuth } from '@/context/AuthContext';
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { doctorById, specialtyLabel } from '@/data/doctors';

function formatDuration(seconds: number) {
  const minutes = `${Math.floor(seconds / 60)}`.padStart(2, '0');
  const rest = `${seconds % 60}`.padStart(2, '0');
  return `${minutes}:${rest}`;
}

export default function ConsultationCall() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const { ready, consultationById, completeVisit } = useConsultations();
  const copy = t.consultationFlow;
  const id = typeof params.id === 'string' ? params.id : '';
  const consultation = consultationById(id);
  const doctor = consultation ? doctorById(consultation.doctorId) : null;
  const audio = consultation?.kind === 'audio';

  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(!audio);

  useEffect(() => {
    const timer = setTimeout(() => setConnected(true), 1600);
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

  if (!ready) {
    return null;
  }

  if (!consultation || !consultation.paid || !doctor) {
    return <Replace href="/consultation/mycare" />;
  }

  function endCall() {
    completeVisit(id);
    router.replace('/consultation/mycare');
  }

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <View style={styles.remoteAvatar}>
          <Text style={styles.remoteAvatarText}>{doctor.initials}</Text>
        </View>
        <Text style={styles.remoteName}>{doctor.name}</Text>
        <Text style={styles.remoteSpecialty}>{specialtyLabel(doctor.specialty, t)}</Text>
        <Text style={styles.status}>
          {connected ? formatDuration(seconds) : copy.connecting}
        </Text>
        <Text style={styles.secure}>{copy.inCall}</Text>
      </View>

      {!audio ? (
        <View style={styles.selfView}>
          {cameraOn ? (
            <Text style={styles.selfViewText}>{initialsFor(user)}</Text>
          ) : (
            <Ionicons name="videocam-off" size={20} color="#9AA3AF" />
          )}
        </View>
      ) : null}

      <View style={styles.controls}>
        <Control
          icon={muted ? 'mic-off' : 'mic'}
          label={muted ? t.consultationChat.callUnmute : t.consultationChat.callMute}
          active={muted}
          onPress={() => setMuted((current) => !current)}
        />
        {!audio ? (
          <Control
            icon={cameraOn ? 'videocam' : 'videocam-off'}
            label={t.consultationChat.callCamera}
            active={!cameraOn}
            onPress={() => setCameraOn((current) => !current)}
          />
        ) : null}
        <View style={styles.control}>
          <Pressable style={[styles.circle, styles.end]} onPress={endCall}>
            <Ionicons name="call" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.controlLabel}>{copy.endCall}</Text>
        </View>
      </View>
    </View>
  );
}

function Control({
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
      <Pressable
        style={[styles.circle, active && styles.circleActive]}
        onPress={onPress}
      >
        <Ionicons name={icon} size={20} color={active ? '#0F172A' : '#FFFFFF'} />
      </Pressable>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10221F' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remoteAvatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#1C3D38',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  remoteAvatarText: { color: '#8EDDD3', fontSize: 32, fontWeight: '700' },
  remoteName: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  remoteSpecialty: { color: '#A9C4BF', fontSize: 14, marginTop: 6 },
  status: { color: '#FFFFFF', fontSize: 16, marginTop: 16, fontWeight: '600' },
  secure: { color: '#8EDDD3', fontSize: 12, marginTop: 8 },
  selfView: {
    position: 'absolute',
    right: 18,
    top: 54,
    width: 84,
    height: 112,
    borderRadius: 16,
    backgroundColor: '#1C3D38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfViewText: { color: '#8EDDD3', fontWeight: '700', fontSize: 18 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 22,
    paddingBottom: 36,
  },
  control: { alignItems: 'center', gap: 8 },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A4A45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: { backgroundColor: '#FFFFFF' },
  end: { backgroundColor: '#E24B4A' },
  controlLabel: { color: '#D5E6E3', fontSize: 11 },
});
