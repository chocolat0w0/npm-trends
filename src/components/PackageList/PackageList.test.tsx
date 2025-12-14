import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PackageList from './PackageList';
import { packagesStore } from '../../store/packagesStore';
import { DownloadSeries } from '../../types/DownloadSeries';

const createSeries = (
  packageName: string,
  overrides: Partial<DownloadSeries> = {},
): DownloadSeries => ({
  packageName,
  start: '2024-01-01',
  end: '2024-12-31',
  totalDownloads: 1000,
  lastDayDownloads: 123,
  points: [],
  releases: overrides.releases ?? [],
  ...overrides,
});

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

describe('PackageList', () => {
  beforeEach(() => {
    resetStore();
  });

  it('shows placeholder content when no packages exist', () => {
    render(<PackageList />);
    expect(screen.getByText(/no packages tracked yet/i)).toBeInTheDocument();
    expect(screen.getByText(/add an npm package/i)).toBeInTheDocument();
  });

  it('renders package stats and supports removal', async () => {
    packagesStore.setState(
      {
        packages: ['react', 'vue'],
        datasets: {
          react: createSeries('react', {
            lastDayDownloads: 1200,
            totalDownloads: 500000,
          }),
          vue: createSeries('vue', {
            lastDayDownloads: 800,
            totalDownloads: 300000,
          }),
        },
        status: { react: 'success', vue: 'success' },
        errors: {},
      },
      false,
    );

    const user = userEvent.setup();
    render(<PackageList />);

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText(/1,200 last day/i)).toBeInTheDocument();
    expect(screen.getByText(/500,000 last 365 days/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove react/i }));
    expect(screen.queryByText('react')).not.toBeInTheDocument();
    expect(screen.getByText('vue')).toBeInTheDocument();
  });

  it('indicates loading and error states', () => {
    packagesStore.setState(
      {
        packages: ['react', 'vue'],
        datasets: {
          react: createSeries('react'),
          vue: createSeries('vue'),
        },
        status: { react: 'loading', vue: 'error' },
        errors: { vue: 'Not found' },
      },
      false,
    );

    render(<PackageList />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.getByText('Not found')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });
});
