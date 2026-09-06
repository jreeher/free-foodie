import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '../../lib/hooks/useTheme';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const { colors, typography, layout } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      Alert.alert(
        'Account created',
        'Check your email to confirm your account, then sign in.',
      );
    }
  };

  const s = StyleSheet.create({
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
      marginBottom: 40,
    },
    logoText: {
      ...typography.textStyles.displayMedium,
      color: colors.primary,
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
    signUpButton: {
      backgroundColor: colors.primary,
      borderRadius: layout.buttonRadius,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    signUpButtonDisabled: {
      opacity: 0.6,
    },
    signUpButtonText: {
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
    terms: {
      ...typography.textStyles.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 20,
    },
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const inputStyle = (field: string) => [
    s.input,
    focusedField === field && s.inputFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.logo}>
          <Text style={s.logoText}>Simmer Down</Text>
        </View>

        <Text style={s.title}>Create your account</Text>
        <Text style={s.subtitle}>Join and start building your recipe collection.</Text>

        <Text style={s.inputLabel}>YOUR NAME</Text>
        <TextInput
          style={inputStyle('name')}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="How should we call you?"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="words"
          autoComplete="name"
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
        />

        <Text style={s.inputLabel}>EMAIL</Text>
        <TextInput
          style={inputStyle('email')}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
        />

        <Text style={s.inputLabel}>PASSWORD</Text>
        <TextInput
          style={inputStyle('password')}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          autoComplete="new-password"
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
        />

        <Text style={s.inputLabel}>CONFIRM PASSWORD</Text>
        <TextInput
          style={inputStyle('confirm')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat your password"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          autoComplete="new-password"
          onFocus={() => setFocusedField('confirm')}
          onBlur={() => setFocusedField(null)}
        />

        <TouchableOpacity
          style={[s.signUpButton, loading && s.signUpButtonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={s.signUpButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <Text style={s.terms}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </Text>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={s.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
