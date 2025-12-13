import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NpmDownloadsClient, normalizePackageName } from './npmClient';

import { NpmDownloadsSuccessResponse } from '../types/DownloadSeries';

const createSuccessResponse = (
  overrides: Partial<NpmDownloadsSuccessResponse> = {},
): NpmDownloadsSuccessResponse => ({
  start: '2024-01-01',
  end: '2024-12-31',
  downloads: [
    { day: '2024-01-01', downloads: 100 },
    { day: '2024-01-02', downloads: 150 },
  ],
  ...overrides,
});

const mockResponse = <T>(body: T, init: Partial<Response> = {}): Response =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
    ...init,
  }) as Response;

describe('NpmDownloadsClient', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('normalizes names, fetches data, and caches the result', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(mockResponse(createSuccessResponse()));
    const client = new NpmDownloadsClient({ fetchFn, debounceMs: 0 });

    const result = await client.fetchPackageDownloads(' React ');

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.npmjs.org/downloads/range/last-year/react',
    );
    expect(result.packageName).toBe('react');
    expect(result.totalDownloads).toBe(250);

    const cached = await client.fetchPackageDownloads('react');
    expect(cached).toBe(result);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('throws a NOT_FOUND error when API returns error payload', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        mockResponse({ error: 'package react not found' }, { status: 404, ok: false }),
      );
    const client = new NpmDownloadsClient({ fetchFn, debounceMs: 0 });

    await expect(client.fetchPackageDownloads('react')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      packageName: 'react',
    });
  });

  it('throws a NETWORK error when fetch fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
    const client = new NpmDownloadsClient({ fetchFn, debounceMs: 0 });

    await expect(client.fetchPackageDownloads('vue')).rejects.toMatchObject({
      code: 'NETWORK',
      packageName: 'vue',
    });
  });

  it('debounces repeated requests within the configured window', async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn()
      .mockResolvedValue(mockResponse(createSuccessResponse()));
    const client = new NpmDownloadsClient({ fetchFn, debounceMs: 300 });

    const promiseA = client.fetchPackageDownloads('react');
    const promiseB = client.fetchPackageDownloads('react');

    expect(fetchFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(299);
    expect(fetchFn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([promiseA, promiseB]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('normalizePackageName', () => {
  it('trims and lowercases values', () => {
    expect(normalizePackageName('  React-DOM  ')).toBe('react-dom');
  });
});
