import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { setClubLogos } from '../../components/card/model';
import { isClubMember } from '../../lib/club';
import { useSettings } from '../../lib/hooks';
import { colors, fonts } from '../../lib/theme';

export default function TabsLayout() {
  const settings = useSettings();
  // Вкладка «Клуб» — только у тех, кто ввёл код клуба. Знакомым без кода клуб не мешает.
  const club = isClubMember(settings);
  useEffect(() => {
    if (settings) setClubLogos(club);
  }, [settings, club]);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Бег', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="run-fast" color={color} size={size + 2} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Статистика', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="club"
        options={{ href: club ? undefined : null, title: 'Клуб', tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Настройки', tabBarIcon: ({ color, size }) => <Ionicons name="settings-sharp" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
