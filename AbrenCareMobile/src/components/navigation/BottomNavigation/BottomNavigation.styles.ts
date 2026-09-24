import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,

    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    height: 82,

    borderRadius: 40,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: -4,
    },

    elevation: 15,
  },

  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: "#A8A8A8",
  },

  activeLabel: {
    color: "#7DA46B",
    fontWeight: "700",
  },
});

export default styles;