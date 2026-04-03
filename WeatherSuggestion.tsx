import { useState, useEffect } from "react";

type WeatherData = {
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  city: string;
};

type Item = {
  name: string;
  type: "top" | "bottom" | "shoes" | "accessory";
  image?: string;
};

// 👇 PROPS ME WARDROBE AA RHA HAI
export default function WeatherSuggestion({ wardrobe }: { wardrobe: Item[] }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestedOutfit, setSuggestedOutfit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 OUTFIT LOGIC
  const getOutfitFromWardrobe = (items: Item[], temp: number) => {
    let tops = items.filter(i => i.type === "top");
    let bottoms = items.filter(i => i.type === "bottom");
    let shoes = items.filter(i => i.type === "shoes");

    if (!items.length) return null;

    const pick = (arr: Item[]) =>
      arr[Math.floor(Math.random() * arr.length)];

    let top = tops.length ? pick(tops) : null;
    let bottom = bottoms.length ? pick(bottoms) : null;
    let shoe = shoes.length ? pick(shoes) : null;

    if (temp > 30 && tops.length) {
      top = tops.find(i => i.name.includes("t-shirt")) || pick(tops);
    } else if (temp < 15 && tops.length) {
      top = tops.find(i => i.name.includes("hoodie")) || pick(tops);
    }

    return { top, bottom, shoes: shoe };
  };

  // 🌦️ WEATHER
  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);

    try {
      const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );

      const data = await res.json();

      const weatherData = {
        temp: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        description: data.weather[0].description,
        city: data.name,
      };

      setWeather(weatherData);

      if (weatherData.temp > 30) {
        setSuggestion("Light outfit recommended 👕");
      } else if (weatherData.temp < 15) {
        setSuggestion("Warm outfit recommended 🧥");
      } else {
        setSuggestion("Casual outfit 👕👖");
      }

      const outfit = getOutfitFromWardrobe(wardrobe, weatherData.temp);
      setSuggestedOutfit(outfit);

    } catch {
      setError("Error fetching weather");
    } finally {
      setLoading(false);
    }
  };

  // 🔁 AUTO UPDATE WHEN WARDROBE CHANGES
  useEffect(() => {
    if (weather && wardrobe.length > 0) {
      const outfit = getOutfitFromWardrobe(wardrobe, weather.temp);
      setSuggestedOutfit(outfit);
    }
  }, [wardrobe, weather]);

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => setError("Location permission denied")
    );
  };

  return (
    <div style={{ marginBottom: 30 }}>
      <h3>🌦️ Smart Weather Outfit</h3>

      {!weather && !loading && (
        <button onClick={requestLocation}>Enable Weather</button>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {weather && (
        <div>
          <p>{weather.city}</p>
          <p>{weather.temp}°C</p>
          <p>{weather.description}</p>
          <p>{suggestion}</p>

          {/* 👔 IMAGE OUTFIT */}
          {suggestedOutfit && (
            <div style={{ display: "flex", gap: "20px", marginTop: 10 }}>
              {[suggestedOutfit.top, suggestedOutfit.bottom, suggestedOutfit.shoes].map((item, i) => (
                item && (
                  <div key={i}>
                    <img
                      src={item.image || "https://via.placeholder.com/100"}
                      width="80"
                    />
                    <p>{item.name}</p>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}