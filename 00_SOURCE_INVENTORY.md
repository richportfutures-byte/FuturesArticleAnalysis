# Source Inventory for Codex App Build

## Canonical source set used

1. `docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx`
   - Role: shared workflow doctrine and contract-specific deployment guidance for NQ, ZN, GC, 6E.
   - Coverage: shared, NQ, ZN, GC, 6E
   - Canonical: yes for shared doctrine and per-contract deployment rules.
   - Key contribution: best deployment windows, highest-value insight, least valuable use, what the output should shape, confirmation markers, and universal guardrails.

2. `docs/source_of_truth/contract_prompt_library/NQ/README.md`
   - Role: contract-module manifest for NQ.
   - Coverage: NQ
   - Canonical: yes for NQ package structure and primary objective.
   - Key contribution: objective, transmission focus, included block list, and bounded-use rule.

3. `docs/source_of_truth/contract_prompt_library/ZN/README.md`
   - Role: contract-module manifest for ZN.
   - Coverage: ZN
   - Canonical: yes for package structure and scope.
   - Key contribution: objective, transmission focus, included block list, and bounded-use rule.

4. `docs/source_of_truth/contract_prompt_library/GC/README.md`
   - Role: contract-module manifest for GC.
   - Coverage: GC
   - Canonical: yes for package structure and scope.
   - Key contribution: objective, transmission focus, included block list, and bounded-use rule.

5. `docs/source_of_truth/contract_prompt_library/6E/README.md`
   - Role: contract-module manifest for 6E.
   - Coverage: 6E
   - Canonical: yes for package structure and scope.
   - Key contribution: objective, transmission focus, included block list, and bounded-use rule.

6. `docs/source_of_truth/contract_prompt_library/CL/01_article_selection_protocol.md`
   - Role: entry block for the CL folder-based workflow stack.
   - Coverage: CL
   - Canonical: yes as part of the current CL block-level source set.
   - Key contribution: begins the current CL block sequence that carries the contract-specific workflow doctrine through the existing folder-based files.

7. `docs/source_of_truth/contract_prompt_library/ZN/02_narrative_clustering_and_screening.md`
   - Role: granular workflow logic for multi-article clustering.
   - Coverage: ZN
   - Canonical: yes for ZN clustering behavior.
   - Key contribution: required cluster outputs, discovery-vs-consensus-vs-post-hoc classification.

8. `docs/source_of_truth/contract_prompt_library/ZN/05_deployment_and_trade_use_doctrine.md`
   - Role: granular workflow logic for deployment and trade-use boundaries.
   - Coverage: ZN
   - Canonical: yes for ZN deployment behavior.
   - Key contribution: four timing windows, disallowed uses, and bounded-use doctrine.

9. `docs/source_of_truth/contract_prompt_library/ZN/07_pre_trade_sop.md`
   - Role: bounded-use review checklist inherited from source doctrine.
   - Coverage: ZN, but structurally reusable.
   - Canonical: yes for bounded-use review structure.
   - Key contribution: required review checklist before workflow output shapes a bias brief.

10. `docs/source_of_truth/contract_prompt_library/ZN/08_post_article_reaction_sop.md`
    - Role: post-article reaction review loop.
    - Coverage: ZN, but structurally reusable.
    - Canonical: yes for post-article review stage structure.
    - Key contribution: catalyst-vs-rationalization review and event logging.

11. `docs/source_of_truth/contract_prompt_library/ZN/09_single_article_one_shot_prompt.txt`
    - Role: single-article output contract for ZN.
    - Coverage: ZN
    - Canonical: yes for output shape.
    - Key contribution: executive signal, new facts, mechanism map, competing interpretation, pricing assessment, horizon split, confirmation/invalidation, final verdict.

12. `docs/source_of_truth/contract_prompt_library/ZN/10_multi_article_one_shot_prompt.txt`
    - Role: multi-article output contract for ZN.
    - Coverage: ZN
    - Canonical: yes for cluster output shape.
    - Key contribution: source-quality map, common vs disputed claims, driver ranking, contract translation, pricing/timing, confirmation/invalidation, final verdict.

13. `docs/source_of_truth/contract_prompt_library/ZN/12_domain_appendix.md`
    - Role: contract-domain ontology.
    - Coverage: ZN
    - Canonical: yes for driver stack and discipline language.
    - Key contribution: core driver stack, internal-consistency discipline, context-vs-catalyst-vs-trigger separation, misuse cases.

