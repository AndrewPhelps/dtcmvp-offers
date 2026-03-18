// Color scheme for each category color
export const categoryColorMap: Record<string, { bg: string; text: string; badge: string }> = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    badge: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  teal: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    badge: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  },
};

// Tag badge style (always gray)
export const tagBadgeStyle = 'bg-gray-500/20 text-gray-400 border-gray-500/30';

export const getCategoryColorByColorName = (color: string) => {
  return categoryColorMap[color] || categoryColorMap['blue'];
};
