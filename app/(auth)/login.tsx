import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useTheme } from '../../lib/hooks/useTheme';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const { colors, typography, spacing, layout } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign in failed', error.message);
    }
    // Navigation handled by root layout on session change
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Enter your email',
        'Type your email address in the field above, then tap "Forgot password?"'
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Check your email',
        `A password reset link has been sent to ${email.trim()}.`
      );
    }
  };

  const s = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: layout.screenPaddingH,
      paddingVertical: 48,
    },
    logo: {
      alignItems: 'center',
      marginBottom: 48,
    },
    logoText: {
      ...typography.textStyles.displayMedium,
      color: colors.primary,
    },
    tagline: {
      ...typography.textStyles.bodyMedium,
      color: colors.textSecondary,
      marginTop: 8,
    },
    title: {
      ...typography.textStyles.headingLarge,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      ...typography.textStyles.bodyMedium,
      color: colors.textSecondary,
      marginBottom: 32,
    },
    inputLabel: {
      ...typography.textStyles.labelSmall,
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 16,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: layout.inputRadius,
      paddingHorizontal: 16,
      paddingVertical: 14,
      ...typography.textStyles.bodyMedium,
      color: colors.textPrimary,
    },
    inputFocused: {
      borderColor: colors.borderFocus,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginTop: 8,
    },
    forgotPasswordText: {
      ...typography.textStyles.bodySmall,
      color: colors.primary,
    },
    signInButton: {
      backgroundColor: colors.primary,
      borderRadius: layout.buttonRadius,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    signInButtonDisabled: {
      opacity: 0.6,
    },
    signInButtonText: {
      ...typography.textStyles.headingSmall,
      color: colors.textOnAccent,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 32,
    },
    footerText: {
      ...typography.textStyles.bodyMedium,
      color: colors.textSecondary,
    },
    footerLink: {
      ...typography.textStyles.bodyMedium,
      color: colors.primary,
      fontFamily: typography.fontFamilies.sansSemiBold,
    },
  }), [colors, typography, layout]);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.logo}>
          <Text style={s.logoText}>Simmer Down</Text>
          <Text style={s.tagline}>Recipes you actually cook</Text>
        </View>

        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to your account to continue.</Text>

        <Text style={s.inputLabel}>EMAIL</Text>
        <TextInput
          style={[s.input, emailFocused && s.inputFocused]}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
        />

        <Text style={s.inputLabel}>PASSWORD</Text>
        <TextInput
          style={[s.input, passwordFocused && s.inputFocused]}
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          autoComplete="password"
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
        />

        <TouchableOpacity style={s.forgotPassword} onPress={handleForgotPassword}>
          <Text style={s.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.signInButton, loading && s.signInButtonDisabled]}
          onPress={handleEmailLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={s.signInButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={s.footerLink}>Create one</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
