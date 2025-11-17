import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StyleSheet,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const fadeInValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      // Scale animation
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        useNativeDriver: true,
      }),
      // Fade in animation for logo
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Fade in animation for text
      Animated.timing(fadeInValue, {
        toValue: 1,
        duration: 1000,
        delay: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to login after animation completes
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = {
    transform: [
      { scale: scaleValue },
    ],
    opacity: opacityValue,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Custom Logo Image */}
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <Image 
          source={require('../assets/images/reminora.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
      
      {/* App Name - Updated to Reminora */}
      <Animated.Text style={[styles.appName, { opacity: fadeInValue }]}>
        Reminora
      </Animated.Text>
      
      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: fadeInValue }]}>
        Capture your precious moments
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 10,
  },
});