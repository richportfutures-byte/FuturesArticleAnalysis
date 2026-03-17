export enum ContractId {
  NQ = 'NQ',
  ZN = 'ZN',
  GC = 'GC',
  SIXE = '6E',
  CL = 'CL'
}

export enum RunMode {
  SINGLE_ARTICLE = 'single_article',
  MULTI_ARTICLE = 'multi_article'
}

export enum SourceType {
  PRIMARY_REPORTING = 'primary_reporting',
  OFFICIAL_STATEMENT = 'official_statement',
  SYNTHESIS = 'synthesis',
  COMMENTARY = 'commentary',
  UNKNOWN = 'unknown'
}

export enum SourceSurvival {
  SELECTED = 'selected',
  CONTEXT_ONLY = 'context_only',
  NOISE = 'noise',
  IRRELEVANT = 'irrelevant'
}

export enum DoctrineFit {
  STRONG = 'strong',
  PARTIAL = 'partial',
  WEAK = 'weak',
  NONE = 'none'
}

export enum NoveltyAssessment {
  GENUINELY_NEW = 'genuinely_new',
  PARTLY_NEW = 'partly_new',
  RECYCLED_BACKGROUND = 'recycled_background',
  POST_HOC_ATTACHMENT = 'post_hoc_attachment',
  UNCLEAR = 'unclear'
}

export enum CausalCoherenceAssessment {
  COHERENT = 'coherent',
  MIXED = 'mixed',
  FRAGILE = 'fragile',
  UNSUPPORTED = 'unsupported'
}

export enum PricedInAssessment {
  UNDERAPPRECIATED = 'underappreciated',
  PARTIALLY_PRICED = 'partially_priced',
  PRICED_IN = 'priced_in',
  STALE = 'stale',
  UNCLEAR = 'unclear'
}

export enum ReasonerMode {
  SIMULATED_LLM = 'simulated_llm',
  LIVE_PROVIDER_LLM = 'live_provider_llm',
  UNCONFIGURED_LIVE_LLM = 'unconfigured_live_llm'
}

export enum ClusterMode {
  DISCOVERY = 'discovery',
  CONSENSUS = 'consensus',
  POST_HOC = 'post_hoc',
  MIXED = 'mixed',
  NONE = 'none'
}

export enum PricingAssessment {
  UNDERPRICED = 'underpriced',
  ALREADY_PRICED = 'already_priced',
  MIXED = 'mixed',
  IMPOSSIBLE_TO_ASSESS = 'impossible_to_assess',
  CONSENSUS = 'consensus',
  STALE = 'stale'
}

export enum HorizonBucket {
  OVERNIGHT = 'overnight',
  PRE_OPEN = 'pre_open',
  RTH_OPEN = 'rth_open',
  SAME_SESSION_CONTINUATION = 'same_session_continuation',
  ONE_TO_THREE_DAY_SWING = 'one_to_three_day_swing'
}

export enum DeploymentUse {
  CONTINUATION_BIAS = 'continuation_bias',
  FADE_CANDIDATE = 'fade_candidate',
  WAIT_FOR_CONFIRMATION = 'wait_for_confirmation',
  IGNORE = 'ignore',
  NO_TRADE = 'no_trade'
}

export enum Verdict {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  MIXED = 'mixed',
  NO_EDGE = 'no_edge'
}

export enum ActionabilityBand {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none'
}

export enum WorkflowState {
  DRAFT = 'draft',
  INTAKE = 'intake',
  SCREEN = 'screen',
  CLUSTER = 'cluster',
  ANALYZE = 'analyze',
  TRANSLATE = 'translate',
  DEPLOY = 'deploy',
  PRE_TRADE_REVIEW = 'pre_trade_review',
  POST_REACTION_REVIEW = 'post_reaction_review',
  COMPLETED = 'completed',
  ERROR = 'error'
}
