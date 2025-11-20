-- Add installment fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN is_installment BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN installment_count INTEGER,
ADD COLUMN installment_number INTEGER DEFAULT 1,
ADD COLUMN parent_transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE;

-- Add check constraints
ALTER TABLE public.transactions
ADD CONSTRAINT check_installment_count CHECK (
  (is_installment = false AND installment_count IS NULL) OR
  (is_installment = true AND installment_count > 0 AND installment_count <= 100)
);

ALTER TABLE public.transactions
ADD CONSTRAINT check_installment_number CHECK (
  installment_number >= 1 AND installment_number <= COALESCE(installment_count, 1)
);

-- Create index for better query performance
CREATE INDEX idx_transactions_parent_id ON public.transactions(parent_transaction_id);
CREATE INDEX idx_transactions_installment ON public.transactions(is_installment, parent_transaction_id) WHERE is_installment = true;