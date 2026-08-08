import React from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  StatusBar, 
  Platform, 
  Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  const router = useRouter();

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleGoHome = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="search-outline" size={80} color="#6C63FF" />
          <View style={styles.brokenIconContainer}>
            <Ionicons name="close-circle-outline" size={40} color="#FF6B6B" />
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.errorCode}>404</Text>
          <Text style={styles.title}>Page Not Found</Text>
          <Text style={styles.description}>
            Oops! The page you are looking for doesn't exist or has been moved.
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleGoHome}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={22} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleGoBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back-outline" size={22} color="#6C63FF" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            If you think this is a mistake, please contact support.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375 || height < 600;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  brokenIconContainer: {
    position: 'absolute',
    bottom: -10,
    right: -20,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 4,
    // Fix shadow warnings
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  errorCode: {
    fontSize: isSmallDevice ? 48 : 64,
    fontWeight: '700',
    color: '#6C63FF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: isSmallDevice ? 22 : 28,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#718096',
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 24,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
    // Fix shadow warnings
    boxShadow: '0px 4px 8px rgba(108, 99, 255, 0.3)',
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  secondaryButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  footer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
  },
});