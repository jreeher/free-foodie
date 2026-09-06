import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, Platform, Text } from 'react-native';
import { lightColors, darkColors } from '../../lib/theme/colors';
import { fontFamilies } from '../../lib/theme/typography';
import { shadows } from '../../lib/theme/spacing';
import { ShoppingBasket, BookOpen, PlusCircle, User } from 'lucide-react-native';

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
          title: 'Pantry',
          tabBarIcon: ({ color }) => <ShoppingBasket color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => <BookOpen color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Submit',
          tabBarIcon: ({ color }) => <PlusCircle color={color} size={20} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={20} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
