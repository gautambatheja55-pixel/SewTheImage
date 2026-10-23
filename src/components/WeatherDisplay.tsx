
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getWeather } from "./weatherServices";

const weatherApiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;


type WeatherDisplayProps = {
  latitude: number;
  longitude: number;
};

type WeatherData = {
  temp: number;
  description: string;
};

export default function WeatherDisplay({
  latitude,
  longitude,
}: WeatherDisplayProps) {
  const [weatherData, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  let active = true;

  async function fetchWeather() {
    setLoading(true);
    setError(null);

    try {
      const data = await getWeather(latitude, longitude);

      if (active) {
        setWeather(data);
      }
    } catch (err) {
      if (active) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load weather."
        );
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }

  void fetchWeather();

  return () => {
    active = false;
  };
}, [latitude, longitude]);


  return (
    <View style={styles.container}>
      {loading ? (
        <Text style={styles.text}>Loading weather...</Text>
      ) : error ? (
        <Text style={styles.text}>{error}</Text>
      ) : weatherData ? (
        <View style={styles.weatherRow}>
          <Text style={styles.text}>
            {Math.round(weatherData.temp)}°C
          </Text>
          <Text style={styles.text}>
            {weatherData.description}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 380,
    left: 20,
    maxWidth: "85%",
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.70)",
    borderRadius: 12,
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  text: {
    color: "white",
    fontSize: 10,
  },
});

