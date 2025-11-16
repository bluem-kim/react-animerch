// Color mapping utility for displaying color swatches
export const colorMap = {
  // Reds
  'red': '#EF4444',
  'crimson': '#DC143C',
  'maroon': '#800000',
  'scarlet': '#FF2400',
  
  // Blues
  'blue': '#3B82F6',
  'navy': '#000080',
  'royal blue': '#4169E1',
  'sky blue': '#87CEEB',
  'cyan': '#00FFFF',
  'teal': '#008080',
  'turquoise': '#40E0D0',
  
  // Greens
  'green': '#22C55E',
  'lime': '#00FF00',
  'olive': '#808000',
  'emerald': '#50C878',
  'mint': '#98FF98',
  
  // Yellows/Oranges
  'yellow': '#FBBF24',
  'gold': '#FFD700',
  'orange': '#F97316',
  'amber': '#FFBF00',
  'peach': '#FFE5B4',
  
  // Purples/Pinks
  'purple': '#A855F7',
  'violet': '#8B00FF',
  'magenta': '#FF00FF',
  'pink': '#EC4899',
  'rose': '#FF007F',
  'lavender': '#E6E6FA',
  
  // Neutrals
  'black': '#000000',
  'white': '#FFFFFF',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'silver': '#C0C0C0',
  'brown': '#A52A2A',
  'beige': '#F5F5DC',
  'cream': '#FFFDD0',
  'ivory': '#FFFFF0',
  
  // Multicolor
  'multicolor': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'rainbow': 'linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)',
};

/**
 * Get color hex value from color name
 * @param {string} colorName - The color name
 * @returns {string} - Hex color code or gradient
 */
export const getColorValue = (colorName) => {
  if (!colorName) return '#9CA3AF'; // default gray
  const normalized = colorName.toLowerCase().trim();
  return colorMap[normalized] || '#9CA3AF';
};

/**
 * Determine if text should be white or black based on background color
 * @param {string} hexColor - Hex color code
 * @returns {string} - 'white' or 'black'
 */
export const getContrastText = (hexColor) => {
  if (!hexColor || hexColor.startsWith('linear-gradient')) return 'white';
  
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? 'black' : 'white';
};
