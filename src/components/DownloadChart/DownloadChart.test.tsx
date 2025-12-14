import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DownloadChart from './DownloadChart';
import { buildChartData, buildReleaseMarkers } from './buildChartData';
import { DownloadSeries } from '../../types/DownloadSeries';
import { packagesStore } from '../../store/packagesStore';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => {
      if (!children) {
        return null;
      }
      const element = React.Children.only(children) as React.ReactElement<{
        width?: number | string;
        height?: number | string;
      }>;
      return React.cloneElement(element, { width: 800, height: 360 });
    },
  };
});

const createSeries = (
  packageName: string,
  points: DownloadSeries['points'],
  releases: DownloadSeries['releases'] = [],
): DownloadSeries => ({
  packageName,
  start: points[0]?.date ?? '2024-01-01',
  end: points.at(-1)?.date ?? '2024-01-02',
  totalDownloads: points.reduce((sum, point) => sum + point.downloads, 0),
  lastDayDownloads: points.at(-1)?.downloads ?? 0,
  points,
  releases,
});

describe('buildChartData', () => {
  it('merges series into chronological chart rows', () => {
    const chart = buildChartData([
      createSeries('react', [
        { date: '2024-01-01', downloads: 10 },
        { date: '2024-01-02', downloads: 12 },
      ]),
      createSeries('vue', [
        { date: '2024-01-01', downloads: 5 },
        { date: '2024-01-03', downloads: 15 },
      ]),
    ]);

    expect(chart).toHaveLength(3);
    expect(chart[0]).toMatchObject({ date: '2024-01-01', react: 10, vue: 5 });
    expect(chart[1]).toMatchObject({ date: '2024-01-02', react: 12 });
    expect(chart[2]).toMatchObject({ date: '2024-01-03', vue: 15 });
  });
});

describe('buildReleaseMarkers', () => {
  it('aligns release dates with their containing buckets', () => {
    const markers = buildReleaseMarkers([
      createSeries(
        'react',
        [
          { date: '2024-01-01', downloads: 70 },
          { date: '2024-01-08', downloads: 120 },
        ],
        [
          { version: '1.0.0', date: '2024-01-03T00:00:00.000Z' },
          { version: '1.1.0', date: '2024-01-10T00:00:00.000Z' },
        ],
      ),
    ]);

    expect(markers).toEqual([
      {
        packageName: 'react',
        version: '1.0.0',
        releaseDate: '2024-01-03T00:00:00.000Z',
        bucketDate: '2024-01-01',
        downloads: 70,
      },
      {
        packageName: 'react',
        version: '1.1.0',
        releaseDate: '2024-01-10T00:00:00.000Z',
        bucketDate: '2024-01-08',
        downloads: 120,
      },
    ]);
  });
});

describe('DownloadChart component', () => {
  beforeEach(() => {
    packagesStore.setState((state) => ({
      ...state,
      packages: [],
      datasets: {},
      status: {},
      errors: {},
    }));
  });

  it('renders an empty state by default', () => {
    render(<DownloadChart />);
    expect(screen.getByText(/Add an npm package/i)).toBeInTheDocument();
  });

  it('renders a chart region once datasets exist', () => {
    packagesStore.setState((state) => ({
      ...state,
      packages: ['react'],
      datasets: {
        ...state.datasets,
        react: createSeries('react', [
          { date: '2024-01-01', downloads: 10 },
          { date: '2024-01-02', downloads: 20 },
        ]),
      },
    }));

    render(<DownloadChart />);

    expect(
      screen.getByRole('region', { name: /npm downloads chart/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/react/i)).toBeInTheDocument();
  });

  it('disables the release toggle when no markers exist', () => {
    packagesStore.setState((state) => ({
      ...state,
      packages: ['react'],
      datasets: {
        ...state.datasets,
        react: createSeries('react', [
          { date: '2024-01-01', downloads: 10 },
          { date: '2024-01-08', downloads: 20 },
        ]),
      },
    }));

    render(<DownloadChart />);

    const toggle = screen.getByLabelText<HTMLInputElement>(/release markers/i);
    expect(toggle).toBeDisabled();
  });

  it('enables the release toggle when release markers exist', () => {
    packagesStore.setState((state) => ({
      ...state,
      packages: ['react'],
      datasets: {
        ...state.datasets,
        react: createSeries(
          'react',
          [
            { date: '2024-01-01', downloads: 10 },
            { date: '2024-01-08', downloads: 20 },
          ],
          [{ version: '1.0.0', date: '2024-01-03T00:00:00.000Z' }],
        ),
      },
    }));

    render(<DownloadChart />);

    const toggle = screen.getByLabelText<HTMLInputElement>(/release markers/i);
    expect(toggle).not.toBeDisabled();
    expect(toggle.checked).toBe(true);
  });
});
