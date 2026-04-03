import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENWEATHERMAP_API_KEY = Deno.env.get("OPENWEATHERMAP_API_KEY");
    if (!OPENWEATHERMAP_API_KEY) {
      throw new Error("OPENWEATHERMAP_API_KEY is not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { lat, lon } = await req.json();
    if (!lat || !lon) throw new Error("Missing lat/lon");

    // 1. Fetch weather
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`
    );
    if (!weatherRes.ok) {
      const errText = await weatherRes.text();
      throw new Error(`OpenWeatherMap API error [${weatherRes.status}]: ${errText}`);
    }
    const weatherData = await weatherRes.json();

    const temp = weatherData.main.temp;
    const feels_like = weatherData.main.feels_like;
    const humidity = weatherData.main.humidity;
    const description = weatherData.weather?.[0]?.description ?? "";
    const city = weatherData.name ?? "Unknown";
    const icon = weatherData.weather?.[0]?.icon ?? "";

    // 2. Fetch user's clothes
    const { data: clothes, error: clothesErr } = await supabase
      .from("clothes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (clothesErr) throw clothesErr;

    // 3. AI suggestion
    const clothesSummary = (clothes || [])
      .map((c: any) => `${c.name} (${c.category}, ${c.color}, season: ${c.season || "all"})`)
      .join("; ");

    const aiRes = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a fashion-savvy AI stylist. Given current weather conditions and a user's wardrobe, suggest the best outfit combination. Be specific about which items to wear together and why. Keep it concise (3-4 sentences). Include color coordination tips.`,
          },
          {
            role: "user",
            content: `Weather in ${city}: ${description}, ${temp}°C (feels like ${feels_like}°C), humidity ${humidity}%. 

My wardrobe items: ${clothesSummary || "No items yet."}

What should I wear today? Suggest a complete outfit from my wardrobe items, considering the weather and color matching.`,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI API error:", errText);
      // Fallback to rule-based if AI fails
      return new Response(
        JSON.stringify({
          weather: { temp, feels_like, humidity, description, city, icon },
          suggestion: null,
          aiAvailable: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const suggestion = aiData.choices?.[0]?.message?.content ?? null;

    return new Response(
      JSON.stringify({
        weather: { temp, feels_like, humidity, description, city, icon },
        suggestion,
        aiAvailable: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
