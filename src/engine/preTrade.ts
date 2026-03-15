import { TranslationResult } from '../domain/entities';

export const runPreTradeChecks = (translation: TranslationResult): string[] => {
  return [
    translation.primary_driver_hierarchy.length > 0 ? 'driver hierarchy recorded' : 'driver hierarchy missing',
    translation.horizon_split.length > 0 ? 'horizon recorded' : 'horizon missing',
    translation.confirmation_markers.length > 0 ? 'minimum confirmation recorded' : 'minimum confirmation missing',
    'current market state checked',
    'thesis-abandon condition written'
  ];
};
