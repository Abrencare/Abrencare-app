import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#2F3640",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
    borderRadius: 28,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 40,
  },

  subtitle: {
    color: "#BFC6CF",
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },

  badgeContainer: {
    flexDirection: "row",
    marginTop: 24,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#434B57",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 10,
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
});

export default styles;