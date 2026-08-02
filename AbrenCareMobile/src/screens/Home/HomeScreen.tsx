import React from "react";
import { SafeAreaView, ScrollView, StyleSheet } from "react-native";

import Header from "../components/Header";
import HeroCard from "../";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Header />
        <HeroCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F6F2",
  },
  content: {
    paddingBottom: 30,
  },
});