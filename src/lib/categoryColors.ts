// Generate consistent colors for categories based on name hash
const CATEGORY_COLORS = [
  "hsl(142, 76%, 36%)", // emerald
  "hsl(217, 91%, 60%)", // blue
  "hsl(262, 83%, 58%)", // violet
  "hsl(38, 92%, 50%)",  // amber
  "hsl(0, 84%, 60%)",   // red
  "hsl(187, 85%, 43%)", // cyan
  "hsl(330, 81%, 60%)", // pink
  "hsl(84, 81%, 44%)",  // lime
  "hsl(25, 95%, 53%)",  // orange
  "hsl(239, 84%, 67%)", // indigo
  "hsl(172, 66%, 50%)", // teal
  "hsl(291, 64%, 42%)", // purple
];

// Hash function to get consistent index from string
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const getCategoryColor = (categoryName: string): string => {
  const index = hashString(categoryName) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
};

export const getSubcategoryColor = (categoryName: string, subcategoryName: string): string => {
  const combinedName = `${categoryName}-${subcategoryName}`;
  const index = hashString(combinedName) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
};

export { CATEGORY_COLORS };
