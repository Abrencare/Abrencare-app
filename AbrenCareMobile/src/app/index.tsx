import React, { useRef, useState } from "react";

import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import BrandLogo from "@/components/ui/BrandLogo";
import { useLanguage } from "@/context/LanguageContext";
import { useLandingType } from "@/theme/landingType";

import colors from "@/theme/colors";

const INITIAL_SIZE = Dimensions.get("window");

const slides = [
  require("@/assets/images/welcome-care-home-hq.jpg"),
  require("@/assets/images/welcome-care-reading.jpg"),
];

export default function WelcomeScreen() {
  const router = useRouter();
  const type = useLandingType("family");
  const listRef = useRef<FlatList<(typeof slides)[number]>>(null);

  const {
    t,
    language,
    setLanguage,
  } = useLanguage();

  const [pageSize, setPageSize] = useState({
    width: INITIAL_SIZE.width,
    height: INITIAL_SIZE.height,
  });
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastSlide = activeIndex >= slides.length - 1;
  const kicker = isLastSlide ? t.welcome.offerKicker : t.welcome.kicker;
  const title = isLastSlide ? t.welcome.offerTitle : t.welcome.title;
  const body = isLastSlide ? t.welcome.offerBody : t.welcome.location;
  const cta = isLastSlide ? t.welcome.getStarted : t.welcome.next;

  const changeLanguage = (newLanguage: "en" | "am") => {
    setLanguage(newLanguage);
  };

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / pageSize.width,
    );

    setActiveIndex(nextIndex);
  };

  function handlePrimary() {
    if (!isLastSlide) {
      const nextIndex = activeIndex + 1;
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <View
      style={styles.safeArea}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (
          width > 0 &&
          height > 0 &&
          (width !== pageSize.width || height !== pageSize.height)
        ) {
          setPageSize({ width, height });
        }
      }}
    >
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, index) => String(index)}
        horizontal
        pagingEnabled
        bounces={false}
        style={styles.slider}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={(event) => {
          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.x / pageSize.width,
          );
          if (nextIndex !== activeIndex) {
            setActiveIndex(nextIndex);
          }
        }}
        scrollEventThrottle={16}
        extraData={pageSize}
        snapToInterval={pageSize.width}
        decelerationRate="fast"
        disableIntervalMomentum
        getItemLayout={(_, index) => ({
          length: pageSize.width,
          offset: pageSize.width * index,
          index,
        })}
        renderItem={({ item }) => (
          <Image
            source={item}
            resizeMode="cover"
            style={{
              width: pageSize.width,
              height: pageSize.height,
            }}
          />
        )}
      />

      <LinearGradient
        colors={["rgba(12, 16, 14, 0)", "rgba(12, 16, 14, 0.28)", "rgba(12, 16, 14, 0.82)"]}
        locations={[0.42, 0.62, 1]}
        style={styles.overlay}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.uiLayer} pointerEvents="box-none">
        <View style={styles.topSection} pointerEvents="box-none">
          <View style={styles.brandRow}>
            <BrandLogo size={48} style={styles.welcomeLogo} />
            <Text style={[styles.brandWordmark, type.label]}>
              {t.welcome.brand}
            </Text>
          </View>
          <View style={styles.languageContainer}>
            <Pressable
              onPress={() => changeLanguage("en")}
              hitSlop={10}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "en" && styles.activeLanguage,
                ]}
              >
                English
              </Text>
            </Pressable>

            <Text style={styles.languageDivider}>
              ·
            </Text>

            <Pressable
              onPress={() => changeLanguage("am")}
              hitSlop={10}
            >
              <Text
                style={[
                  styles.languageText,
                  language === "am" && styles.activeLanguage,
                ]}
              >
                አማርኛ
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomSection} pointerEvents="box-none">
          <View style={styles.copy}>
            <Text style={[styles.kicker, type.kicker]}>{kicker}</Text>
            <Text style={[styles.title, type.headline]}>{title}</Text>
            {body.trim().length > 0 ? (
              <Text style={[styles.subtitle, type.body]}>{body}</Text>
            ) : null}
          </View>

          <View style={styles.dotsRow}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handlePrimary}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.primaryButtonText, type.button]}>
              {cta}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },

  slider: {
    flex: 1,
  },

  uiLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
  },

  overlay: {
    ...StyleSheet.absoluteFill,
  },

  topSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 12,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 10,
  },

  welcomeLogo: {
    flexShrink: 0,
  },

  brandWordmark: {
    color: "#FFFFFF",
    flexShrink: 1,
  },

  languageContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
  },

  languageText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
  },

  activeLanguage: {
    color: colors.primary,
    fontWeight: "700",
  },

  languageDivider: {
    color: "#9CA3AF",
    fontSize: 15,
    marginHorizontal: 8,
  },

  bottomSection: {
    width: "100%",
    paddingHorizontal: 22,
    paddingBottom: 24,
  },

  copy: {
    marginBottom: 22,
    maxWidth: 360,
  },

  kicker: {
    color: "#E6D3A8",
    letterSpacing: 1.4,
    marginBottom: 10,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 10,
  },

  subtitle: {
    color: "rgba(255, 255, 255, 0.82)",
    maxWidth: 340,
    lineHeight: 22,
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },

  activeDot: {
    width: 18,
    backgroundColor: colors.white,
  },

  primaryButton: {
    width: "100%",
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: colors.white,
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },
});
