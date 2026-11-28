export default function Loading() {
  return <main className="nexus-loading" aria-label="Loading NEXUS">
    <div className="nexus-loading-brand"><span className="nexus-loading-mark">N</span><span>NEXUS</span></div>
    <div className="nexus-loading-line" />
    <section className="nexus-loading-grid" aria-hidden="true">
      <div className="nexus-loading-card nexus-loading-feature"><i/><b/><span/><span/></div>
      <div className="nexus-loading-card"><i/><b/><span/><span/></div>
      <div className="nexus-loading-card"><i/><b/><span/><span/></div>
    </section>
    <p>Preparing your connected space…</p>
  </main>;
}
