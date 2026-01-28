/**
 * One Day OS - 404 Not Found Screen
 */

import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={styles.message}>Screen not found</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Go to Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  message: {
    fontSize: 18,
    color: '#CCCCCC',
    marginBottom: 24,
  },
  link: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  linkText: {
    fontSize: 16,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});
