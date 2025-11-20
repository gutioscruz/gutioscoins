import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { defaultIncomeCategories, defaultExpenseCategories } from '@/types/finance';

export const useInitializeUserData = () => {
  const { user } = useAuth();
  const { categories } = useCategories();

  useEffect(() => {
    const initializeCategories = async () => {
      if (!user || categories.length > 0) return;

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
  }, [user, categories]);
};
