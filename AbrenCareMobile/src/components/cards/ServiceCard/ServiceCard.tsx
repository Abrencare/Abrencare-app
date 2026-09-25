import { useAuth } from "@/context/AuthContext";
import { dashboardFor, getServiceTheme, onboardingPath } from "@/service/serviceTheme";
import type { CareService } from "@/types/auth";
import { useAppTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  Image,
  type ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import styles from "./ServiceCard.styles";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 14;

type ServiceItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  category: string;
  description: string;
  features: string[];
  accentColor: string;
  iconBackground: string;
  cardBackground: string;
  backgroundPhoto?: ImageSourcePropType;
  tags?: string[];
};

function withAlpha(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
  const value = Number.parseInt(full, 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

type Props = {
  services?: ServiceItem[];
};

export default function ServiceCard({ services }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors, isDark } = useAppTheme();
  const { hasService, needsOnboarding } = useAuth();
  const familyTheme = getServiceTheme("family", isDark);
  const executiveTheme = getServiceTheme("executive", isDark);
  const consultationTheme = getServiceTheme("consultation", isDark);
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [trackWidth, setTrackWidth] = useState(SCREEN_WIDTH - 64);
  const cardWidth = Math.min(trackWidth * 0.86, 360);

  const defaultServices: ServiceItem[] = [
    {
      id: "family",
      icon: "people-outline",
      title: t.home.familyTitle,
      category: t.home.familyCategory,
      description: t.home.familyDescription,
      features: [...t.home.familyFeatures],
      accentColor: familyTheme.accent,
      iconBackground: familyTheme.accent,
      cardBackground: familyTheme.card,
      backgroundPhoto: require("@/assets/images/service-family-bg.jpg"),
      tags: [...t.home.familyTags],
    },
    {
      id: "executive",
      icon: "medal-outline",
      title: t.home.executiveTitle,
      category: t.home.executiveCategory,
      description: t.home.executiveDescription,
      features: [...t.home.executiveFeatures],
      accentColor: executiveTheme.accent,
      iconBackground: executiveTheme.accent,
      cardBackground: executiveTheme.card,
      backgroundPhoto: require("@/assets/images/service-executive-bg.jpg"),
      tags: [...t.home.executiveTags],
    },
    {
      id: "consultation",
      icon: "videocam-outline",
      title: t.home.consultationTitle,
      category: t.home.consultationCategory,
      description: t.home.consultationDescription,
      features: [...t.home.consultationFeatures],
      accentColor: consultationTheme.accent,
      iconBackground: consultationTheme.accent,
      cardBackground: consultationTheme.card,
      backgroundPhoto: require("@/assets/images/service-consultation-bg.jpg"),
      tags: [...t.home.consultationTags],
    },
  ];

  const items = services ?? defaultServices;
  const step = cardWidth + CARD_GAP;
  const sideInset = Math.max((trackWidth - cardWidth) / 2, 8);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const updateIndex = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / step);
    setActiveIndex(Math.max(0, Math.min(nextIndex, items.length - 1)));
  };

  const handleChoose = (service: CareService) => {
    if (hasService(service) && !needsOnboarding(service)) {
      router.push(dashboardFor(service));
      return;
    }
    if (hasService(service) && needsOnboarding(service)) {
      router.push(onboardingPath(service));
      return;
    }
    router.push({ pathname: "/service", params: { service } });
  };

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0 && nextWidth !== trackWidth) {
          setTrackWidth(nextWidth);
        }
      }}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.muted }]}>{t.home.ourServices}</Text>
          <Text style={[styles.headerHint, { color: colors.muted }]}>{t.home.swipeHint}</Text>
        </View>
        <View style={[styles.swipeCue, { backgroundColor: colors.card }]}>
          <Ionicons name="swap-horizontal" size={16} color={colors.iconMuted} />
        </View>
      </View>

      <Animated.FlatList
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={step}
        snapToAlignment="start"
        disableIntervalMomentum
        bounces={false}
        nestedScrollEnabled
        directionalLockEnabled
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={updateIndex}
        onScrollEndDrag={updateIndex}
        contentContainerStyle={{
          paddingHorizontal: sideInset,
        }}
        extraData={`${cardWidth}-${isDark}`}
        getItemLayout={(_, index) => ({
          length: step,
          offset: step * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <ServiceSlide
            item={item}
            index={index}
            cardWidth={cardWidth}
            scrollX={scrollX}
            chooseLabel={t.home.chooseService}
            titleColor={colors.text}
            bodyColor={colors.muted}
            featureColor={colors.text}
            onChoose={() => handleChoose(item.id as CareService)}
          />
        )}
      />

      <View style={styles.dotsRow}>
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index === activeIndex ? item.accentColor : colors.border,
                width: index === activeIndex ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>+500</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>{t.home.familiesServed}</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />

        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>24/7</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>{t.home.supportAvailable}</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />

        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>16yr</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>{t.home.gapClosing}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" size={17} color={colors.iconMuted} />
        <Text style={[styles.footerText, { color: colors.muted }]}>{t.home.footer}</Text>
      </View>
    </View>
  );
}

