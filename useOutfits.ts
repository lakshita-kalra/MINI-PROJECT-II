import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function useOutfits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["outfits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfits")
        .select("*, outfit_items(cloth_id, clothes(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateOutfit() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ name, occasion, clothIds }: { name: string; occasion?: string; clothIds: string[] }) => {
      const { data: outfit, error } = await supabase
        .from("outfits")
        .insert({ name, occasion, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      if (clothIds.length > 0) {
        const { error: itemsError } = await supabase
          .from("outfit_items")
          .insert(clothIds.map((cloth_id) => ({ outfit_id: outfit.id, cloth_id })));
        if (itemsError) throw itemsError;
      }
      return outfit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outfits"] });
      toast.success("Outfit saved!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteOutfit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("outfits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outfits"] });
      toast.success("Outfit deleted");
    },
  });
}

export function useToggleOutfitFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase.from("outfits").update({ is_favorite }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outfits"] }),
  });
}
