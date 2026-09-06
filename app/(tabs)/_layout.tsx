import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, Platform, Text } from 'react-native';
import { lightColors, darkColors } from '../../lib/theme/colors';
import { fontFamilies } from '../../lib/theme/typography';
import { shadows } from '../../lib/theme/spacing';
import {
  Home,
  BookOpen,
  CalendarDays,
  ShoppingCart,
  Settings,
  Store,
} from 'lucide-react-native';

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconActive,
        tabBarInactiveTintColor: colors.tabIconInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 0
            : Platform.OS === 'web' ? ('max(18px, env(safe-area-inset-bottom))' as any)
            : 8,
          height: Platform.OS === 'ios' ? 84
            : Platform.OS === 'web' ? ('calc(60px + max(18px, env(safe-area-inset-bottom)))' as any)
            : 64,
          ...shadows.tabBar,
        },
        // Custom label renderer so we control the padding directly —
        // tabBarLabelStyle alone can't prevent descender clipping because
        // the React Navigation container clips overflow by default.
        tabBarLabel: ({ color, children }) => (
          <Text
            style={{
              color,
              fontFamily: fontFamilies.sansMedium,
              fontSize: 11,
              lineHeight: 14,
              marginTop: 2,
              paddingBottom: 3,
            }}
          >
            {children as string}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          href: Platform.OS === 'web' ? undefined : null,
          tabBarIcon: ({ color }) => <Store color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Meal Plan',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'Grocery',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={20} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
