import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PackageForm from './PackageForm';
import { packagesStore } from '../../store/packagesStore';
import { DownloadSeries } from '../../types/DownloadSeries';
import { fetchPackageDownloads } from '../../services/npmClient';

vi.mock('../../services/npmClient', async () => {
  const actual = await vi.importActual<typeof import('../../services/npmClient')>(
    '../../services/npmClient',
  );

  const createSeries = (packageName: string): DownloadSeries => ({
    packageName,
    start: '2024-01-01',
    end: '2024-12-31',
    points: [],
    totalDownloads: 0,
    lastDayDownloads: 0,
  });

  return {
    ...actual,
    fetchPackageDownloads: vi.fn((packageName: string) =>
      Promise.resolve(createSeries(packageName)),
    ),
  };
});

const createDeferredSeries = () => {
  let resolve!: (value: DownloadSeries) => void;
  const promise = new Promise<DownloadSeries>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const resetStore = () => {
  packagesStore.setState(
    {
      packages: [],
      datasets: {},
      status: {},
      errors: {},
    },
    false,
  );
};

describe('PackageForm', () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(fetchPackageDownloads).mockClear();
  });

  it('validates empty input before allowing submission', async () => {
    const user = userEvent.setup();
    render(<PackageForm />);

    const input = screen.getByLabelText(/package name/i);
    const submit = screen.getByRole('button', { name: /add package/i });

    expect(submit).toBeDisabled();

    await user.click(input);
    await user.tab();

    expect(
      screen.getByText('Enter a package name to continue.'),
    ).toBeInTheDocument();
  });

  it('normalizes and submits package names', async () => {
    const user = userEvent.setup();
    render(<PackageForm />);

    const input = screen.getByLabelText(/package name/i);
    const submit = screen.getByRole('button', { name: /add package/i });

    await user.type(input, '  React  ');
    await user.click(submit);

    await screen.findByText(/tracking 1 package/i);

    expect(packagesStore.getState().packages).toEqual(['react']);
    expect(fetchPackageDownloads).toHaveBeenCalledWith('react');
    expect(input).toHaveValue('');
  });

  it('prevents duplicates and surfaces helper text', async () => {
    packagesStore.setState(
      (state) => ({
        packages: ['react'],
        status: { ...state.status },
      }),
      false,
    );

    const user = userEvent.setup();
    render(<PackageForm />);

    const input = screen.getByLabelText(/package name/i);
    const submit = screen.getByRole('button', { name: /add package/i });

    await user.type(input, 'React');
    await user.click(submit);

    expect(
      screen.getByText('react is already in the list.'),
    ).toBeInTheDocument();
    expect(fetchPackageDownloads).not.toHaveBeenCalled();
  });

  it('keeps helper text friendly while submission is pending', async () => {
    const deferred = createDeferredSeries();
    vi.mocked(fetchPackageDownloads).mockReturnValueOnce(deferred.promise);

    const user = userEvent.setup();
    render(<PackageForm />);

    const input = screen.getByLabelText(/package name/i);
    const submit = screen.getByRole('button', { name: /add package/i });

    await user.type(input, 'react');
    await user.click(submit);

    expect(
      screen.queryByText('react is already in the list.'),
    ).not.toBeInTheDocument();
    expect(input).toHaveValue('');

    deferred.resolve({
      packageName: 'react',
      start: '2024-01-01',
      end: '2024-12-31',
      totalDownloads: 0,
      lastDayDownloads: 0,
      points: [],
    });

    await screen.findByText(/tracking 1 package/i);
  });
});
