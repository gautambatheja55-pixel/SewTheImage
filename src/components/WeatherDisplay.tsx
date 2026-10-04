import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const weatherApiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

type WeatherDisplayProps = {
  latitude: number;
  longitude: number;
};

export default function WeatherDisplay({
  latitude,
  longitude,
}: WeatherDisplayProps) {
  const [weatherData, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${weatherApiKey}&units=metric`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch weather data");
        }

        const data = await response.json();
        setWeather(data);
      } catch (error: unknown) {
        setError(
          error instanceof Error ? error.message : "Could not load the weather",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchWeatherData();
  }, [latitude, longitude]);

  return (
    <View style={styles.container}>
      {loading && <Text style={styles.text}>Loading...</Text>}

      {!loading && error && <Text style={styles.text}>{error}</Text>}

      {weatherData && !loading && !error && (
        <View style={styles.weatherRow}>

          <Text style={styles.text}>{Math.round(weatherData.main.temp)}°C</Text>
          <Text style={styles.text}>{weatherData.weather[0]?.description}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 380,
    left: 20,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.70)",
    borderRadius:20,
    
  },
  weatherRow:{
    flexDirection:"row",
    alignItems:"center",
    gap:6,
  },
  text: {
    color: "white",
    fontSize: 10,
  },
});
