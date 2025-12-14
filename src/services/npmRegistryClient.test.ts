import { describe, it, expect, vi } from 'vitest';
import {
  NpmRegistryClient,
  fetchPackageReleaseTimeline,
} from './npmRegistryClient';

const mockResponse = <T>(body: T, init: Partial<Response> = {}): Response =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
    ...init,
  }) as Response;

describe('NpmRegistryClient', () => {
  it('fetches release data, filters reserved keys, and caches results', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      mockResponse({
        time: {
          created: '2020-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
          '1.0.0': '2024-01-02T00:00:00.000Z',
          '1.1.0': '2024-02-02T00:00:00.000Z',
        },
      }),
    );
    const client = new NpmRegistryClient({ fetchFn });

    const releases = await client.fetchReleaseTimeline('React');

    expect(fetchFn).toHaveBeenCalledWith('https://registry.npmjs.org/react');
    expect(releases).toEqual([
      { version: '1.0.0', date: '2024-01-02T00:00:00.000Z' },
      { version: '1.1.0', date: '2024-02-02T00:00:00.000Z' },
    ]);

    const cached = await client.fetchReleaseTimeline('react');
    expect(cached).toBe(releases);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('drops invalid dates gracefully', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      mockResponse({
        time: {
          '1.0.0': 'invalid-date',
          '1.1.0': '2024-03-03T00:00:00.000Z',
        },
      }),
    );
    const client = new NpmRegistryClient({ fetchFn });

    const releases = await client.fetchReleaseTimeline('vue');

    expect(releases).toEqual([{ version: '1.1.0', date: '2024-03-03T00:00:00.000Z' }]);
  });

  it('throws when the registry request fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(
      fetchPackageReleaseTimeline('svelte', new NpmRegistryClient({ fetchFn })),
    ).rejects.toThrow('Failed to reach npm registry');
  });
});
