import { getSeriesColor } from '../../constants/colors';
import {
  selectPackageSummaries,
  usePackagesStore,
} from '../../store/packagesStore';
import './PackageList.css';

const downloadsFormatter = new Intl.NumberFormat('en-US');

const formatDownloads = (value: number) => downloadsFormatter.format(value);

const PackageList = () => {
  const summaries = usePackagesStore(selectPackageSummaries);
  const removePackage = usePackagesStore((state) => state.removePackage);

  if (summaries.length === 0) {
    return (
      <div className="package-list package-list--empty" role="status" aria-live="polite">
        <p className="package-empty-title">No packages tracked yet</p>
        <p className="package-empty-copy">
          Add an npm package above to fetch its download summary. Results will appear here
          with quick stats and color labels.
        </p>
      </div>
    );
  }

  return (
    <ul className="package-list" aria-label="Selected packages">
      {summaries.map((summary, index) => {
        const color = getSeriesColor(index);
        const isLoading = summary.status === 'loading';
        const hasError = Boolean(summary.error);

        return (
          <li key={summary.packageName} className="package-row">
            <span
              className="package-color"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />

            <div className="package-body">
              <div className="package-header">
                <p className="package-name">{summary.packageName}</p>
                {isLoading && <span className="package-pill loading">Loading…</span>}
                {!isLoading && hasError && (
                  <span className="package-pill error" role="alert">
                    {summary.error}
                  </span>
                )}
              </div>

              <p className="package-metrics">
                <span>{formatDownloads(summary.lastDayDownloads)} last day</span>
                <span className="metric-separator" aria-hidden="true">
                  •
                </span>
                <span>{formatDownloads(summary.totalDownloads)} last 365 days</span>
              </p>

              {!isLoading && hasError && (
                <p className="package-error" role="alert">
                  Unable to load downloads. Remove and try again later.
                </p>
              )}
            </div>

            <button
              type="button"
              className="package-remove"
              onClick={() => removePackage(summary.packageName)}
              aria-label={`Remove ${summary.packageName}`}
            >
              Remove
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default PackageList;
