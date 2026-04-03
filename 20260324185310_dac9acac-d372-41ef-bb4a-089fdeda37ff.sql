
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Clothes table
CREATE TABLE public.clothes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory')),
  color TEXT NOT NULL,
  season TEXT CHECK (season IN ('summer', 'winter', 'spring', 'fall', 'all')),
  image_url TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clothes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clothes" ON public.clothes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clothes" ON public.clothes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clothes" ON public.clothes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clothes" ON public.clothes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_clothes_updated_at BEFORE UPDATE ON public.clothes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outfits table
CREATE TABLE public.outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  occasion TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outfits" ON public.outfits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own outfits" ON public.outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outfits" ON public.outfits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own outfits" ON public.outfits FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_outfits_updated_at BEFORE UPDATE ON public.outfits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outfit items junction table
CREATE TABLE public.outfit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  cloth_id UUID NOT NULL REFERENCES public.clothes(id) ON DELETE CASCADE,
  UNIQUE(outfit_id, cloth_id)
);

ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outfit items" ON public.outfit_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.outfits WHERE id = outfit_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own outfit items" ON public.outfit_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.outfits WHERE id = outfit_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own outfit items" ON public.outfit_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.outfits WHERE id = outfit_id AND user_id = auth.uid())
);

-- Storage bucket for clothing images
INSERT INTO storage.buckets (id, name, public) VALUES ('clothing-images', 'clothing-images', true);

CREATE POLICY "Users can upload clothing images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clothing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view clothing images" ON storage.objects FOR SELECT USING (bucket_id = 'clothing-images');
CREATE POLICY "Users can delete own clothing images" ON storage.objects FOR DELETE USING (bucket_id = 'clothing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes
CREATE INDEX idx_clothes_user_id ON public.clothes(user_id);
CREATE INDEX idx_clothes_category ON public.clothes(category);
CREATE INDEX idx_outfits_user_id ON public.outfits(user_id);
