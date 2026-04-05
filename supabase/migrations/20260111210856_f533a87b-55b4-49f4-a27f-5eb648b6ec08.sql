-- Função que atualiza o total da fatura quando transações mudam
CREATE OR REPLACE FUNCTION public.update_card_statement_total()
RETURNS TRIGGER AS $$
DECLARE
    ref_month DATE;
    statement_id UUID;
    new_total NUMERIC;
    card_closing_day INTEGER;
    card_due_day INTEGER;
    target_card_id UUID;
    target_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Determina o card_id e date relevantes (NEW para INSERT/UPDATE, OLD para DELETE)
    IF TG_OP = 'DELETE' THEN
        target_card_id := OLD.card_id;
        target_date := OLD.date;
        
        -- Se não tem card_id, não faz nada
        IF target_card_id IS NULL THEN
            RETURN OLD;
        END IF;
    ELSE
        target_card_id := NEW.card_id;
        target_date := NEW.date;
        
        -- Se não tem card_id, não faz nada
        IF target_card_id IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Só processa despesas
        IF NEW.type != 'expense' THEN
            RETURN NEW;
        END IF;
    END IF;
    
    ref_month := date_trunc('month', target_date)::DATE;
    
    -- Busca dados do cartão para closing_day e due_day
    SELECT closing_day, due_day INTO card_closing_day, card_due_day
    FROM public.cards WHERE id = target_card_id;
    
    -- Busca a fatura existente
    SELECT id INTO statement_id
    FROM public.card_statements
    WHERE card_id = target_card_id AND reference_month = ref_month;
    
    -- Se não existe fatura e estamos inserindo/atualizando, cria uma
    IF statement_id IS NULL AND TG_OP != 'DELETE' THEN
        INSERT INTO public.card_statements (
            card_id, 
            reference_month, 
            closing_date, 
            due_date, 
            total_amount, 
            status
        ) VALUES (
            target_card_id,
            ref_month,
            (ref_month + (COALESCE(card_closing_day, 1) - 1) * INTERVAL '1 day')::DATE,
            ((ref_month + INTERVAL '1 month') + (COALESCE(card_due_day, 10) - 1) * INTERVAL '1 day')::DATE,
            0,
            'open'
        )
        RETURNING id INTO statement_id;
    END IF;
    
    -- Se temos uma fatura, recalcula o total
    IF statement_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO new_total
        FROM public.transactions
        WHERE card_id = target_card_id 
          AND type = 'expense'
          AND date >= ref_month 
          AND date < (ref_month + INTERVAL '1 month');
        
        UPDATE public.card_statements 
        SET total_amount = new_total, updated_at = NOW()
        WHERE id = statement_id;
    END IF;
    
    -- Para UPDATE, também precisa atualizar a fatura antiga se o mês mudou
    IF TG_OP = 'UPDATE' AND OLD.card_id IS NOT NULL THEN
        DECLARE
            old_ref_month DATE;
            old_statement_id UUID;
            old_total NUMERIC;
        BEGIN
            old_ref_month := date_trunc('month', OLD.date)::DATE;
            
            -- Se mudou de mês ou de cartão, atualiza a fatura antiga também
            IF old_ref_month != ref_month OR OLD.card_id != NEW.card_id THEN
                SELECT id INTO old_statement_id
                FROM public.card_statements
                WHERE card_id = OLD.card_id AND reference_month = old_ref_month;
                
                IF old_statement_id IS NOT NULL THEN
                    SELECT COALESCE(SUM(amount), 0) INTO old_total
                    FROM public.transactions
                    WHERE card_id = OLD.card_id 
                      AND type = 'expense'
                      AND date >= old_ref_month 
                      AND date < (old_ref_month + INTERVAL '1 month');
                    
                    UPDATE public.card_statements 
                    SET total_amount = old_total, updated_at = NOW()
                    WHERE id = old_statement_id;
                END IF;
            END IF;
        END;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remove trigger antigo se existir e cria o novo
DROP TRIGGER IF EXISTS trigger_update_card_statement ON public.transactions;
CREATE TRIGGER trigger_update_card_statement
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_card_statement_total();

-- Recalcula todas as faturas existentes para corrigir totais desatualizados
UPDATE public.card_statements cs
SET total_amount = (
    SELECT COALESCE(SUM(t.amount), 0)
    FROM public.transactions t
    WHERE t.card_id = cs.card_id
      AND t.type = 'expense'
      AND t.date >= cs.reference_month
      AND t.date < (cs.reference_month + INTERVAL '1 month')
),
updated_at = NOW();