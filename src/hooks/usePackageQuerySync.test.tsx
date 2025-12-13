import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { packagesStore } from '../store/packagesStore';
import { usePackageQuerySync } from './usePackageQuerySync';

vi.mock('../services/npmClient', async () => {
  const actual = await vi.importActual<typeof import('../services/npmClient')>(
    '../services/npmClient',
  );
  return {
    ...actual,
    fetchPackageDownloads: vi.fn((packageName: string) =>
      Promise.resolve({
        packageName,
        start: '2024-01-01',
        end: '2024-12-31',
        points: [],
        totalDownloads: 0,
        lastDayDownloads: 0,
      }),
    ),
  };
});

const HookHarness = () => {
  usePackageQuerySync();
  return null;
};

describe('usePackageQuerySync', () => {
  beforeEach(() => {
    packagesStore.setState((state) => ({
      ...state,
      packages: [],
      datasets: {},
      status: {},
      errors: {},
    }));
    window.history.replaceState({}, '', 'http://localhost/');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('hydrates packages from the URL query on mount', async () => {
    window.history.replaceState({}, '', 'http://localhost/?packages=React,%20Vue,react');

    render(<HookHarness />);

    await waitFor(() => {
      expect(packagesStore.getState().packages).toEqual(['react', 'vue']);
    });
    await waitFor(() => {
      expect(window.location.search).toBe('?packages=react,vue');
    });
  });

  it('updates the query string when packages change', async () => {
    render(<HookHarness />);

    await act(async () => {
      await packagesStore.getState().addPackage('React');
    });
    expect(window.location.search).toBe('?packages=react');

    await act(async () => {
      await packagesStore.getState().addPackage('vue');
    });
    expect(window.location.search).toBe('?packages=react,vue');

    act(() => {
      packagesStore.getState().removePackage('react');
      packagesStore.getState().removePackage('vue');
    });
    expect(window.location.search).toBe('');
  });
});
