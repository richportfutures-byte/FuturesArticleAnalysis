import { z } from 'zod';

export const FixtureSchema = z.object({
  fixture_id: z.string(),
  contract_id: z.string(),
  run_mode: z.string(),
  expected: z.record(z.any())
});
