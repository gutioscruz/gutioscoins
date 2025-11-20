import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { defaultIncomeCategories, defaultExpenseCategories } from '@/types/finance';

export const useInitializeUserData = () => {
  const { user } = useAuth();
  const { categories, isLoading } = useCategories();
  const hasInitialized = useRef(false);

  useEffect(() => {
    const initializeCategories = async () => {
      if (!user || isLoading || hasInitialized.current) return;
      if (categories.length > 0) {
        hasInitialized.current = true;
        return;
      }

      hasInitialized.current = true;

      // Insert default categories for new users
      const defaultCategories = [...defaultIncomeCategories, ...defaultExpenseCategories];
      
      for (const category of defaultCategories) {
        await supabase.from('categories').insert({
          user_id: user.id,
          name: category.name,
          type: category.type,
          subcategories: category.subcategories,
        });
      }
    };

    initializeCategories();
  }, [user, categories, isLoading]);
};
