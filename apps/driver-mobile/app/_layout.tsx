import { useEffect } from "react";
import { Stack, useSegments, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LogBox } from "react-native";
import { useDriverAuthStore } from "@/stores/auth.store";
import { AppSplashScreen } from "@/components/AppSplashScreen";

LogBox.ignoreLogs([
  "Cannot connect to Expo CLI",
  "ExpoLocation.reverseGeocodeAsync",
  "Geocoder is not running",
]);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function AuthGuard() {
  const { status } = useDriverAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "unknown" || status === "authenticating") return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === "(auth)";
    const isPublicException = inAuthGroup;

    if (status === "unauthenticated" && !isPublicException) {
      router.replace("/(auth)/login");
    } else if (status === "authenticated" && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [status, segments, router]);

  if (status === "unknown" || status === "authenticating") {
    return <AppSplashScreen appName="CRAVE Driver" subtitle="Rider & Logistics Management" statusText="Authenticating driver session..." />;
  }

  return null;
}

export default function DriverRootLayout() {
  const restoreSession = useDriverAuthStore((s) => s.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGuard />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="onboarding/pending"
              options={{ headerShown: true, title: "Driver Application Pending" }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
