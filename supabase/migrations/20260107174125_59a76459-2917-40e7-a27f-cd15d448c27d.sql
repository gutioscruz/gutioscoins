-- Fase 2: Estrutura aprimorada para Empréstimos

-- Adicionar tipo de empréstimo
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_type') THEN
    CREATE TYPE public.loan_type AS ENUM ('consignado', 'fatura_parcelada', 'pessoal');
  END IF;
END $$;

-- Adicionar coluna loan_type na tabela loans
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS loan_type text DEFAULT 'pessoal';

-- Adicionar campos de desconto em loan_payments
ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

ALTER TABLE public.loan_payments 
ADD COLUMN IF NOT EXISTS final_paid_amount numeric;

-- Fase 3: Débito automático em cartões
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS auto_debit boolean DEFAULT false;

ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS auto_debit_bank_id uuid REFERENCES public.banks(id);