import { DownloadSeries } from '../../types/DownloadSeries';

export type ChartDatum = {
  date: string;
} & Record<string, number | string>;

export interface ReleaseMarker {
  packageName: string;
  version: string;
  releaseDate: string;
  bucketDate: string;
  downloads: number;
}

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

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

const findBucketForRelease = (
  points: DownloadSeries['points'],
  releaseDate: string,
) => {
  const releaseTime = Date.parse(releaseDate);
  if (!Number.isFinite(releaseTime)) {
    return null;
  }

  for (const point of points) {
    const bucketStart = Date.parse(point.date);
    if (!Number.isFinite(bucketStart)) {
      continue;
    }
    const bucketEnd = bucketStart + WEEK_IN_MS;
    if (releaseTime >= bucketStart && releaseTime < bucketEnd) {
      return point;
    }
  }
  return null;
};

export const buildReleaseMarkers = (
  seriesList: DownloadSeries[],
): ReleaseMarker[] => {
  const markers: ReleaseMarker[] = [];

  seriesList.forEach((series) => {
    if (series.releases.length === 0 || series.points.length === 0) {
      return;
    }
    series.releases.forEach((release) => {
      const bucket = findBucketForRelease(series.points, release.date);
      if (!bucket) {
        return;
      }
      markers.push({
        packageName: series.packageName,
        version: release.version,
        releaseDate: release.date,
        bucketDate: bucket.date,
        downloads: bucket.downloads,
      });
    });
  });

  return markers;
};
