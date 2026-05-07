import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { tintColor } from '@/theme/colors';
import { loadFavorites, subscribeToFavoriteCount } from '@/store/favorites';
import { useEffect, useState } from 'react';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    loadFavorites().then(favorites => {
      if (mounted) setFavoriteCount(favorites.length);
    });
    const unsubscribe = subscribeToFavoriteCount(setFavoriteCount);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tintColor,
        tabBarStyle: { backgroundColor: dark ? '#111111' : '#FFFFFF' }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites', tabBarBadge: favoriteCount > 0 ? favoriteCount : undefined }} />
      <Tabs.Screen name="article" options={{ href: null }} />
    </Tabs>
  );
}
