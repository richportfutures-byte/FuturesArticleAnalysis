const readEnv = (name) => process.env[name] ?? process.env[`VITE_${name}`];

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const extractJsonFromCompletion = (responsePayload) => {
  if (!responsePayload || typeof responsePayload !== 'object') {
    throw new Error('Provider returned a non-object response.');
  }

  const content = responsePayload.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return JSON.parse(content);
  }

  if (Array.isArray(content)) {
    const text = content
      .map((entry) => (entry?.type === 'text' ? entry.text ?? '' : ''))
      .join('')
      .trim();

    if (!text) {
      throw new Error('Provider returned an empty text payload.');
    }

    return JSON.parse(text);
  }

  throw new Error('Provider response did not contain a JSON text payload.');
};

const getProviderConfig = () => {
  const apiKey = readEnv('OPENAI_API_KEY');
  const model = readEnv('OPENAI_MODEL');
  const baseUrl = readEnv('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1';

  if (!apiKey || !model) {
    return null;
  }

  return { apiKey, model, baseUrl };
};

export const handler = async (event) => {
  const config = getProviderConfig();

  if (event.httpMethod === 'GET') {
    return json(200, {
      configured: Boolean(config),
      providerId: config ? `openai:${config.model}` : 'unconfigured-live-provider',
      model: config?.model ?? null
    });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { issue: 'Method not allowed.' });
  }

  if (!config) {
    return json(503, {
      issue: 'Live provider mode is active, but no model provider is configured on the server.'
    });
  }

  let requestBody;
  try {
    requestBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { issue: 'Invalid JSON request body.' });
  }

  const messages = Array.isArray(requestBody.messages) ? requestBody.messages : null;
  if (!messages || messages.length === 0) {
    return json(400, { issue: 'Reasoner request must include at least one message.' });
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: typeof requestBody.temperature === 'number' ? requestBody.temperature : 0.2,
      response_format: requestBody.response_format ?? { type: 'json_object' },
      messages
    })
  });

  if (!response.ok) {
    let issue = `${response.status} ${response.statusText}`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error?.message) {
        issue = errorPayload.error.message;
      }
    } catch {
      // Keep the HTTP status fallback.
    }

    return json(502, { issue });
  }

  try {
    const responsePayload = await response.json();
    const analysis = extractJsonFromCompletion(responsePayload);
    return json(200, {
      analysis,
      providerId: `openai:${config.model}`
    });
  } catch (error) {
    return json(502, {
      issue: error instanceof Error ? error.message : 'Provider response parsing failed.'
    });
  }
};
