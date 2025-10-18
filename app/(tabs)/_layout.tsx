import { Redirect } from 'expo-router';

export default function TabLayout() {
  // Redirect tabs to menu since we're not using the tab structure
  return <Redirect href="/menu" />;
}