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

const COMMON_ERROR_FIELDS = ['detail', 'error', 'message', 'errors', 'reason', 'description', 'title'];

const extractReadableProviderError = (value, seen = new WeakSet()) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  if (seen.has(value)) {
    return null;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const parts = value.map((entry) => extractReadableProviderError(entry, seen)).filter(Boolean);
    return parts.length > 0 ? parts.join('; ') : null;
  }

  for (const field of COMMON_ERROR_FIELDS) {
    if (field in value) {
      const nested = extractReadableProviderError(value[field], seen);
      if (nested) {
        return nested;
      }
    }
  }

  for (const nestedValue of Object.values(value)) {
    const nested = extractReadableProviderError(nestedValue, seen);
    if (nested) {
      return nested;
    }
  }

  return null;
};

const normalizeProviderErrorPayload = (payload, response) => {
  const readable = extractReadableProviderError(payload);
  if (readable) {
    return readable;
  }

  try {
    const serialized = JSON.stringify(payload);
    if (serialized && !['{}', '[]', 'null', '""'].includes(serialized)) {
      return serialized;
    }
  } catch {
    // Keep HTTP status fallback.
  }

  return `HTTP ${response.status} ${response.statusText}`.trim();
};

const formatDiscoveryProviderIssue = (providerId, issue) =>
  `Discovery provider ${providerId} failed: ${/[.!?]$/.test(issue) ? issue : `${issue}.`}`;

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

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const config = getProviderConfig();
    return res.status(200).json({
      configured: Boolean(config),
      providerId: config ? 'tavily:news-search' : 'unconfigured-discovery-provider'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ issue: 'Method not allowed.' });
  }

  const config = getProviderConfig();
  if (!config) {
    return res.status(503).json({
      issue: 'Discovery provider is unavailable. Configure TAVILY_API_KEY on the server to enable live discovery.'
    });
  }

  let requestBody;
  try {
    if (req.body === null || req.body === undefined) {
      requestBody = {};
    } else if (typeof req.body === 'object') {
      requestBody = req.body;
    } else {
      requestBody = JSON.parse(String(req.body));
    }
  } catch {
    return res.status(400).json({ issue: 'Invalid JSON request body.' });
  }

  const queryPresets = Array.isArray(requestBody.query_presets) ? requestBody.query_presets : [];
  if (queryPresets.length === 0) {
    return res.status(400).json({ issue: 'Discovery request must include at least one query preset.' });
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
      let issue = `HTTP ${response.status} ${response.statusText}`.trim();
      try {
        issue = normalizeProviderErrorPayload(await response.json(), response);
      } catch {
        // Keep HTTP status fallback.
      }

      return res.status(502).json({
        issue: formatDiscoveryProviderIssue('tavily:news-search', issue),
        retrieved_at: retrievedAt
      });
    }

    items.push(...mapTavilyResults(await response.json(), preset));
  }

  return res.status(200).json({
    items,
    retrieved_at: retrievedAt
  });
}
