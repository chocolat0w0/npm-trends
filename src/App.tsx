import './App.css';

function App() {
  return (
    <div className="app-shell">
      <header className="app-hero">
        <p className="eyebrow">npm download insights</p>
        <h1>Repository download trends at a glance</h1>
        <p className="lede">
          Add npm packages to compare their last-year download volume, remove
          the ones you no longer need, and highlight outliers quickly.
        </p>
      </header>

      <main className="workspace" aria-live="polite">
        <section className="panel package-panel" aria-label="Package controls">
          <div className="panel-header">
            <p className="panel-eyebrow">Step 1</p>
            <h2>Manage packages</h2>
          </div>

          <div className="panel-body">
            <p className="placeholder-label">Package form & list placeholder</p>
            <p className="placeholder-copy">
              The upcoming PackageForm and PackageList components will live here.
              Use this column to enter npm package names, view their metadata,
              and remove them when necessary.
            </p>
          </div>
        </section>

        <section className="panel chart-panel" aria-label="Download chart">
          <div className="panel-header">
            <p className="panel-eyebrow">Step 2</p>
            <h2>Visualize comparisons</h2>
          </div>

          <div className="panel-body">
            <p className="placeholder-label">DownloadChart placeholder</p>
            <p className="placeholder-copy">
              A responsive line chart will occupy this area to depict a package
              per series. Additions in the left column will automatically update
              the visualization and legend here.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
