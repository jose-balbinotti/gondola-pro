-- Create presets table for poster configurations (no auth required, uses device_id)
CREATE TABLE public.poster_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  paper_size TEXT NOT NULL DEFAULT 'A4',
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  background_image TEXT,
  poster_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.poster_presets ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anyone (no auth, identified by device_id in app logic)
CREATE POLICY "Anyone can read presets" ON public.poster_presets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert presets" ON public.poster_presets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update presets" ON public.poster_presets FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete presets" ON public.poster_presets FOR DELETE USING (true);

-- Index for fast device_id lookups
CREATE INDEX idx_poster_presets_device_id ON public.poster_presets (device_id);