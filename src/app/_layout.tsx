import { TabBarContext } from "@/components/TabBarContext";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useState } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const [isTabBarHidden, setIsTabBarHidden] = useState(false);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider
                value={
                    colorScheme === "dark"
                        ? DarkTheme
                        : DefaultTheme
                }
            >
                <AnimatedSplashOverlay />
                <TabBarContext.Provider value={{ setIsTabBarHidden }}>
                    <AppTabs hidden={isTabBarHidden} />
                </TabBarContext.Provider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
