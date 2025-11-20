import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { defaultIncomeCategories, defaultExpenseCategories } from '@/types/finance';

// This hook is disabled to prevent duplicate category creation
// Categories should be created manually by the user or through a one-time migration
export const useInitializeUserData = () => {
  const { user } = useAuth();
  const { categories, isLoading } = useCategories();

  useEffect(() => {
    const initializeCategories = async () => {
      // Only initialize if user exists, categories are loaded, and no categories exist
      if (!user || isLoading) return;
      
      // Check if user already has categories
      if (categories.length > 0) return;

      // Check localStorage to see if we've already initialized for this user
      const initKey = `categories_initialized_${user.id}`;
      if (localStorage.getItem(initKey)) return;

      // Mark as initialized BEFORE inserting to prevent race conditions
      localStorage.setItem(initKey, 'true');

      // Insert default categories for new users
      const defaultCategories = [...defaultIncomeCategories, ...defaultExpenseCategories];
      
      // Use a single batch insert to avoid multiple category creations
      const { error } = await supabase.from('categories').insert(
        defaultCategories.map(category => ({
          user_id: user.id,
          name: category.name,
          type: category.type,
          subcategories: category.subcategories,
        }))
      );

      if (error) {
        console.error('Error initializing categories:', error);
        // Remove flag if there was an error
        localStorage.removeItem(initKey);
      }
    };

    initializeCategories();
  }, [user, categories.length, isLoading]);
};
