export const SERIES_COLORS = [
  '#8EF2FF',
  '#F6C177',
  '#F78EA7',
  '#7EE0A3',
  '#C3A6FF',
  '#FF8674',
  '#5CD6FF',
  '#FFB347',
  '#8AE6C3',
];

export const getSeriesColor = (index: number): string =>
  SERIES_COLORS[Math.abs(index) % SERIES_COLORS.length];
