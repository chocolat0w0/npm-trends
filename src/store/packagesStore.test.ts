import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPackagesStore,
  selectOrderedSeries,
  selectPackageSummaries,
} from './packagesStore';
import { DownloadSeries } from '../types/DownloadSeries';

const createSeries = (
  packageName: string,
  overrides: Partial<DownloadSeries> = {},
): DownloadSeries => ({
  packageName,
  start: '2024-01-01',
  end: '2024-12-31',
  totalDownloads: 100,
  lastDayDownloads: 10,
  points: [
    { date: '2024-01-01', downloads: 5 },
    { date: '2024-01-02', downloads: 5 },
  ],
  ...overrides,
});

describe('packagesStore', () => {
  const createFetchMock = () => vi.fn((pkg: string) => Promise.resolve(createSeries(pkg)));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds normalized packages, fetches data, and tracks success status', async () => {
    const fetchDownloads = createFetchMock();
    const store = createPackagesStore({ fetchDownloads });

    await store.getState().addPackage(' React ');

    expect(fetchDownloads).toHaveBeenCalledWith('react');
    expect(store.getState().packages).toEqual(['react']);
    expect(store.getState().datasets.react?.packageName).toBe('react');
    expect(store.getState().status.react).toBe('success');
  });

  it('ignores duplicate package entries', async () => {
    const fetchDownloads = createFetchMock();
    const store = createPackagesStore({ fetchDownloads });

    await store.getState().addPackage('react');
    await store.getState().addPackage('React');

    expect(fetchDownloads).toHaveBeenCalledTimes(1);
    expect(store.getState().packages).toEqual(['react']);
  });

  it('records fetch failures as errors', async () => {
    const fetchDownloads = vi.fn().mockRejectedValue(new Error('boom'));
    const store = createPackagesStore({ fetchDownloads });

    await store.getState().addPackage('react');

    expect(store.getState().status.react).toBe('error');
    expect(store.getState().errors.react).toBe('boom');
  });

  it('removes packages and related state cleanly', async () => {
    const fetchDownloads = createFetchMock();
    const store = createPackagesStore({ fetchDownloads });

    await store.getState().addPackage('react');
    store.getState().removePackage('react');

    expect(store.getState().packages).toHaveLength(0);
    expect(store.getState().datasets.react).toBeUndefined();
    expect(store.getState().status.react).toBeUndefined();
    expect(store.getState().errors.react).toBeUndefined();
  });

  it('initializes from URL packages without refetching cached data', async () => {
    const fetchDownloads = createFetchMock();
    const store = createPackagesStore({ fetchDownloads });

    await store.getState().addPackage('react');
    await store.getState().initializeFromQuery(['React', 'Vue', 'react']);

    expect(store.getState().packages).toEqual(['react', 'vue']);
    expect(fetchDownloads).toHaveBeenCalledTimes(2);
  });

  it('refreshes an existing package when requested', async () => {
    const fetchDownloads = createFetchMock();
    const store = createPackagesStore({ fetchDownloads });

    await store.getState().addPackage('react');

    fetchDownloads.mockResolvedValueOnce(createSeries('react', { totalDownloads: 999 }));
    await store.getState().refreshPackage('react');

    expect(store.getState().datasets.react?.totalDownloads).toBe(999);
  });

  it('exposes derived selectors for charting and summaries', async () => {
    const fetchDownloads = createFetchMock();
    const store = createPackagesStore({ fetchDownloads });

    await store.getState().addPackage('react');
    await store.getState().addPackage('vue');

    const orderedSeries = selectOrderedSeries(store.getState());
    expect(orderedSeries.map((series) => series.packageName)).toEqual(['react', 'vue']);

    const summaries = selectPackageSummaries(store.getState());
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({
      packageName: 'react',
      status: 'success',
      totalDownloads: 100,
    });
  });
});
