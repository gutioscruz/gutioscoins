-- Add closing_day and due_day columns to cards table
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS closing_day INTEGER DEFAULT 1;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS due_day INTEGER DEFAULT 10;

-- Add check constraints for valid days (1-28 to avoid month-end issues)
ALTER TABLE public.cards ADD CONSTRAINT cards_closing_day_check CHECK (closing_day >= 1 AND closing_day <= 28);
ALTER TABLE public.cards ADD CONSTRAINT cards_due_day_check CHECK (due_day >= 1 AND due_day <= 28);

-- Create card_statements table for tracking invoices
CREATE TABLE public.card_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  reference_month DATE NOT NULL,
  closing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid', 'partial')),
  paid_at TIMESTAMPTZ,
  paid_from_bank_id UUID REFERENCES public.banks(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(card_id, reference_month)
);

-- Enable RLS on card_statements
ALTER TABLE public.card_statements ENABLE ROW LEVEL SECURITY;

-- RLS policies for card_statements (users can only access statements for their own cards)
CREATE POLICY "Users can view own card_statements" 
ON public.card_statements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM banks b
  JOIN cards c ON c.bank_id = b.id
  WHERE c.id = card_statements.card_id AND b.user_id = auth.uid()
));

CREATE POLICY "Users can insert own card_statements" 
ON public.card_statements 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM banks b
  JOIN cards c ON c.bank_id = b.id
  WHERE c.id = card_statements.card_id AND b.user_id = auth.uid()
));

CREATE POLICY "Users can update own card_statements" 
ON public.card_statements 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM banks b
  JOIN cards c ON c.bank_id = b.id
  WHERE c.id = card_statements.card_id AND b.user_id = auth.uid()
));

CREATE POLICY "Users can delete own card_statements" 
ON public.card_statements 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM banks b
  JOIN cards c ON c.bank_id = b.id
  WHERE c.id = card_statements.card_id AND b.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_card_statements_updated_at
BEFORE UPDATE ON public.card_statements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();