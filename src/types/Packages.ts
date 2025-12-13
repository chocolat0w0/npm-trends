import { DownloadSeries } from './DownloadSeries';

export type PackageRequestStatus = 'idle' | 'loading' | 'success' | 'error';

export interface PackageSummary extends DownloadSeries {
  status: PackageRequestStatus;
  error?: string;
}
