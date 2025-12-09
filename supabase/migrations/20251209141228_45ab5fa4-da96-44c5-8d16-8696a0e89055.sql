-- Create user_settings table for salary configuration
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  monthly_salary NUMERIC DEFAULT NULL,
  salary_auto_calculate BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create budget_areas table
CREATE TABLE public.budget_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.budget_areas ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_areas
CREATE POLICY "Users can view own budget_areas" ON public.budget_areas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget_areas" ON public.budget_areas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget_areas" ON public.budget_areas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget_areas" ON public.budget_areas
  FOR DELETE USING (auth.uid() = user_id);

-- Create category_area_mappings table
CREATE TABLE public.category_area_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_area_id UUID REFERENCES public.budget_areas(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(category_id)
);

-- Enable RLS
ALTER TABLE public.category_area_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for category_area_mappings
CREATE POLICY "Users can view own mappings" ON public.category_area_mappings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.budget_areas 
    WHERE id = budget_area_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own mappings" ON public.category_area_mappings
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.budget_areas 
    WHERE id = budget_area_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update own mappings" ON public.category_area_mappings
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.budget_areas 
    WHERE id = budget_area_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own mappings" ON public.category_area_mappings
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.budget_areas 
    WHERE id = budget_area_id AND user_id = auth.uid()
  ));

-- Add updated_at triggers
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_budget_areas_updated_at
  BEFORE UPDATE ON public.budget_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();