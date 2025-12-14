import { PackageRelease } from '../types/DownloadSeries';
import { normalizePackageName } from './npmClient';

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface RegistryMetadataResponse {
  time?: Record<string, string>;
}

export interface NpmRegistryClientOptions {
  baseUrl?: string;
  fetchFn?: FetchFn;
}

const DEFAULT_BASE_URL = 'https://registry.npmjs.org';
const RESERVED_TIME_KEYS = new Set(['created', 'modified']);

export class NpmRegistryClient {
  private readonly baseUrl: string;

  private readonly fetchFn: FetchFn;

  private cache = new Map<string, PackageRelease[]>();

  constructor(options: NpmRegistryClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
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

  async fetchReleaseTimeline(pkg: string): Promise<PackageRelease[]> {
    const packageName = normalizePackageName(pkg);
    if (!packageName) {
      return [];
    }

    const cached = this.cache.get(packageName);
    if (cached) {
      return cached;
    }

    const url = `${this.baseUrl}/${encodeURIComponent(packageName)}`;

    const payload = await this.requestMetadata(url);
    const releases = this.extractReleases(payload.time);

    this.cache.set(packageName, releases);
    return releases;
  }

  private async requestMetadata(url: string): Promise<RegistryMetadataResponse> {
    let response: Response;
    try {
      response = await this.fetchFn(url);
    } catch (cause) {
      throw new Error('Failed to reach npm registry', { cause });
    }

    let payload: RegistryMetadataResponse;
    try {
      payload = (await response.json()) as RegistryMetadataResponse;
    } catch (cause) {
      throw new Error('Invalid JSON received from npm registry', { cause });
    }

    if (!response.ok) {
      throw new Error(`npm registry responded with ${response.status}`);
    }

    return payload;
  }

  private extractReleases(timeMap?: Record<string, string>): PackageRelease[] {
    if (!timeMap) {
      return [];
    }

    return Object.entries(timeMap)
      .filter(([version]) => !RESERVED_TIME_KEYS.has(version))
      .filter(([, date]) => this.isValidDate(date))
      .map(([version, date]) => ({
        version,
        date,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  private isValidDate(value: string | undefined): value is string {
    if (!value) {
      return false;
    }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp);
  }
}

export const npmRegistryClient = new NpmRegistryClient();

export const fetchPackageReleaseTimeline = (
  packageName: string,
  client: NpmRegistryClient = npmRegistryClient,
) => client.fetchReleaseTimeline(packageName);