## Accessible-source summary

The accessible corpus now exposes:
- the master deployment guide at `docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx`
- contract manifests for NQ, ZN, GC, and 6E
- full block-level access for NQ, ZN, GC, 6E, and CL under `docs/source_of_truth/contract_prompt_library/`

This pack therefore treats all five contracts as implementation-grade sources through the current folder-based source-of-truth tree.

## GC block-level source set now available

Use the following GC files directly as source of truth for the GC module under `docs/source_of_truth/contract_prompt_library/GC/`:
- `README.md`
- `01_article_selection_protocol.md`
- `02_narrative_clustering_and_screening.md`
- `03_deep_analysis_protocol.md`
- `04_contract_translation_layer.md`
- `05_deployment_and_trade_use_doctrine.md`
- `06_confirmation_and_invalidation_playbook.md`
- `07_pre_trade_sop.md`
- `08_post_article_reaction_sop.md`
- `09_single_article_one_shot_prompt.txt`
- `10_multi_article_one_shot_prompt.txt`
- `11_quick_intraday_filter_prompt.txt`
- `12_domain_appendix.md`

## 6E block-level source set now available

Use the following 6E files directly as source of truth for the 6E module under `docs/source_of_truth/contract_prompt_library/6E/`:
- `README.md`
- `01_article_selection_protocol.md`
- `02_narrative_clustering_and_screening.md`
- `03_deep_analysis_protocol.md`
- `04_contract_translation_layer.md`
- `05_deployment_and_trade_use_doctrine.md`
- `06_confirmation_and_invalidation_playbook.md`
- `07_pre_trade_sop.md`
- `08_post_article_reaction_sop.md`
- `09_single_article_one_shot_prompt.txt`
- `10_multi_article_one_shot_prompt.txt`
- `11_quick_intraday_filter_prompt.txt`
- `12_domain_appendix.md`

## Build-corpus conclusion

Use the following as source of truth for the Codex build:
- shared doctrine: `docs/source_of_truth/master_guide/Master_Deployment_Guide_By_Contract_v2.docx`
- contract manifests: `docs/source_of_truth/contract_prompt_library/NQ/README.md`, `docs/source_of_truth/contract_prompt_library/ZN/README.md`, `docs/source_of_truth/contract_prompt_library/GC/README.md`, and `docs/source_of_truth/contract_prompt_library/6E/README.md`
- detailed workflow contracts: the current block files under `docs/source_of_truth/contract_prompt_library/NQ/`, `docs/source_of_truth/contract_prompt_library/ZN/`, `docs/source_of_truth/contract_prompt_library/GC/`, `docs/source_of_truth/contract_prompt_library/6E/`, and `docs/source_of_truth/contract_prompt_library/CL/`
- output, state, and validation exemplars: current one-shot prompts, translation layers, bounded-use review SOPs, post-reaction SOPs, and domain appendices under `docs/source_of_truth/contract_prompt_library/`


## NQ block-level source set now available

Use the following NQ files directly as source of truth for the NQ module under `docs/source_of_truth/contract_prompt_library/NQ/`:
- `README.md`
- `01_article_selection_protocol.md`
- `02_narrative_clustering_and_screening.md`
- `03_deep_analysis_protocol.md`
- `04_contract_translation_layer.md`
- `05_deployment_and_trade_use_doctrine.md`
- `06_confirmation_and_invalidation_playbook.md`
- `07_pre_trade_sop.md`
- `08_post_article_reaction_sop.md`
- `09_single_article_one_shot_prompt.txt`
- `10_multi_article_one_shot_prompt.txt`
- `11_quick_intraday_filter_prompt.txt`
- `12_domain_appendix.md`

## CL block-level source set now available

Use the following CL files directly as source of truth for the CL module under `docs/source_of_truth/contract_prompt_library/CL/`:
- `01_article_selection_protocol.md`
- `02_narrative_clustering_and_screening.md`
- `03_deep_analysis_protocol.md`
- `04_contract_translation_layer.md`
- `05_deployment_and_trade_use_doctrine.md`
- `06_confirmation_and_invalidation_playbook.md`
- `07_pre_trade_sop.md`
- `08_post_article_reaction_sop.md`
- `09_single_article_one_shot_prompt.txt`
- `10_multi_article_one_shot_prompt.txt`
- `11_quick_intraday_filter_prompt.txt`
- `12_domain_appendix.md`
