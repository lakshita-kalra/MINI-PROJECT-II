import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type ClothItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string | null;
  image_url: string | null;
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
};

export function useClothes(filters?: { category?: string; search?: string; favoritesOnly?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clothes", user?.id, filters],
    queryFn: async () => {
      let query = supabase.from("clothes").select("*").order("created_at", { ascending: false });
      if (filters?.category) query = query.eq("category", filters.category);
      if (filters?.search) query = query.ilike("name", `%${filters.search}%`);
      if (filters?.favoritesOnly) query = query.eq("is_favorite", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as ClothItem[];
    },
    enabled: !!user,
  });
}

export function useAddCloth() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: { name: string; category: string; color: string; season?: string; image_url?: string }) => {
      const { error } = await supabase.from("clothes").insert({ ...item, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clothes"] });
      toast.success("Item added to wardrobe!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase.from("clothes").update({ is_favorite }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clothes"] }),
  });
}

export function useDeleteCloth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clothes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clothes"] });
      toast.success("Item removed");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUploadClothingImage() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("clothing-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("clothing-images").getPublicUrl(path);
      return data.publicUrl;
    },
  });
}
