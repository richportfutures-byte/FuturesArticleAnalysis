import { z } from 'zod';

const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

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
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';

  if (!apiKey || !model) {
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

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { issue: 'Method not allowed.' });
  }

  let requestBody;
  try {
    requestBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { issue: 'Invalid JSON request body.' });
  }

  const parsedRequest = RequestSchema.safeParse(requestBody);
  if (!parsedRequest.success) {
    return json(400, {
      issue: parsedRequest.error.issues.map((issue) => `${issue.path.join('.') || 'request'} ${issue.message}`).join('; ')
    });
  }

  const config = getProviderConfig();
  if (!config) {
    return json(200, {
      status: 'refinement_unavailable',
      pre_clusters: parsedRequest.data.pre_clusters,
      issue: 'Cluster refinement provider is unavailable on the server.'
    });
  }

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(parsedRequest.data) }
        ]
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

      return json(200, {
        status: 'refinement_unavailable',
        pre_clusters: parsedRequest.data.pre_clusters,
        issue,
        providerId: `openai:${config.model}`
      });
    }

    const responsePayload = await response.json();
    const parsedCompletion = ResponseSchema.parse(extractJsonFromCompletion(responsePayload));
    validateClusterPartition(parsedCompletion.clusters, parsedRequest.data);

    return json(200, {
      status: 'refined',
      clusters: parsedCompletion.clusters,
      providerId: `openai:${config.model}`
    });
  } catch (error) {
    return json(200, {
      status: 'refinement_unavailable',
      pre_clusters: parsedRequest.data.pre_clusters,
      issue: error instanceof Error ? error.message : 'Cluster refinement failed.',
      providerId: config ? `openai:${config.model}` : undefined
    });
  }
};
