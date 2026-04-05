-- Add card_id column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL;

-- Create trigger function to update card used_amount on transaction insert
CREATE OR REPLACE FUNCTION public.update_card_used_amount_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.card_id IS NOT NULL AND NEW.type = 'expense' THEN
    UPDATE public.cards
    SET used_amount = used_amount + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.card_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger function to update card used_amount on transaction delete
CREATE OR REPLACE FUNCTION public.update_card_used_amount_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.card_id IS NOT NULL AND OLD.type = 'expense' THEN
    UPDATE public.cards
    SET used_amount = used_amount - OLD.amount,
        updated_at = NOW()
    WHERE id = OLD.card_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger function to update card used_amount on transaction update
CREATE OR REPLACE FUNCTION public.update_card_used_amount_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If card changed or amount changed
  IF OLD.card_id IS DISTINCT FROM NEW.card_id OR OLD.amount != NEW.amount OR OLD.type != NEW.type THEN
    -- Decrease old card used_amount if it was an expense
    IF OLD.card_id IS NOT NULL AND OLD.type = 'expense' THEN
      UPDATE public.cards
      SET used_amount = used_amount - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.card_id;
    END IF;
    
    -- Increase new card used_amount if it's an expense
    IF NEW.card_id IS NOT NULL AND NEW.type = 'expense' THEN
      UPDATE public.cards
      SET used_amount = used_amount + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.card_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach triggers to transactions table
CREATE TRIGGER trigger_update_card_on_insert
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_card_used_amount_on_insert();

CREATE TRIGGER trigger_update_card_on_delete
AFTER DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_card_used_amount_on_delete();

CREATE TRIGGER trigger_update_card_on_update
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_card_used_amount_on_update();

-- Add index on card_id for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON public.transactions(card_id);