function ServiceSlide({
  item,
  index,
  cardWidth,
  scrollX,
  chooseLabel,
  titleColor,
  bodyColor,
  featureColor,
  onChoose,
}: {
  item: ServiceItem;
  index: number;
  cardWidth: number;
  scrollX: SharedValue<number>;
  chooseLabel: string;
  titleColor: string;
  bodyColor: string;
  featureColor: string;
  onChoose: () => void;
}) {
  const step = cardWidth + CARD_GAP;

  const cardStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * step, index * step, (index + 1) * step];

    const scale = interpolate(
      scrollX.value,
      input,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      input,
      [0.55, 1, 0.55],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollX.value,
      input,
      [18, 0, 18],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * step, index * step, (index + 1) * step];
    const scale = interpolate(
      scrollX.value,
      input,
      [0.86, 1.08, 0.86],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.slide,
        cardStyle,
        {
          width: cardWidth,
          marginRight: CARD_GAP,
          boxShadow: "0 10px 28px rgba(42, 38, 34, 0.14)",
        },
      ]}
    >
      <Pressable
        onPress={onChoose}
        style={[
          styles.card,
          {
            backgroundColor: item.cardBackground,
            borderColor: item.accentColor + "99",
          },
        ]}
      >
        {item.backgroundPhoto ? (
          <>
            <Image
              source={item.backgroundPhoto}
              style={styles.backgroundPhoto}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                item.cardBackground,
                withAlpha(item.cardBackground, 0.96),
                withAlpha(item.cardBackground, 0.55),
                withAlpha(item.cardBackground, 0.08),
              ]}
              locations={[0, 0.36, 0.62, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.backgroundFade}
            />
          </>
        ) : null}

        <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Animated.View
            style={[
              styles.iconBox,
              { backgroundColor: item.iconBackground },
              iconStyle,
            ]}
          >
            <Ionicons name={item.icon} size={28} color="#FFFFFF" />
          </Animated.View>

          <Text style={[styles.category, { color: item.accentColor }]}>
            {item.category}
          </Text>
        </View>

        <Text style={[styles.title, { color: titleColor }]}>{item.title}</Text>
        <Text style={[styles.description, { color: bodyColor }]}>{item.description}</Text>

        <View style={styles.features}>
          {item.features.map((feature, featureIndex) => (
            <View
              key={`${item.id}-feature-${featureIndex}`}
              style={styles.featureItem}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={item.accentColor}
              />
              <Text style={[styles.featureText, { color: featureColor }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tags}>
            {item.tags.map((tag, tagIndex) => (
              <View
                key={`${item.id}-tag-${tagIndex}`}
                style={[
                  styles.tag,
                  { backgroundColor: `${item.accentColor}22` },
                ]}
              >
                <Text style={[styles.tagText, { color: item.accentColor }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View
          style={[styles.chooseButton, { backgroundColor: item.accentColor }]}
        >
          <Text style={styles.chooseButtonText}>{chooseLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
