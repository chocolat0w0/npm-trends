export interface NpmDownloadPoint {
  day: string;
  downloads: number;
}

export interface NpmDownloadsSuccessResponse {
  downloads: NpmDownloadPoint[];
  start: string;
  end: string;
  package?: string;
}

export interface NpmDownloadsErrorResponse {
  error: string;
}

export type NpmDownloadsApiResponse =
  | NpmDownloadsSuccessResponse
  | NpmDownloadsErrorResponse;

export interface DownloadPoint {
  date: string;
  downloads: number;
}

export interface DownloadSeries {
  packageName: string;
  start: string;
  end: string;
  points: DownloadPoint[];
  totalDownloads: number;
  lastDayDownloads: number;
}

export const isNpmDownloadsError = (
  payload: NpmDownloadsApiResponse
): payload is NpmDownloadsErrorResponse =>
  typeof (payload as Partial<NpmDownloadsErrorResponse>).error === "string";
