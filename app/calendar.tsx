import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Calendar() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🗓️ Calendar Page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 22, fontWeight: "600", color: "#0077b6" },
});
