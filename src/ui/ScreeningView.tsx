export const ScreeningView = ({ rows }: { rows: Array<{ headline: string; result: string; hasChannel: boolean }> }) => (
  <section>
    <h3>Screening View</h3>
    <ul>{rows.map((r) => <li key={r.headline}>{r.headline} — {r.result} (channel match: {String(r.hasChannel)})</li>)}</ul>
  </section>
);
