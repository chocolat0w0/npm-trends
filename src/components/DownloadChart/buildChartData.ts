import { DownloadSeries } from '../../types/DownloadSeries';

export type ChartDatum = {
  date: string;
} & Record<string, number | string>;

export const buildChartData = (seriesList: DownloadSeries[]): ChartDatum[] => {
  const buckets = new Map<string, ChartDatum>();

  seriesList.forEach((series) => {
    series.points.forEach((point) => {
      const bucket = buckets.get(point.date) ?? { date: point.date };
      bucket[series.packageName] = point.downloads;
      buckets.set(point.date, bucket);
    });
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, value]) => value);
};
