import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard, glassTints } from "@/components/executive/GlassCard";
import ServiceBackButton from "@/components/navigation/ServiceBackButton";
import BrandLogo, { BrandHomeLink } from "@/components/ui/BrandLogo";
import {
  fromDateKey,
  toDateKey,
  useAppointments,
} from "@/context/AppointmentsContext";
import { useExecutiveAlerts } from "@/context/ExecutiveAlertsContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAppTheme } from "@/context/ThemeContext";
import { useLandingType } from "@/theme/landingType";
import {
  useExecutiveTheme,
  type ExecutivePalette,
} from "@/theme/executiveTheme";
import {
  REMINDER_OPTIONS,
  TIME_SLOTS,
  formatDateKey,
  monthGrid,
  reminderLabel,
} from "@/utilities/familyFormat";

// Alert.alert does nothing on web, so fall back to the browser dialog there.
function notify(title: string, body: string, okLabel: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(`${title}\n\n${body}`);
    }
    return;
  }
  Alert.alert(title, body, [{ text: okLabel }]);
}

function timeRange(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours)) {
    return time;
  }
  const endHour = (hours + 1) % 24;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes || 0)} - ${pad(endHour)}:${pad(minutes || 0)}`;
}

const HERO_PHOTO = require("@/assets/images/executive-hero-bg.jpg");
const DOCTOR_PHOTO = require("@/assets/images/executive-doctor-portrait.jpg");
const COORDINATOR_PHOTO = require("@/assets/images/executive-sarah-portrait.jpg");

export default function ExecutiveConsultation() {
  const c = useExecutiveTheme();
  const { isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);
  const type = useLandingType("executive");
  const { t } = useLanguage();
  const { unreadCount } = useExecutiveAlerts();
  const {
    appointments,
    nextAppointment,
    bookAppointment,
    cancelAppointment,
    approveAppointment,
    setReminder,
    isSlotTaken,
  } = useAppointments();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [provider, setProvider] = useState<"doctor" | "nurse" | null>(null);

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  // Appointment currently being moved to a new date/time (null = normal booking).
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  // The old appointment is removed after the new one is saved, on the next render,
  // so the context never has to apply two updates from the same stale list.
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const bodyY = useRef(0);
  const calendarY = useRef(0);

  useEffect(() => {
    if (pendingRemoveId) {
      cancelAppointment(pendingRemoveId);
      setPendingRemoveId(null);
    }
  }, [pendingRemoveId, cancelAppointment]);

  const copy = t.executiveConsult;
  const home = t.executiveHome;
  const glass = glassTints(isDark);
  const cells = monthGrid(viewMonth.getFullYear(), viewMonth.getMonth());
  const canGoBack =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() &&
      viewMonth.getMonth() > today.getMonth());

  const executiveAppointments = appointments.filter(
    (item) => item.type === "doctorVisit" || item.type === "nurseCheck",
  );
  const nextExecutive =
    executiveAppointments.find((item) => item.id === nextAppointment?.id) ??
    executiveAppointments[0] ??
    null;

  const specialists = [
    {
      key: "doctor" as const,
      photo: DOCTOR_PHOTO,
      name: home.doctorName,
      role: home.doctorRole,
    },
    {
      key: "nurse" as const,
      photo: COORDINATOR_PHOTO,
      name: home.nurseName,
      role: home.nurseRole,
    },
  ];

  const openChat = (who: "doctor" | "nurse") =>
    router.push({ pathname: "/executive/chat", params: { who } });

  const joinCall = () =>
    router.push({ pathname: "/executive/call", params: { who: "doctor" } });

  const openAlerts = () => router.push("/executive/alerts");

  function shiftMonth(step: number) {
    setViewMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + step, 1),
    );
  }

  const reschedulingAppointment = reschedulingId
    ? (appointments.find((item) => item.id === reschedulingId) ?? null)
    : null;

  const bookSlot = () => {
    if (!provider || !selectedTime) {
      notify(copy.title, copy.selectPrompt, copy.ok);
      return;
    }

    const specialist = specialists.find((item) => item.key === provider);
    bookAppointment({
      date: selectedDate,
      time: selectedTime,
      type: provider === "doctor" ? "doctorVisit" : "nurseCheck",
      withName: specialist?.name ?? home.doctorName,
      // Keep the reminder the person already chose when moving a visit.
      reminderMinutes: reschedulingAppointment
        ? reschedulingAppointment.reminderMinutes
        : 60,
      // A moved visit needs to be confirmed again for the new time.
      status: "pending",
    });

    if (reschedulingAppointment) {
      setPendingRemoveId(reschedulingAppointment.id);
      setReschedulingId(null);
    }
    setSelectedTime(null);
    notify(copy.requestedTitle, copy.requestedBody, copy.ok);
  };

  // Start moving an existing visit: load its details into the picker and bring
  // the calendar into view so the person can choose a new date and time.
  const reschedule = (appointment: (typeof appointments)[number]) => {
    const original = fromDateKey(appointment.date);
    const start = original < today ? today : original;

    setReschedulingId(appointment.id);
    setProvider(appointment.type === "nurseCheck" ? "nurse" : "doctor");
    setSelectedTime(null);
    setSelectedDate(toDateKey(start));
    setViewMonth(new Date(start.getFullYear(), start.getMonth(), 1));

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, bodyY.current + calendarY.current - 12),
        animated: true,
      });
    }, 50);
  };

  const stopRescheduling = () => {
    setReschedulingId(null);
    setSelectedTime(null);
  };

  function handleCancel(id: string) {
    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined" &&
        window.confirm(
          `${t.familyAppointments.cancelTitle}\n\n${t.familyAppointments.cancelMessage}`,
        );
      if (confirmed) {
        cancelAppointment(id);
      }
      return;
    }

    Alert.alert(
      t.familyAppointments.cancelTitle,
      t.familyAppointments.cancelMessage,
      [
        { text: t.familyAppointments.keep, style: "cancel" },
        {
          text: t.familyAppointments.confirmCancel,
          style: "destructive",
          onPress: () => cancelAppointment(id),
        },
      ],
    );
  }

  function cycleReminder(id: string, current: number | null) {
    const index = REMINDER_OPTIONS.indexOf(current);
    const next = REMINDER_OPTIONS[(index + 1) % REMINDER_OPTIONS.length];
    setReminder(id, next);
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <Image
          source={HERO_PHOTO}
          style={styles.heroPhoto}
          resizeMode="cover"
        />

        <LinearGradient
          colors={[c.hero, withAlpha(c.hero, 0.94), withAlpha(c.hero, 0.42)]}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.heroFade}
        />

        <View style={styles.heroTopRow}>
          <View style={styles.brandRow}>
            <ServiceBackButton
              color={c.heroText}
              background={c.heroChip}
              borderColor={c.heroChipBorder}
              size={32}
            />
            <BrandHomeLink style={styles.brandLink}>
              <BrandLogo size={34} link={false} />
              <Text style={styles.wordmark}>{t.auth.brand}</Text>
            </BrandHomeLink>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.header.notifications}
            style={styles.bellButton}
            onPress={openAlerts}
          >
            <Ionicons
              name="notifications-outline"
              size={19}
              color={c.heroText}
            />
            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <Text style={[styles.heroKicker, { fontFamily: type.sansSemi }]}>
          {home.kicker}
        </Text>
        <Text style={[styles.heroTitle, { fontFamily: type.display }]}>
          {copy.title}
        </Text>
        <Text style={[styles.heroSubtitle, { fontFamily: type.sans }]}>
          {copy.subtitle}
        </Text>
      </View>

      <View
        style={styles.body}
        onLayout={(e) => {
          bodyY.current = e.nativeEvent.layout.y;
        }}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionKicker, { fontFamily: type.sansSemi }]}>
            {t.familyAppointments.upcomingTitle}
          </Text>
          <Text style={[styles.upcomingSub, { fontFamily: type.sans }]}>
            {t.familyAppointments.upcomingSub}
          </Text>
        </View>

        {executiveAppointments.length === 0 ? (
          <GlassCard
            tint={glass.card}
            border={glass.border}
            sheen={glass.sheen}
          >
            <Text style={[styles.empty, { fontFamily: type.sans }]}>
              {t.familyAppointments.empty}
            </Text>
          </GlassCard>
        ) : (
          executiveAppointments.map((appointment) => {
            const when = fromDateKey(appointment.date);
            const approved = appointment.status === "approved";
            const isNext = nextExecutive?.id === appointment.id;

            return (
              <GlassCard
                key={appointment.id}
                tint={glass.card}
                border={glass.border}
                sheen={glass.sheen}
                style={styles.visitCard}
              >
                <View style={styles.dateBox}>
                  <Text
                    style={[styles.dateBoxDay, { fontFamily: type.sansSemi }]}
                  >
                    {when.getDate()}
                  </Text>
                  <Text
                    style={[styles.dateBoxMonth, { fontFamily: type.sansSemi }]}
                  >
                    {t.calendar.months[when.getMonth()].slice(0, 3)}
                  </Text>
                </View>

                <View style={styles.appointmentInfo}>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusChip,
                        approved ? styles.statusApproved : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          { fontFamily: type.sansSemi },
                          approved
                            ? styles.statusApprovedText
                            : styles.statusPendingText,
                        ]}
                      >
                        {approved
                          ? t.familyAppointments.statusApproved
                          : t.familyAppointments.statusPending}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.appointmentType, { fontFamily: type.sansSemi }]}
                  >
                    {t.familyAppointments.types[appointment.type]}
                  </Text>
                  <Text style={[styles.appointmentMeta, { fontFamily: type.sans }]}>
                    {formatDateKey(appointment.date, t)} ·{" "}
                    {timeRange(appointment.time)}
                  </Text>
                  <Text style={[styles.appointmentMeta, { fontFamily: type.sans }]}>
                    {appointment.withName}
                  </Text>

                  <AppointmentProgress approved={approved} c={c} />
                  <Text style={[styles.progressNote, { fontFamily: type.sans }]}>
                    {approved
                      ? t.familyAppointments.approvedNote
                      : t.familyAppointments.pendingNote}
                  </Text>

                  {!approved ? (
                    <TouchableOpacity
                      style={styles.approveChip}
                      activeOpacity={0.85}
                      onPress={() => approveAppointment(appointment.id)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color={c.success}
                      />
                      <Text
                        style={[
                          styles.approveChipText,
                          { fontFamily: type.sansSemi },
                        ]}
                      >
                        {t.familyAppointments.statusApproved}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <View style={styles.appointmentActions}>
                    <TouchableOpacity
                      style={[
                        styles.reminderChip,
                        appointment.reminderMinutes !== null &&
                          styles.reminderChipOn,
                      ]}
                      activeOpacity={0.85}
                      onPress={() =>
                        cycleReminder(
                          appointment.id,
                          appointment.reminderMinutes,
                        )
                      }
                    >
                      <Ionicons
                        name={
                          appointment.reminderMinutes !== null
                            ? "notifications-outline"
                            : "notifications-off-outline"
                        }
                        size={12}
                        color={c.accent}
                      />
                      <Text
                        style={[
                          styles.reminderChipText,
                          { fontFamily: type.sansSemi },
                        ]}
                      >
                        {reminderLabel(appointment.reminderMinutes, t)}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      activeOpacity={0.85}
                      onPress={() => handleCancel(appointment.id)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={13}
                        color={c.danger}
                      />
                      <Text
                        style={[styles.cancelText, { fontFamily: type.sansSemi }]}
                      >
                        {t.familyAppointments.cancel}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {approved ? (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.goldButton}
                        activeOpacity={0.85}
                        onPress={joinCall}
                      >
                        <Ionicons
                          name="videocam-outline"
                          size={14}
                          color={c.onAccent}
                        />
                        <Text
                          style={[
                            styles.goldButtonText,
                            { fontFamily: type.sansSemi },
                          ]}
                        >
                          {copy.joinCall}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.outlineButton}
                        activeOpacity={0.85}
                        onPress={() => reschedule(appointment)}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color={c.accent}
                        />
                        <Text
                          style={[
                            styles.outlineButtonText,
                            { fontFamily: type.sansSemi },
                          ]}
                        >
                          {copy.reschedule}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : isNext ? (
                    <TouchableOpacity
                      style={[styles.outlineButton, styles.fullAction]}
                      activeOpacity={0.85}
                      onPress={() => reschedule(appointment)}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={c.accent}
                      />
                      <Text
                        style={[
                          styles.outlineButtonText,
                          { fontFamily: type.sansSemi },
                        ]}
                      >
                        {copy.reschedule}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </GlassCard>
            );
          })
        )}

        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
        >
          <View style={styles.kickerRow}>
            <Ionicons name="people-outline" size={15} color={c.accent} />
            <Text style={[styles.kicker, { fontFamily: type.sansSemi }]}>
              {copy.chooseTitle}
            </Text>
          </View>
          <Text style={[styles.sectionLead, { fontFamily: type.sans }]}>
            {copy.chooseSubtitle}
          </Text>

          {specialists.map((person, index) => {
            const selected = provider === person.key;

            return (
              <View
                key={person.key}
                style={[
                  styles.personRow,
                  index > 0 && styles.personRowDivided,
                  selected && styles.personRowSelected,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={person.name}
                  onPress={() => setProvider(person.key)}
                  style={styles.personSelect}
                >
                  <Image
                    source={person.photo}
                    style={styles.personPhoto}
                    resizeMode="cover"
                  />
                  <View style={styles.flexCopy}>
                    <Text
                      style={[styles.personName, { fontFamily: type.sansSemi }]}
                    >
                      {person.name}
                    </Text>
                    <Text style={[styles.personRole, { fontFamily: type.sans }]}>
                      {person.role}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${home.message} ${person.name}`}
                  style={styles.messageButton}
                  onPress={() => openChat(person.key)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={13}
                    color={c.accent}
                  />
                  <Text
                    style={[
                      styles.messageButtonText,
                      { fontFamily: type.sansSemi },
                    ]}
                  >
                    {home.message}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </GlassCard>

        <View
          onLayout={(e) => {
            calendarY.current = e.nativeEvent.layout.y;
          }}
        >
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
        >
          <View style={styles.kickerRow}>
            <Ionicons name="calendar-outline" size={15} color={c.accent} />
            <Text style={[styles.kicker, { fontFamily: type.sansSemi }]}>
              {t.familyAppointments.chooseDate}
            </Text>
          </View>
          <Text style={[styles.sectionLead, { fontFamily: type.sans }]}>
            {copy.slotsSubtitle}
          </Text>

          {reschedulingAppointment ? (
            <View style={styles.rescheduleBanner}>
              <Ionicons name="swap-horizontal" size={16} color={c.accent} />
              <View style={styles.flexCopy}>
                <Text
                  style={[styles.rescheduleTitle, { fontFamily: type.sansSemi }]}
                >
                  {copy.rescheduleTitle}
                </Text>
                <Text style={[styles.rescheduleBody, { fontFamily: type.sans }]}>
                  {t.familyAppointments.types[reschedulingAppointment.type]} ·{" "}
                  {formatDateKey(reschedulingAppointment.date, t)} ·{" "}
                  {timeRange(reschedulingAppointment.time)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={stopRescheduling}
              >
                <Ionicons name="close" size={18} color={c.muted} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.calendarHeader}>
            <Pressable
              onPress={() => shiftMonth(-1)}
              disabled={!canGoBack}
              hitSlop={10}
              style={!canGoBack ? styles.arrowDisabled : undefined}
            >
              <Ionicons name="chevron-back" size={18} color={c.text} />
            </Pressable>
            <Text style={[styles.calendarMonth, { fontFamily: type.sansSemi }]}>
              {t.calendar.months[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={10}>
              <Ionicons name="chevron-forward" size={18} color={c.text} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {t.calendar.weekdaysShort.map((weekday) => (
              <Text
                key={weekday}
                style={[styles.weekday, { fontFamily: type.sansSemi }]}
              >
                {weekday}
              </Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {cells.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const date = new Date(
                viewMonth.getFullYear(),
                viewMonth.getMonth(),
                day,
              );
              const key = toDateKey(date);
              const past = date < today;
              const active = key === selectedDate;

              return (
                <View key={key} style={styles.dayCell}>
                  <Pressable
                    disabled={past}
                    onPress={() => {
                      setSelectedDate(key);
                      setSelectedTime(null);
                    }}
                    style={[styles.day, active && styles.dayActive]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { fontFamily: type.sansSemi },
                        past && styles.dayTextPast,
                        active && styles.dayTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Text
            style={[
              styles.kicker,
              styles.timeKicker,
              { fontFamily: type.sansSemi },
            ]}
          >
            {t.familyAppointments.chooseTime}
          </Text>
          <Text style={[styles.selectedDateLabel, { fontFamily: type.sans }]}>
            {formatDateKey(selectedDate, t)}
          </Text>

          <View style={styles.slotWrap}>
            {TIME_SLOTS.map((option) => {
              const taken = isSlotTaken(selectedDate, option);
              const selected = selectedTime === option;

              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  disabled={taken}
                  onPress={() => setSelectedTime(option)}
                  style={[
                    styles.slot,
                    selected && styles.slotActive,
                    taken && styles.slotTaken,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotLabel,
                      { fontFamily: type.sansSemi },
                      selected && styles.slotLabelActive,
                      taken && styles.slotLabelTaken,
                    ]}
                  >
                    {option}
                  </Text>
                  {taken ? (
                    <Text style={[styles.slotTakenLabel, { fontFamily: type.sans }]}>
                      {t.familyAppointments.taken}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            style={[
              styles.goldButton,
              styles.confirmButton,
              (!provider || !selectedTime) && styles.confirmDisabled,
            ]}
            disabled={!provider || !selectedTime}
            onPress={bookSlot}
          >
            <Text
              style={[
                styles.goldButtonText,
                styles.confirmButtonText,
                { fontFamily: type.sansSemi },
              ]}
            >
              {selectedTime
                ? `${reschedulingAppointment ? copy.reschedule : copy.request} · ${formatDateKey(selectedDate, t)} ${selectedTime}`
                : reschedulingAppointment
                  ? copy.reschedule
                  : copy.request}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={c.onAccent} />
          </Pressable>

          <View style={styles.noteRow}>
            <Ionicons name="home-outline" size={14} color={c.faint} />
            <Text style={[styles.note, { fontFamily: type.sans }]}>
              {copy.visitNote}
            </Text>
          </View>
        </GlassCard>
        </View>
      </View>
    </ScrollView>
  );
}

function AppointmentProgress({
  approved,
  c,
}: {
  approved: boolean;
  c: ExecutivePalette;
}) {
  const { t } = useLanguage();
  const steps = [
    t.familyAppointments.progressRequested,
    t.familyAppointments.progressPending,
    t.familyAppointments.progressApproved,
  ] as const;
  const activeIndex = approved ? 2 : 1;

  return (
    <View style={progressStyles.progressRow}>
      {steps.map((label, index) => {
        const done = index <= activeIndex;
        const current = index === activeIndex;
        return (
          <View key={label} style={progressStyles.progressStep}>
            <View style={progressStyles.progressTrack}>
              {index > 0 ? (
                <View
                  style={[
                    progressStyles.progressLine,
                    {
                      backgroundColor:
                        index <= activeIndex ? c.accent : c.divider,
                    },
                  ]}
                />
              ) : (
                <View style={progressStyles.progressLineSpacer} />
              )}
              <View
                style={[
                  progressStyles.progressDot,
                  {
                    backgroundColor: done ? c.accent : c.divider,
                    transform: current ? [{ scale: 1.15 }] : undefined,
                  },
                ]}
              />
              {index < steps.length - 1 ? (
                <View
                  style={[
                    progressStyles.progressLine,
                    {
                      backgroundColor:
                        index < activeIndex ? c.accent : c.divider,
                    },
                  ]}
                />
              ) : (
                <View style={progressStyles.progressLineSpacer} />
              )}
            </View>
            <Text
              style={[
                progressStyles.progressLabel,
                { color: current ? c.text : done ? c.muted : c.faint },
                current && progressStyles.progressLabelCurrent,
              ]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 6,
  },
  progressStep: {
    flex: 1,
    alignItems: "center",
  },
  progressTrack: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 6,
  },
  progressLine: {
    flex: 1,
    height: 2,
  },
  progressLineSpacer: {
    flex: 1,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  progressLabelCurrent: {
    fontWeight: "700",
  },
});

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createStyles(c: ExecutivePalette, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.page,
    },
    content: {
      paddingBottom: 88,
    },
    hero: {
      backgroundColor: c.hero,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      paddingHorizontal: 20,
      paddingBottom: 56,
      overflow: "hidden",
    },
    heroPhoto: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    heroFade: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 26,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    brandLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    wordmark: {
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: 1.6,
      color: c.heroText,
    },
    bellButton: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: c.heroChip,
      borderWidth: 1,
      borderColor: c.heroChipBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    bellBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      backgroundColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    bellBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    heroKicker: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.6,
      color: c.kicker,
      marginBottom: 8,
    },
    heroTitle: {
      fontSize: 32,
      color: c.heroText,
      letterSpacing: -0.6,
    },
    heroSubtitle: {
      fontSize: 14,
      color: c.heroMuted,
      lineHeight: 20,
      marginTop: 6,
      maxWidth: 300,
    },
    body: {
      paddingHorizontal: 16,
      marginTop: -38,
      gap: 14,
    },
    // Heading block for "Requested and confirmed visits". It sits below the
    // hero curve (38px overlap + 14px breathing room) and lines up with the
    // text inside the cards; the body `gap` handles the space before the cards.
    sectionHeader: {
      marginTop: 52,
      paddingHorizontal: 4,
    },
    split: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    flexCopy: {
      flex: 1,
      minWidth: 0,
    },
    kickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 8,
    },
    kicker: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: c.accent,
      textTransform: "uppercase",
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      lineHeight: 22,
    },
    when: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      marginTop: 4,
    },
    cardBody: {
      fontSize: 12,
      color: c.muted,
      lineHeight: 17,
      marginTop: 3,
    },
    sectionLead: {
      fontSize: 13,
      color: c.muted,
      lineHeight: 18,
      marginBottom: 4,
    },
    dateBadge: {
      width: 72,
      borderRadius: 18,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.14)"
        : "rgba(255,255,255,0.55)",
      borderWidth: 1,
      borderColor: isDark ? c.accentBorder : "rgba(196, 160, 90, 0.35)",
    },
    dateMonth: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: c.accent,
    },
    dateDay: {
      fontSize: 26,
      color: c.text,
      lineHeight: 30,
      marginTop: 2,
    },
    dateWeek: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      color: c.accent,
      marginTop: 2,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    cardActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    fullAction: {
      marginTop: 10,
    },
    goldButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: c.accent,
      borderRadius: 18,
      paddingVertical: 9,
      paddingHorizontal: 8,
    },
    goldButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.onAccent,
    },
    outlineButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: c.accent,
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.08)"
        : "rgba(255,255,255,0.35)",
      paddingVertical: 9,
      paddingHorizontal: 8,
    },
    outlineButtonText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
    },
    personRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 8,
      marginHorizontal: -8,
      borderRadius: 18,
    },
    personSelect: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minWidth: 0,
    },
    personRowDivided: {
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    personRowSelected: {
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.12)"
        : "rgba(196, 160, 90, 0.1)",
    },
    personPhoto: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    personName: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    personRole: {
      fontSize: 12,
      color: c.muted,
      marginTop: 2,
    },
    messageButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: c.accent,
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.08)"
        : "rgba(255,255,255,0.35)",
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    messageButtonText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.accent,
    },
    calendarHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
      marginBottom: 10,
    },
    calendarMonth: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    arrowDisabled: {
      opacity: 0.35,
    },
    weekdayRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    weekday: {
      flex: 1,
      textAlign: "center",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.4,
      color: c.faint,
    },
    dayGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dayCell: {
      width: "14.2857%",
      alignItems: "center",
      paddingVertical: 4,
    },
    day: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    dayActive: {
      backgroundColor: c.accent,
    },
    dayText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
    },
    dayTextPast: {
      color: c.faint,
      opacity: 0.5,
    },
    dayTextActive: {
      color: c.onAccent,
    },
    timeKicker: {
      marginTop: 16,
      marginBottom: 4,
    },
    selectedDateLabel: {
      fontSize: 12,
      color: c.muted,
      marginBottom: 8,
    },
    slotWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    slot: {
      minWidth: "30%",
      flexGrow: 1,
      alignItems: "center",
      paddingVertical: 11,
      paddingHorizontal: 8,
      borderRadius: 18,
      backgroundColor: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(255,255,255,0.55)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
    },
    slotActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    slotTaken: {
      opacity: 0.45,
    },
    slotLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
    },
    slotLabelActive: {
      color: c.onAccent,
    },
    slotLabelTaken: {
      color: c.faint,
    },
    slotTakenLabel: {
      fontSize: 9,
      color: c.faint,
      marginTop: 2,
    },
    // Full-size action button, same height as the primary buttons elsewhere.
    confirmButton: {
      marginTop: 16,
      flex: 0,
      minHeight: 52,
      borderRadius: 26,
      paddingVertical: 14,
      paddingHorizontal: 20,
      gap: 8,
    },
    confirmButtonText: {
      fontSize: 14,
    },
    rescheduleBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 8,
      marginBottom: 4,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: isDark
        ? "rgba(196, 160, 90, 0.12)"
        : "rgba(196, 160, 90, 0.1)",
    },
    rescheduleTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: c.text,
    },
    rescheduleBody: {
      fontSize: 11,
      color: c.muted,
      lineHeight: 15,
      marginTop: 2,
    },
    confirmDisabled: {
      opacity: 0.45,
    },
    noteRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 14,
    },
    note: {
      flex: 1,
      fontSize: 11,
      color: c.faint,
      lineHeight: 16,
    },
    sectionKicker: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1,
      color: c.muted,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    upcomingSub: {
      fontSize: 13,
      lineHeight: 18,
      color: c.muted,
    },
    empty: {
      fontSize: 13,
      color: c.faint,
      lineHeight: 19,
      paddingVertical: 2,
    },
    // Only the row layout is set here. Padding, radius and spacing come from
    // GlassCard's defaults (same as the specialist and calendar boxes below),
    // and the vertical gap between cards comes from the body `gap`.
    visitCard: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    dateBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(255,255,255,0.7)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.1)" : c.accentBorder,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    dateBoxDay: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
      lineHeight: 18,
    },
    dateBoxMonth: {
      fontSize: 9,
      color: c.faint,
      fontWeight: "600",
    },
    appointmentInfo: {
      flex: 1,
      minWidth: 0,
    },
    appointmentType: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    appointmentMeta: {
      fontSize: 12,
      color: c.faint,
      marginTop: 2,
    },
    statusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 6,
    },
    statusChip: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusPending: {
      backgroundColor: isDark ? "rgba(196,160,90,0.16)" : "rgba(196,160,90,0.12)",
    },
    statusApproved: {
      backgroundColor: c.successSoft,
    },
    statusChipText: {
      fontSize: 11,
      fontWeight: "700",
    },
    statusPendingText: {
      color: c.accent,
    },
    statusApprovedText: {
      color: c.success,
    },
    progressNote: {
      fontSize: 11,
      color: c.muted,
      lineHeight: 15,
      marginBottom: 8,
    },
    approveChip: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 16,
      backgroundColor: c.successSoft,
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginBottom: 10,
    },
    approveChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.success,
    },
    appointmentActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
    },
    reminderChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(244,244,244,0.95)",
    },
    reminderChipOn: {
      backgroundColor: isDark
        ? "rgba(196,160,90,0.14)"
        : "rgba(196,160,90,0.12)",
    },
    reminderChipText: {
      fontSize: 11,
      color: c.muted,
      fontWeight: "600",
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    cancelText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.danger,
    },
  });
}
