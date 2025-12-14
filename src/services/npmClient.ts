import {
  DownloadSeries,
  NpmDownloadPoint,
  NpmDownloadsApiResponse,
  NpmDownloadsSuccessResponse,
  isNpmDownloadsError,
} from '../types/DownloadSeries';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type NpmClientErrorCode = 'NETWORK' | 'NOT_FOUND' | 'INVALID_RESPONSE';

export class NpmClientError extends Error {
  readonly code: NpmClientErrorCode;

  readonly packageName: string;

  readonly status?: number;

  constructor(message: string, options: {
    code: NpmClientErrorCode;
    packageName: string;
    cause?: unknown;
    status?: number;
  }) {
    super(message, { cause: options.cause });
    this.code = options.code;
    this.packageName = options.packageName;
    this.status = options.status;
    this.name = 'NpmClientError';
  }
}

export interface NpmClientOptions {
  baseUrl?: string;
  debounceMs?: number;
  fetchFn?: FetchFn;
}

const DEFAULT_BASE_URL = 'https://api.npmjs.org/downloads/range/last-year';
const DEFAULT_DEBOUNCE_MS = 300;

export const normalizePackageName = (value: string): string => value.trim().toLowerCase();

export class NpmDownloadsClient {
  private readonly baseUrl: string;

  private readonly debounceMs: number;

  private readonly fetchFn: FetchFn;

  private cache = new Map<string, DownloadSeries>();

  private pending = new Map<string, Promise<DownloadSeries>>();

  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(options: NpmClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
  }

  clearCache(packageName?: string) {
    if (packageName) {
      const normalized = normalizePackageName(packageName);
      this.cache.delete(normalized);
      return;
    }
    this.cache.clear();
  }

  async fetchPackageDownloads(pkg: string): Promise<DownloadSeries> {
    const packageName = normalizePackageName(pkg);
    if (!packageName) {
      throw new NpmClientError('Package name is required', {
        code: 'INVALID_RESPONSE',
        packageName,
      });
    }

    const cached = this.cache.get(packageName);
    if (cached) {
      return cached;
    }

    const pendingRequest = this.pending.get(packageName);
    if (pendingRequest) {
      return pendingRequest;
    }

    const requestPromise = new Promise<DownloadSeries>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.timers.delete(packageName);
        this.executeFetch(packageName)
          .then((series) => {
            this.cache.set(packageName, series);
            resolve(series);
          })
          .catch(reject)
          .finally(() => {
            this.pending.delete(packageName);
          });
      }, this.debounceMs);

      this.timers.set(packageName, timer);
    });

    this.pending.set(packageName, requestPromise);
    return requestPromise;
  }

  private async executeFetch(packageName: string): Promise<DownloadSeries> {
    const url = `${this.baseUrl}/${encodeURIComponent(packageName)}`;
    let response: Response;
    try {
      response = await this.fetchFn(url);
    } catch (cause) {
      throw new NpmClientError('Failed to reach npm downloads API', {
        code: 'NETWORK',
        packageName,
        cause,
      });
    }

    let payload: NpmDownloadsApiResponse;
    try {
      payload = (await response.json()) as NpmDownloadsApiResponse;
    } catch (cause) {
      throw new NpmClientError('Invalid JSON received from npm downloads API', {
        code: 'INVALID_RESPONSE',
        packageName,
        cause,
        status: response.status,
      });
    }

    if (!response.ok || isNpmDownloadsError(payload)) {
      const message = isNpmDownloadsError(payload)
        ? payload.error
        : `npm downloads API responded with ${response.status}`;
      throw new NpmClientError(message, {
        code: 'NOT_FOUND',
        packageName,
        status: response.status,
      });
    }

    return this.transformResponse(packageName, payload);
  }

  private transformResponse(
    packageName: string,
    payload: NpmDownloadsSuccessResponse,
  ): DownloadSeries {
    const points = this.aggregateWeeklyPoints(payload.downloads);
    const totalDownloads = points.reduce((sum, point) => sum + point.downloads, 0);
    const lastDayDownloads = payload.downloads.at(-1)?.downloads ?? 0;

    return {
      packageName,
      start: payload.start,
      end: payload.end,
      points,
      totalDownloads,
      lastDayDownloads,
      releases: [],
    };
  }

  private aggregateWeeklyPoints(points: NpmDownloadPoint[]) {
    if (points.length === 0) {
      return [] as DownloadSeries['points'];
    }

    const result: DownloadSeries['points'] = [];
    let bucketStart: string | null = null;
    let bucketSum = 0;
    let dayCount = 0;

    for (const point of points) {
      bucketStart ??= point.day;

      bucketSum += point.downloads;
      dayCount += 1;

      const bucketFilled = dayCount === 7;

      if (bucketFilled && bucketStart) {
        result.push({
          date: bucketStart,
          downloads: bucketSum,
        });
        bucketStart = null;
        bucketSum = 0;
        dayCount = 0;
      }
    }

    return result;
  }
}

export const npmDownloadsClient = new NpmDownloadsClient();

export const fetchPackageDownloads = (
  packageName: string,
  client: NpmDownloadsClient = npmDownloadsClient,
) => client.fetchPackageDownloads(packageName);
