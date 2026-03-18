import { z } from 'zod';

const ContractIdSchema = z.enum(['NQ', 'ZN', 'GC', '6E', 'CL']);

const CandidateContractRelevanceSchema = z.object({
  contract_id: ContractIdSchema,
  fit: z.enum(['primary', 'secondary', 'low']),
  rationale: z.string(),
  matched_focus: z.array(z.string())
});

const PreClusterSummarySchema = z.object({
  cluster_id: z.string(),
  label: z.string(),
  description: z.string(),
  member_candidate_ids: z.array(z.string()).min(1),
  candidate_count: z.number().int().nonnegative(),
  suppressed_duplicate_count: z.number().int().nonnegative(),
  freshness_summary: z.string(),
  source_quality_summary: z.string(),
  primary_contracts: z.array(ContractIdSchema),
  secondary_contracts: z.array(ContractIdSchema),
  provenance_notes: z.array(z.string())
});

const CandidateMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  snippet: z.string(),
  source_name: z.string(),
  source_domain: z.string().nullable(),
  authority_tier: z.enum(['tier_1', 'tier_2', 'unlisted']),
  directness: z.enum(['primary_release', 'reported_summary', 'commentary']),
  published_at: z.string().nullable(),
  retrieved_at: z.string(),
  duplication_cluster_id: z.string(),
  discovery_query: z.string(),
  review_bucket: z.enum(['high_confidence', 'secondary', 'low_authority_or_noise']),
  contract_relevance_candidates: z.array(CandidateContractRelevanceSchema),
  duplicate_suppressed_count: z.number().int().nonnegative()
});

