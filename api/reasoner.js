const extractJsonFromCompletion = (responsePayload) => {
  if (!responsePayload || typeof responsePayload !== 'object') {
    throw new Error('Provider returned a non-object response.');
  }

  const blockReason = responsePayload.promptFeedback?.blockReason;
  if (typeof blockReason === 'string' && blockReason.length > 0) {
    throw new Error(`Provider blocked reasoner output: ${blockReason}`);
  }

  const candidate = responsePayload.candidates?.[0];
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Provider response did not contain a candidate payload.');
  }

  const finishReason = candidate.finishReason;
  if (typeof finishReason === 'string') {
    if (finishReason === 'SAFETY') {
      throw new Error('Provider blocked reasoner output at candidate level: SAFETY');
    }
    if (finishReason !== 'STOP') {
      throw new Error(`Reasoner output was incomplete or non-successful: ${finishReason}`);
    }
  }

  const parts = candidate.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error('Provider response did not contain candidate content parts.');
  }

  const text = parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  if (!text) {
    throw new Error('Provider returned an empty text payload.');
  }

  return JSON.parse(text);
};

const getProviderConfig = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-pro-preview';
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  if (!apiKey) {
    return null;
  }

  return { apiKey, model, baseUrl };
};

const mapMessagesToGemini = (messages) => {
  let systemInstruction = null;
  const contents = [];

  for (const message of messages) {
    if (message.role === 'system') {
      const text = typeof message.content === 'string' ? message.content : '';
      if (text) {
        systemInstruction = { parts: [{ text }] };
      }
    } else {
      const role = message.role === 'assistant' ? 'model' : 'user';
      const text = typeof message.content === 'string' ? message.content : '';
      contents.push({ role, parts: [{ text }] });
    }
  }

  return { systemInstruction, contents };
};

export default async function handler(req, res) {
  const config = getProviderConfig();

  if (req.method === 'GET') {
    return res.status(200).json({
      configured: Boolean(config),
      providerId: config ? `gemini:${config.model}` : 'unconfigured-live-provider',
      model: config?.model ?? null
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ issue: 'Method not allowed.' });
  }

  if (!config) {
    return res.status(503).json({
      issue: 'Live provider mode is active, but no model provider is configured on the server.'
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

  const messages = Array.isArray(requestBody.messages) ? requestBody.messages : null;
  if (!messages || messages.length === 0) {
    return res.status(400).json({ issue: 'Reasoner request must include at least one message.' });
  }

  const { systemInstruction, contents } = mapMessagesToGemini(messages);

  if (contents.length === 0) {
    return res.status(400).json({ issue: 'Reasoner request must include at least one non-system message.' });
  }

  const requestPayload = {
    contents,
    generationConfig: {
      temperature: typeof requestBody.temperature === 'number' ? requestBody.temperature : 0.2,
      responseMimeType: 'application/json'
    }
  };

  if (systemInstruction) {
    requestPayload.systemInstruction = systemInstruction;
  }

  const response = await fetch(
    `${config.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(config.model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': config.apiKey
      },
      body: JSON.stringify(requestPayload)
    }
  );

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

    return res.status(502).json({ issue });
  }

  try {
    const responsePayload = await response.json();
    const analysis = extractJsonFromCompletion(responsePayload);
    return res.status(200).json({
      analysis,
      providerId: `gemini:${config.model}`
    });
  } catch (error) {
    return res.status(502).json({
      issue: error instanceof Error ? error.message : 'Provider response parsing failed.'
    });
  }
}
