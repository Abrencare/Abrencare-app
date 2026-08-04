import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  headerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 2,
  },

  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    flex: 1,
    marginLeft: 12,
  },

  chevron: {
    marginTop: 4,
  },

  category: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 2,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B2230",
    marginTop: 0,
  },

  description: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
  },

  features: {
    marginTop: 10,
  },

  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  featureText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#374151",
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },

  tag: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
  },

  tagText: {
    fontSize: 10,
    fontWeight: "500",
  },

  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  statItem: {
    alignItems: "center",
  },

  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B2230",
  },

  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },

  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    textAlign: "center",
  },
});

export default styles;