import { TranslationResult } from '../domain/entities';

export const TranslationView = ({ translation }: { translation: TranslationResult | null }) => (
  <section>
    <h3>Translation View</h3>
    {!translation ? <p>No translation.</p> : <>
      <p>Selected channels: {translation.selected_channels.join(', ')}</p>
      <p>Driver hierarchy: {translation.primary_driver_hierarchy.join(' > ')}</p>
      <p>Best expression: {translation.best_expression_vehicle}</p>
      <p>Pricing: {translation.pricing_assessment}</p>
      <p>Horizon split: {translation.horizon_split.map((h) => h.bucket).join(', ')}</p>
    </>}
  </section>
);
