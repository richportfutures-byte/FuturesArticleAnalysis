const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const MIN_RECENCY_HOURS = 6;
const MAX_RECENCY_HOURS = 168;
const MAX_RESULTS = 18;

const normalizeRecencyWindowHours = (requestedHours) =>
  Math.min(MAX_RECENCY_HOURS, Math.max(MIN_RECENCY_HOURS, Math.round(Number(requestedHours) || 72)));

const normalizeMaxResults = (requestedResults) => Math.min(MAX_RESULTS, Math.max(4, Math.round(Number(requestedResults) || 12)));

const getProviderConfig = () => {
  const apiKey = process.env.TAVILY_API_KEY;
  const baseUrl = process.env.TAVILY_BASE_URL ?? 'https://api.tavily.com';
  return apiKey ? { apiKey, baseUrl } : null;
};

const mapTavilyResults = (payload, preset) =>
  (payload?.results ?? [])
    .filter((entry) => entry?.title || entry?.url)
    .map((entry) => ({
      url: entry.url ?? null,
      title: entry.title ?? 'untitled',
      snippet: entry.content ?? '',
      raw_text: entry.raw_content ?? '',
      published_at: entry.published_date ?? entry.published_at ?? null,
      source_name: entry.source,
      source_domain: null,
      discovery_query: preset.query,
      query_preset_id: preset.preset_id,
      provenance_notes: [`Discovery preset ${preset.preset_id} retrieved this candidate.`]
    }));

export const handler = async (event) => {
  if (event.httpMethod === 'GET') {
    const config = getProviderConfig();
    return json(200, {
      configured: Boolean(config),
      providerId: config ? 'tavily:news-search' : 'unconfigured-discovery-provider'
    });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { issue: 'Method not allowed.' });
  }

  const config = getProviderConfig();
  if (!config) {
    return json(503, {
      issue: 'Discovery provider is unavailable. Configure TAVILY_API_KEY on the server to enable live discovery.'
    });
  }

  let requestBody;
  try {
    requestBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { issue: 'Invalid JSON request body.' });
  }

  const queryPresets = Array.isArray(requestBody.query_presets) ? requestBody.query_presets : [];
  if (queryPresets.length === 0) {
    return json(400, { issue: 'Discovery request must include at least one query preset.' });
  }

  const recencyWindowHours = normalizeRecencyWindowHours(requestBody.recency_window_hours);
  const retrievedAt = new Date().toISOString();
  const items = [];

  for (const preset of queryPresets) {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: config.apiKey,
        topic: 'news',
        search_depth: 'advanced',
        max_results: Math.min(normalizeMaxResults(preset.max_results), normalizeMaxResults(requestBody.max_results)),
        include_answer: false,
        include_images: false,
        include_raw_content: true,
        include_domains: Array.isArray(preset.preferred_domains) ? preset.preferred_domains : [],
        days: Math.max(1, Math.ceil(recencyWindowHours / 24)),
        query: preset.query
      })
    });

    if (!response.ok) {
      let issue = `${response.status} ${response.statusText}`;
      try {
        const payload = await response.json();
        if (payload?.detail || payload?.error) {
          issue = payload.detail ?? payload.error ?? issue;
        }
      } catch {
        // Keep HTTP status fallback.
      }

      return json(502, {
        issue: `Discovery provider tavily:news-search failed: ${issue}.`,
        retrieved_at: retrievedAt
      });
    }

    items.push(...mapTavilyResults(await response.json(), preset));
  }

  return json(200, {
    items,
    retrieved_at: retrievedAt
  });
};
