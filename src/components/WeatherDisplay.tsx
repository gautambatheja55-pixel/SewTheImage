import { StyleSheet, Text, View } from "react-native";
import { useState, useEffect } from "react";


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
                    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${weatherApiKey}&units=metric`
                );



                if (!response.ok) {
                    throw new Error("Failed to fetch weather data");

                }
                const data = await response.json();
                setWeather(data);
            } catch (error: any) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchWeatherData();

    }, [latitude, longitude]);


    return (
        <View style={styles.container}>
            {loading ? (
                <Text style={styles.text}>
                    Loading....
                </Text>
            )}
            {error && (
                <Text style={styles.text}>
                {error}

                </Text>

            )}
            {weatherData && !loading && !error && (
                <>
                <Text style={styles.text}>
                {weatherData.name}
                </Text>

                <Text style={styles.text}>
                {Math.round(weatherData.main.temp)}°C
                </Text>

                <Text style={styles.text}>
                {weatherData.weather[0].description}
                </Text>

                </>

            )}
           
        </View>
    );
}

const styles = StyleSheet.create({
    container:{
        position:"absolute",
        top: 20,
        left: 20,
        padding: 12,
        backgroundColor: "rgba(0, 0, 0, 0.65)",

    },

    text:{
        color: "white",
        fontSize: 16,
    },
});