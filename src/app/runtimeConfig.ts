export type ClientReasonerRuntimeStatus = {
  selectedMode: 'live' | 'simulated';
  providerAvailability: 'configured' | 'unconfigured' | 'simulated';
  displayLabel: string;
  detail: string;
};

type RuntimeEnv = Record<string, string | undefined>;

type FetchLike = (input: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
}>;

const readEnvValue = (env: RuntimeEnv, name: string): string | undefined => env[name] ?? env[`VITE_${name}`];

export const resolveClientRequestedMode = (
  env: RuntimeEnv = import.meta.env as Record<string, string | undefined>
): 'live' | 'simulated' => (readEnvValue(env, 'REASONER_MODE') === 'simulated' ? 'simulated' : 'live');

export const resolveReasonerEndpoint = (
  env: RuntimeEnv = import.meta.env as Record<string, string | undefined>
): string => readEnvValue(env, 'REASONER_ENDPOINT') ?? '/api/reasoner';

export const fetchClientReasonerStatus = async (
  env: RuntimeEnv = import.meta.env as Record<string, string | undefined>,
  fetcher: FetchLike = fetch
): Promise<ClientReasonerRuntimeStatus> => {
  const selectedMode = resolveClientRequestedMode(env);

  if (selectedMode === 'simulated') {
    return {
      selectedMode,
      providerAvailability: 'simulated',
      displayLabel: 'Simulated mode selected',
      detail: 'Simulation is explicit. The deployed app will not claim live provider-backed reasoning in this mode.'
    };
  }

  try {
    const response = await fetcher(resolveReasonerEndpoint(env), { method: 'GET' });
    const payload = (await response.json()) as { configured?: boolean; model?: string | null; issue?: string };

    if (response.ok && payload.configured) {
      return {
        selectedMode,
        providerAvailability: 'configured',
        displayLabel: 'Live provider configured',
        detail: `Live mode is selected and the server-side provider is configured${payload.model ? `: ${payload.model}` : ''}.`
      };
    }

    return {
      selectedMode,
      providerAvailability: 'unconfigured',
      displayLabel: 'Provider unavailable',
      detail: payload.issue ?? 'Live mode is selected, but the server-side provider is not configured.'
    };
  } catch {
    return {
      selectedMode,
      providerAvailability: 'unconfigured',
      displayLabel: 'Provider unavailable',
      detail: 'Live mode is selected, but the provider health endpoint is unavailable.'
    };
  }
};
