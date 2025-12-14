import { CSSProperties, SVGProps, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSeriesColor } from '../../constants/colors';
import {
  selectOrderedSeries,
  usePackagesStore,
} from '../../store/packagesStore';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { buildChartData, buildReleaseMarkers } from './buildChartData';
import './DownloadChart.css';

const dateTickFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const tooltipDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const releaseDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const downloadsFormatter = new Intl.NumberFormat('en-US');

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
});

const chartTickStyle: SVGProps<SVGTextElement> = {
  fill: 'var(--text-subtle)',
  fontSize: 12,
};

const tooltipStyle: CSSProperties = {
  backgroundColor: 'rgba(17, 23, 41, 0.95)',
  border: '1px solid rgba(142, 242, 255, 0.25)',
  borderRadius: 12,
};

const legendStyle: CSSProperties = {
  color: 'var(--text)',
};

const formatTooltipValue = (value: ValueType) =>
  typeof value === 'number' ? downloadsFormatter.format(value) : value;

const formatTooltipLabel = (value: NameType) =>
  typeof value === 'string'
    ? tooltipDateFormatter.format(new Date(value))
    : String(value ?? '');

const formatReleaseTitle = (
  packageName: string,
  version: string,
  releaseDate: string,
) => `${packageName}@${version} released ${releaseDateFormatter.format(new Date(releaseDate))}`;

const DownloadChart = () => {
  const series = usePackagesStore(selectOrderedSeries);
  const hasSelections = usePackagesStore((state) => state.packages.length > 0);
  const chartData = useMemo(() => buildChartData(series), [series]);
  const releaseMarkers = useMemo(() => buildReleaseMarkers(series), [series]);
  const [showReleaseMarkers, setShowReleaseMarkers] = useState(true);
  const hasReleaseMarkers = releaseMarkers.length > 0;
  const releaseToggleChecked = hasReleaseMarkers && showReleaseMarkers;
  const colorByPackage = useMemo(() => {
    const map = new Map<string, string>();
    series.forEach((item, index) => {
      map.set(item.packageName, getSeriesColor(index));
    });
    return map;
  }, [series]);

  if (chartData.length === 0) {
    return (
      <div className="chart-empty" role="status" aria-live="polite">
        <p className="chart-empty-title">
          {hasSelections ? 'Preparing chart data…' : 'Add an npm package to begin'}
        </p>
        <p className="chart-empty-copy">
          {hasSelections
            ? 'Hang tight while we fetch weekly download totals for your packages.'
            : 'Track up to a year of weekly download totals. Packages you add will show up here with color-coded series and tooltips.'}
        </p>
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <div className="chart-toolbar">
        <p className="chart-hint">
          Hover or tap the lines to compare weekly download totals.
        </p>
        <label
          className={`chart-toggle${hasReleaseMarkers ? '' : ' chart-toggle--disabled'}`}
        >
          <input
            type="checkbox"
            className="chart-toggle-input"
            checked={releaseToggleChecked}
            onChange={(event) => setShowReleaseMarkers(event.target.checked)}
            disabled={!hasReleaseMarkers}
            aria-label="Toggle release markers"
          />
          <span className="chart-toggle-label">Release markers</span>
        </label>
      </div>
      <div className="chart-area" role="region" aria-label="npm downloads chart">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 18, left: -8, bottom: 12 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.08)" />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) =>
                dateTickFormatter.format(new Date(value))
              }
              tick={chartTickStyle}
              axisLine={false}
              tickLine={false}
              minTickGap={36}
            />
            <YAxis
              tickFormatter={(value: number) => compactFormatter.format(value)}
              tick={chartTickStyle}
              width={80}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={formatTooltipLabel}
              contentStyle={tooltipStyle}
              itemStyle={{ color: 'var(--text)' }}
              labelStyle={{ color: 'var(--accent)', fontWeight: 600 }}
            />
            <Legend wrapperStyle={legendStyle} iconType="circle" />
            {series.map((item, index) => (
              <Line
                key={item.packageName}
                type="monotone"
                dataKey={item.packageName}
                stroke={getSeriesColor(index)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
            {releaseToggleChecked &&
              releaseMarkers.map((marker) => {
                const color = colorByPackage.get(marker.packageName) ?? 'var(--accent)';
                return (
                  <ReferenceDot
                    key={`${marker.packageName}-${marker.version}-${marker.releaseDate}`}
                    x={marker.bucketDate}
                    y={marker.downloads}
                    r={5}
                    fill={color}
                    stroke="rgba(8, 12, 26, 0.9)"
                    strokeWidth={1.5}
                    ifOverflow="discard"
                  >
                    <title>
                      {formatReleaseTitle(
                        marker.packageName,
                        marker.version,
                        marker.releaseDate,
                      )}
                    </title>
                  </ReferenceDot>
                );
              })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DownloadChart;