const RequestSchema = z
  .object({
    pre_clusters: z.array(PreClusterSummarySchema).min(1),
    candidates_metadata: z.array(CandidateMetadataSchema).min(1)
  })
  .superRefine((value, context) => {
    const knownIds = new Set(value.candidates_metadata.map((candidate) => candidate.id));
    const memberIds = value.pre_clusters.flatMap((cluster) => cluster.member_candidate_ids);

    memberIds.forEach((candidateId, index) => {
      if (!knownIds.has(candidateId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown candidate id in pre_clusters: ${candidateId}`,
          path: ['pre_clusters', index]
        });
      }
    });
  });

const EventClusterSchema = z.object({
  cluster_id: z.string(),
  label: z.string(),
  description: z.string(),
  member_candidate_ids: z.array(z.string()).min(1),
  candidate_count: z.number().int().nonnegative(),
  suppressed_duplicate_count: z.number().int().nonnegative(),
  freshness_summary: z.string(),
  source_quality_summary: z.string(),
  primary_contracts: z.array(ContractIdSchema),
  secondary_contracts: z.array(ContractIdSchema),
  provenance_notes: z.array(z.string())
});

const ResponseSchema = z.object({
  clusters: z.array(EventClusterSchema).min(1)
});

const extractJsonFromCompletion = (responsePayload) => {
  if (!responsePayload || typeof responsePayload !== 'object') {
    throw new Error('Provider returned a non-object response.');
  }

  const blockReason = responsePayload.promptFeedback?.blockReason;
  if (typeof blockReason === 'string' && blockReason.length > 0) {
    throw new Error(`Provider blocked refinement output: ${blockReason}`);
  }

  const candidate = responsePayload.candidates?.[0];
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Provider response did not contain a candidate payload.');
  }

  const finishReason = candidate.finishReason;
  if (typeof finishReason === 'string') {
    if (finishReason === 'SAFETY') {
      throw new Error('Provider blocked refinement output at candidate level: SAFETY');
    }

    if (finishReason !== 'STOP') {
      throw new Error(`Refinement output was incomplete or non-successful: ${finishReason}`);
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
  const model = process.env.GEMINI_MODEL ?? 'gemini-3-pro-preview';
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  if (!apiKey) {
    return null;
  }

  return { apiKey, model, baseUrl };
};

const buildSystemPrompt = () =>
  [
    'You refine deterministic pre-clusters for a futures morning-coverage triage surface.',
    'You are not allowed to invent provenance, candidate ids, unsupported contracts, or unsupported event relationships.',
    'Operate only on the supplied pre_clusters and candidates_metadata.',
    'Allowed contracts: NQ, ZN, GC, 6E, CL.',
    'Merge semantically equivalent pre-clusters when the evidence clearly describes the same event/theme.',
    'Split a pre-cluster only if the candidate evidence shows materially distinct events.',
    'Every candidate id must appear exactly once across the returned clusters.',
    'Return JSON only.'
  ].join('\n');

const buildUserPrompt = (requestBody) =>
  JSON.stringify(
    {
      task: 'Refine deterministic pre-clusters into bounded event/theme clusters for operator triage.',
      instructions: {
        preserve_candidate_partition: true,
        preserve_provenance: true,
        allowed_contracts: ['NQ', 'ZN', 'GC', '6E', 'CL'],
        required_fields: {
          cluster_id: 'string',
          label: 'string',
          description: 'string',
          member_candidate_ids: 'string[]',
          candidate_count: 'number',
          suppressed_duplicate_count: 'number',
          freshness_summary: 'string',
          source_quality_summary: 'string',
          primary_contracts: ['NQ', 'ZN', 'GC', '6E', 'CL'],
          secondary_contracts: ['NQ', 'ZN', 'GC', '6E', 'CL'],
          provenance_notes: 'string[]'
        },
        notes: [
          'Counts and summaries may be approximate; deterministic consumers may recompute them.',
          'Do not use raw article volume as the main signal of importance.',
          'Descriptions should explain why the cluster matters to the listed contracts without giving trade instructions.',
          'If ambiguity remains, keep it explicit in provenance_notes.'
        ]
      },
      pre_clusters: requestBody.pre_clusters,
      candidates_metadata: requestBody.candidates_metadata
    },
    null,
    2
  );

const validateClusterPartition = (clusters, requestBody) => {
  const candidateIds = new Set(requestBody.candidates_metadata.map((candidate) => candidate.id));
  const assigned = new Set();

  for (const cluster of clusters) {
    for (const candidateId of cluster.member_candidate_ids) {
      if (!candidateIds.has(candidateId)) {
        throw new Error(`Unknown candidate id returned by refinement: ${candidateId}`);
      }
      if (assigned.has(candidateId)) {
        throw new Error(`Candidate id assigned to multiple refined clusters: ${candidateId}`);
      }
      assigned.add(candidateId);
    }
  }

  if (assigned.size !== candidateIds.size) {
    throw new Error('Refinement did not preserve a complete candidate partition.');
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ issue: 'Method not allowed.' });
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

  const parsedRequest = RequestSchema.safeParse(requestBody);
  if (!parsedRequest.success) {
    return res.status(400).json({
      issue: parsedRequest.error.issues.map((issue) => `${issue.path.join('.') || 'request'} ${issue.message}`).join('; ')
    });
  }

  const config = getProviderConfig();
  if (!config) {
    return res.status(200).json({
      status: 'refinement_unavailable',
      pre_clusters: parsedRequest.data.pre_clusters,
      issue: 'Cluster refinement provider is unavailable on the server.'
    });
  }

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(config.model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': config.apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemPrompt() }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildUserPrompt(parsedRequest.data) }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
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
        // Keep HTTP status fallback.
      }

      return res.status(200).json({
        status: 'refinement_unavailable',
        pre_clusters: parsedRequest.data.pre_clusters,
        issue,
        providerId: `gemini:${config.model}`
      });
    }

    const responsePayload = await response.json();
    const parsedCompletion = ResponseSchema.parse(extractJsonFromCompletion(responsePayload));
    validateClusterPartition(parsedCompletion.clusters, parsedRequest.data);

    return res.status(200).json({
      status: 'refined',
      clusters: parsedCompletion.clusters,
      providerId: `gemini:${config.model}`
    });
  } catch (error) {
    return res.status(200).json({
      status: 'refinement_unavailable',
      pre_clusters: parsedRequest.data.pre_clusters,
      issue: error instanceof Error ? error.message : 'Cluster refinement failed.',
      providerId: config ? `gemini:${config.model}` : undefined
    });
  }
}
