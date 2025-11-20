import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';

// This hook is DISABLED to prevent duplicate category creation issues
// Categories should be created manually by the user through the Categories page
// 
// The automatic initialization was causing race conditions where multiple
// category sets were being inserted before the query could refresh
export const useInitializeUserData = () => {
  // Hook is intentionally empty to prevent automatic category creation
  // Users can manually create their categories in the Categories page
};
