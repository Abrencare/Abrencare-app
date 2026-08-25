import { useLanguage } from "@/i18n/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import styles from "./ServiceCard.styles";

type ServiceItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  category: string;
  description: string;
  features: string[];
  accentColor: string;
  iconBackground: string;
  tags?: string[];
  route: string;
};

type Props = {
  services?: ServiceItem[];
};

export default function ServiceCard({ services }: Props) {
  const router = useRouter();

  // Gets the currently selected language
  const { t } = useLanguage();

  const defaultServices: ServiceItem[] = [
    {
      id: "family",
      icon: "people-outline",

      title: t.home.familyTitle,
      category: t.home.familyCategory,
      description: t.home.familyDescription,

      features: [...t.home.familyFeatures],

      accentColor: "#2F80ED",
      iconBackground: "#EAF6FF",

      tags: [...t.home.familyTags],

      route: "/family",
    },

    {
      id: "executive",
      icon: "medal-outline",

      title: t.home.executiveTitle,
      category: t.home.executiveCategory,
      description: t.home.executiveDescription,

      features: [...t.home.executiveFeatures],

      accentColor: "#8B5CF6",
      iconBackground: "#F3E8FF",

      tags: [...t.home.executiveTags],

      route: "/executive",
    },

    {
      id: "consultation",
      icon: "videocam-outline",

      title: t.home.consultationTitle,
      category: t.home.consultationCategory,
      description: t.home.consultationDescription,

      features: [...t.home.consultationFeatures],

      accentColor: "#10B981",
      iconBackground: "#D1FAE5",

      tags: [...t.home.consultationTags],

      route: "/consultation",
    },
  ];

  const items = services ?? defaultServices;

  const handlePress = (route: string) => {
    router.push(route as any);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t.home.ourServices}
        </Text>
      </View>

      {/* Service Cards */}
      {items.map((service) => (
        <TouchableOpacity
          key={service.id}
          activeOpacity={0.9}
          style={styles.card}
          onPress={() => handlePress(service.route)}
        >
          {/* Top Row */}
          <View style={styles.topRow}>
            {/* Icon */}
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: service.iconBackground,
                },
              ]}
            >
              <Ionicons
                name={service.icon}
                size={27}
                color={service.accentColor}
              />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text
                style={[
                  styles.category,
                  {
                    color: service.accentColor,
                  },
                ]}
              >
                {service.category}
              </Text>

              <Text style={styles.title}>
                {service.title}
              </Text>

              <Text style={styles.description}>
                {service.description}
              </Text>

              {/* Features */}
              <View style={styles.features}>
                {service.features.map((feature, index) => (
                  <View
                    key={`${service.id}-feature-${index}`}
                    style={styles.featureItem}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={service.accentColor}
                    />

                    <Text style={styles.featureText}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <View style={styles.tags}>
                  {service.tags.map((tag, index) => (
                    <View
                      key={`${service.id}-tag-${index}`}
                      style={[
                        styles.tag,
                        {
                          backgroundColor:
                            service.iconBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          {
                            color: service.accentColor,
                          },
                        ]}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Arrow */}
            <View style={styles.chevronContainer}>
              <Ionicons
                name="chevron-forward"
                size={17}
                color="#8E8E93"
              />
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            +500
          </Text>

          <Text style={styles.statLabel}>
            {t.home.familiesServed}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            24/7
          </Text>

          <Text style={styles.statLabel}>
            {t.home.supportAvailable}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            16yr
          </Text>

          <Text style={styles.statLabel}>
            {t.home.gapClosing}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons
          name="shield-checkmark-outline"
          size={17}
          color="#8E8E93"
        />

        <Text style={styles.footerText}>
          {t.home.footer}
        </Text>
      </View>
    </ScrollView>
  );
}