
-- Adicionar category_id e subcategory à tabela loans
ALTER TABLE public.loans 
ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN subcategory text;
