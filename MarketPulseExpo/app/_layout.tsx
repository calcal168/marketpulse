import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tintColor,
        tabBarStyle: { backgroundColor: dark ? '#111111' : '#FFFFFF' }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
      <Tabs.Screen name="article" options={{ href: null }} />
    </Tabs>
  );
}
