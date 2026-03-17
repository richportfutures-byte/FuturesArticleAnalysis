import contractLibraryOverview from '../../docs/source_of_truth/contract_prompt_library/README.md?raw';
import sourceOfTruthOverview from '../../docs/source_of_truth/README.md?raw';
import { ContractId } from './enums';

const contractPromptSources = import.meta.glob('../../docs/source_of_truth/contract_prompt_library/**/*.{md,txt}', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>;

export const MASTER_GUIDE_SOURCE_FILE = 'docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx';
export const SOURCE_OF_TRUTH_README_SOURCE_FILE = 'docs/source_of_truth/README.md';
export const CONTRACT_LIBRARY_README_SOURCE_FILE = 'docs/source_of_truth/contract_prompt_library/README.md';

// TODO: Replace this manual fallback with a checked-in extracted text artifact derived from the canonical master-guide .docx.
export const MASTER_GUIDE_TEXT = `
Purpose: tell you when to deploy each workflow, what it is best at, where it is weak, and how to use outputs to shape bias without letting them dictate trades.
Shared operator doctrine:
- use the workflow as a context engine, thesis filter, and narrative validator
- use price, structure, positioning, and confirmation to decide execution
- if the workflow says bullish but the market rejects the thesis cleanly, respect the rejection
- never let a strong article become a permission slip for a weak trade
Deployment sequence for live use:
1. relevance filter
2. transmission map
3. pricing test
4. confirmation stack
5. execution handoff after confirmation only
Red-light conditions:
- the article offers no new facts and merely re-labels an already-completed move
- price action or the confirmation stack clearly rejects the thesis
- the chosen contract is not the cleanest expression vehicle
- the market is dominated by intraday positioning, liquidation, or technical adjustment rather than fundamental repricing
`.trim();

export const SOURCE_OF_TRUTH_RULES = [
  'Do not infer doctrine that is not present in the local source-of-truth files.',
  'Use the LLM for reasoning over article content and cross-context.',
  'Use code for structure, constraints, schema enforcement, and bounded outputs.',
  'This app shapes market bias. It does not dictate trades.'
];

export type DoctrineSourceDocument = {
  path: string;
  text: string;
};

export type ContractDoctrineBundle = {
  contract_id: ContractId;
  shared_overview: string;
  contract_library_overview: string;
  master_guide_source_file: string;
  master_guide_excerpt: string;
  source_documents: DoctrineSourceDocument[];
  doctrine_highlights: string[];
};

const normalizeRepoPath = (value: string) => value.replace(/\\/g, '/').replace(/^.*?docs\//, 'docs/');

const sourceTextByRepoPath = Object.fromEntries(
  Object.entries(contractPromptSources).map(([modulePath, text]) => [normalizeRepoPath(modulePath), text])
);

const extractHighlights = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^(#|-|\*\*)/.test(line) || line.length > 56)
    .slice(0, 8);

const contractFolderToken = (contractId: ContractId): string => `/${contractId}/`;

export const buildContractDoctrineBundle = (contractId: ContractId, sourceFiles: string[]): ContractDoctrineBundle => {
  const contractSourceFiles = sourceFiles.filter((path) => path.includes(contractFolderToken(contractId)));
  const sourceDocuments = [
    { path: SOURCE_OF_TRUTH_README_SOURCE_FILE, text: sourceOfTruthOverview },
    { path: CONTRACT_LIBRARY_README_SOURCE_FILE, text: contractLibraryOverview },
    { path: MASTER_GUIDE_SOURCE_FILE, text: MASTER_GUIDE_TEXT },
    ...contractSourceFiles.map((path) => ({ path, text: sourceTextByRepoPath[path] }))
  ]
    .filter((entry): entry is DoctrineSourceDocument => Boolean(entry.text));

  const doctrineHighlights = [
    ...extractHighlights(sourceOfTruthOverview),
    ...extractHighlights(contractLibraryOverview),
    ...sourceDocuments.flatMap((entry) => extractHighlights(entry.text))
  ].slice(0, 24);

  return {
    contract_id: contractId,
    shared_overview: sourceOfTruthOverview,
    contract_library_overview: contractLibraryOverview,
    master_guide_source_file: MASTER_GUIDE_SOURCE_FILE,
    master_guide_excerpt: MASTER_GUIDE_TEXT,
    source_documents: sourceDocuments,
    doctrine_highlights: doctrineHighlights
  };
};
