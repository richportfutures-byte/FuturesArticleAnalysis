export const PreTradeReview = ({ checks }: { checks: string[] }) => (
  <section>
    <h3>Pre-Trade Review</h3>
    <ul>{checks.map((c) => <li key={c}>{c}</li>)}</ul>
  </section>
);
