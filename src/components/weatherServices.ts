
const weatherApiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

export type WeatherData = {
  temp: number;
  description: string;
};

type CachedWeather = {
  expiresAt: number;
  promise: Promise<WeatherData>;
};

const weatherCache = new Map<string, CachedWeather>();
const CACHE_DURATION = 5 * 60 * 1000;

export function getWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return Promise.reject(new Error("Invalid location coordinates."));
  }

  if (!weatherApiKey) {
    return Promise.reject(
      new Error("Weather API key is missing. Check your .env file."),
    );
  }

  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const now = Date.now();
  const cached = weatherCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${encodeURIComponent(weatherApiKey)}&units=metric`,
  )
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid weather API key.");
        }
        if (response.status === 429) {
          throw new Error("Weather API rate limit reached.");
        }
        throw new Error(`Weather request failed (${response.status}).`);
      }

      const data = await response.json();

      if (
        typeof data.main?.temp !== "number" ||
        typeof data.weather?.[0]?.description !== "string"
      ) {
        throw new Error("Weather data is incomplete.");
      }

      return {
        temp: data.main.temp,
        description: data.weather[0].description,
      };
    })
    .catch((error) => {
      if (weatherCache.get(key)?.promise === promise) {
        weatherCache.delete(key);
      }
      throw error;
    });

  weatherCache.set(key, {
    promise,
    expiresAt: now + CACHE_DURATION,
  });

  return promise;
}
