if (typeof globalThis !== "undefined" && typeof globalThis.TextDecoder !== "undefined") {
  try {
    new globalThis.TextDecoder("utf-16le");
  } catch (err) {
    const NativeTextDecoder = globalThis.TextDecoder;
    (globalThis as any).TextDecoder = function TextDecoderPolyfill(encoding?: string, options?: any) {
      const enc = (encoding || "utf-8").toLowerCase();
      if (enc === "utf-16le" || enc === "utf16le" || enc === "utf-16" || enc === "utf16") {
        return {
          decode(buffer?: any) {
            if (!buffer) return "";
            const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer.buffer || buffer);
            let str = "";
            for (let i = 0; i < bytes.length; i += 2) {
              const code = bytes[i] | (bytes[i + 1] << 8);
              if (code !== 0) str += String.fromCharCode(code);
            }
            return str;
          },
        };
      }
      return new NativeTextDecoder(encoding, options);
    } as any;
  }
}

import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LogBox } from "react-native";
import { useAuthStore } from "@/stores/auth.store";

LogBox.ignoreLogs([
  "Cannot connect to Expo CLI",
  "ExpoLocation.reverseGeocodeAsync",
  "Geocoder is not running",
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

export default function RootLayout() {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
