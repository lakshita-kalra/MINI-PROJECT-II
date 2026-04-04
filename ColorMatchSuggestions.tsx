import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette } from "lucide-react";
import { useClothes } from "@/hooks/useClothes";

// ✅ NEW: Category grouping (MAIN FIX)
const categoryGroup: Record<string, string> = {
  // Tops
  shirt: "top",
  top: "top",
  tshirt: "top",

  // Bottoms
  pant: "bottom",
  jeans: "bottom",
  "coat pant": "bottom",
  trousers: "bottom",

  // Shoes
  shoes: "shoes",
  loafer: "shoes",

  // Accessories
  earrings: "accessories",
  purse: "accessories",
};

// ✅ OPTIONAL: Valid outfit combinations (SMART FILTER)
const validMatches: Record<string, string[]> = {
  top: ["bottom", "shoes", "accessories"],
  bottom: ["top", "shoes"],
  shoes: ["top", "bottom"],
  accessories: ["top"],
};

// Color harmony rules
const colorHarmony: Record<string, string[]> = {
  black: ["white", "red", "grey", "blue", "beige", "pink", "gold"],
  white: ["black", "navy", "blue", "red", "grey", "beige", "brown"],
  navy: ["white", "beige", "grey", "red", "pink", "brown", "gold"],
  blue: ["white", "beige", "grey", "brown", "navy", "orange", "yellow"],
  red: ["black", "white", "navy", "grey", "beige", "blue"],
  grey: ["black", "white", "blue", "navy", "pink", "red", "yellow"],
  green: ["white", "beige", "brown", "grey", "navy", "black", "yellow"],
  brown: ["white", "beige", "blue", "green", "navy", "cream"],
  beige: ["navy", "brown", "white", "black", "blue", "green", "red"],
  pink: ["navy", "grey", "white", "black", "blue", "beige"],
  yellow: ["navy", "grey", "blue", "white", "black", "brown"],
  orange: ["navy", "blue", "white", "brown", "beige", "grey"],
  purple: ["white", "grey", "black", "beige", "pink", "navy"],
  cream: ["navy", "brown", "black", "blue", "green", "burgundy"],
  gold: ["navy", "black", "white", "brown", "burgundy"],
  burgundy: ["beige", "white", "grey", "navy", "cream", "gold"],
};

const colorSwatches: Record<string, string> = {
  black: "#1a1a1a", white: "#f5f5f5", navy: "#1e3a5f", blue: "#3b82f6",
  red: "#ef4444", grey: "#9ca3af", green: "#22c55e", brown: "#92400e",
  beige: "#d4b896", pink: "#ec4899", yellow: "#eab308", orange: "#f97316",
  purple: "#a855f7", cream: "#faf0dc", gold: "#d4a017", burgundy: "#800020",
};

interface Match {
  item1: { name: string; color: string; image_url: string | null; category: string };
  item2: { name: string; color: string; image_url: string | null; category: string };
}

export default function ColorMatchSuggestions() {
  const { data: clothes } = useClothes();

  const matches = useMemo(() => {
    if (!clothes || clothes.length < 2) return [];

    const results: Match[] = [];
    const seen = new Set<string>();

    for (const a of clothes) {
      for (const b of clothes) {
        if (a.id === b.id) continue;

        // ✅ NEW: Normalize category
        const groupA = categoryGroup[a.category.toLowerCase()] || a.category;
        const groupB = categoryGroup[b.category.toLowerCase()] || b.category;

        // ❌ Prevent same type (MAIN FIX)
        if (groupA === groupB) continue;

        // ✅ Allow only valid outfit combos
        if (!validMatches[groupA]?.includes(groupB)) continue;

        const key = [a.id, b.id].sort().join("-");
        if (seen.has(key)) continue;

        const aColor = a.color.toLowerCase();
        const bColor = b.color.toLowerCase();

        const harmonies = colorHarmony[aColor];
        if (harmonies && harmonies.includes(bColor)) {
          seen.add(key);
          results.push({ item1: a, item2: b });
        }
      }
    }

    return results.sort(() => Math.random() - 0.5).slice(0, 5);
  }, [clothes]);

  if (!clothes || clothes.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          Color Match Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add more clothes with different colors to get matching suggestions!</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">These items from your wardrobe pair well together:</p>
            {matches.map((match, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {match.item1.image_url ? (
                    <img src={match.item1.image_url} className="h-10 w-10 rounded object-cover shrink-0" alt={match.item1.name} />
                  ) : (
                    <div className="h-10 w-10 rounded border" style={{ backgroundColor: colorSwatches[match.item1.color.toLowerCase()] || "#ccc" }} />
                  )}
                  <div>
                    <p className="text-sm font-medium">{match.item1.name}</p>
                    <Badge variant="secondary">{match.item1.color}</Badge>
                  </div>
                </div>

                <span>+</span>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {match.item2.image_url ? (
                    <img src={match.item2.image_url} className="h-10 w-10 rounded object-cover shrink-0" alt={match.item2.name} />
                  ) : (
                    <div className="h-10 w-10 rounded border" style={{ backgroundColor: colorSwatches[match.item2.color.toLowerCase()] || "#ccc" }} />
                  )}
                  <div>
                    <p className="text-sm font-medium">{match.item2.name}</p>
                    <Badge variant="secondary">{match.item2.color}</Badge>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}