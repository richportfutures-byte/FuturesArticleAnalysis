# Source Inventory for Codex App Build

## Canonical source set used

1. `master_deployment_guide_by_contract.docx`
   - Role: shared workflow doctrine and contract-specific deployment guidance for NQ, ZN, GC, 6E.
   - Coverage: shared, NQ, ZN, GC, 6E
   - Canonical: yes for shared doctrine and per-contract deployment rules.
   - Key contribution: best deployment windows, highest-value insight, least valuable use, what the output should shape, confirmation markers, and universal guardrails.

2. `NQ Contract Prompt Library / readme.md`
   - Role: contract-module manifest for NQ.
   - Coverage: NQ
   - Canonical: yes for NQ package structure and primary objective.
   - Key contribution: objective, transmission focus, included block list, operator rule.

3. `ZN Contract Prompt Library / readme.md`
   - Role: contract-module manifest for ZN.
   - Coverage: ZN
   - Canonical: yes for package structure and scope.
   - Key contribution: objective, transmission focus, included block list, operator rule.

4. `GC Contract Prompt Library / readme.md`
   - Role: contract-module manifest for GC.
   - Coverage: GC
   - Canonical: yes for package structure and scope.
   - Key contribution: objective, transmission focus, included block list, operator rule.

5. `6E Contract Prompt Library / readme.md`
   - Role: contract-module manifest for 6E.
   - Coverage: 6E
   - Canonical: yes for package structure and scope.
   - Key contribution: objective, transmission focus, included block list, operator rule.

6. `CL Contract Prompt Library / cl_futures_article_workflow_package.docx`
   - Role: full contract workflow package for CL.
   - Coverage: CL
   - Canonical: yes for CL.
   - Key contribution: complete block sequence, channel taxonomy, narrative buckets, deep-analysis steps, translation requirements, deployment doctrine, confirmation/invalidation logic, pre-trade SOP, post-article SOP, one-shot prompt structure, quick filter output, domain appendix.

7. `ZN / 02_narrative_clustering_and_screening.md`
   - Role: granular workflow logic for multi-article clustering.
   - Coverage: ZN
   - Canonical: yes for ZN clustering behavior.
   - Key contribution: required cluster outputs, discovery-vs-consensus-vs-post-hoc classification.

8. `ZN / 05_deployment_and_trade_use_doctrine.md`
   - Role: granular workflow logic for deployment and trade-use boundaries.
   - Coverage: ZN
   - Canonical: yes for ZN deployment behavior.
   - Key contribution: four timing windows, disallowed uses, operator doctrine.

9. `ZN / 07_pre_trade_sop.md`
   - Role: pre-trade control checklist.
   - Coverage: ZN, but structurally reusable.
   - Canonical: yes for pre-trade stage structure.
   - Key contribution: required operator checklist before using workflow output.

10. `ZN / 08_post_article_reaction_sop.md`
    - Role: post-event review loop.
    - Coverage: ZN, but structurally reusable.
    - Canonical: yes for post-article review stage structure.
    - Key contribution: catalyst-vs-rationalization review and event logging.

11. `ZN / 09_single_article_one_shot_prompt.txt`
    - Role: single-article output contract for ZN.
    - Coverage: ZN
    - Canonical: yes for output shape.
    - Key contribution: executive signal, new facts, mechanism map, competing interpretation, pricing assessment, horizon split, confirmation/invalidation, final verdict.

12. `ZN / 10_multi_article_one_shot_prompt.txt`
    - Role: multi-article output contract for ZN.
    - Coverage: ZN
    - Canonical: yes for cluster output shape.
    - Key contribution: source-quality map, common vs disputed claims, driver ranking, contract translation, pricing/timing, confirmation/invalidation, final verdict.

13. `ZN / 12_domain_appendix.md`
    - Role: contract-domain ontology.
    - Coverage: ZN
    - Canonical: yes for driver stack and discipline language.
    - Key contribution: core driver stack, internal-consistency discipline, context-vs-catalyst-vs-trigger separation, misuse cases.

## Accessible-source summary

The accessible corpus now exposes:
- full shared deployment guidance for NQ, ZN, GC, and 6E
- package manifests for NQ, ZN, GC, and 6E
- a full CL package
- full block-level access for NQ, ZN, GC, and 6E, including active-hours guidance where present

This pack therefore treats all five contracts as implementation-grade sources, while still respecting that CL is packaged as a dedicated workflow document rather than a folder of separate blocks.

## GC block-level source set now available

Use the following GC files directly as source of truth for the GC module:
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
- `13_active_hours_reference.md`

## 6E block-level source set now available

Use the following 6E files directly as source of truth for the 6E module:
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
- `13_active_hours_reference.md`

## Build-corpus conclusion

Use the following as source of truth for the Codex build:
- shared doctrine: `master_deployment_guide_by_contract.docx`
- contract manifests: NQ / ZN / GC / 6E / CL readmes or package docs
- detailed workflow contracts: NQ block-level files, ZN block-level files, GC block-level files, 6E block-level files, and the CL package
- output, state, and validation exemplars: NQ, ZN, GC, and 6E one-shot prompts, translation layers, pre-trade SOPs, post-reaction SOPs, domain appendices, and active-hours guides where present


## NQ block-level source set now available

Use the following NQ files directly as source of truth for the NQ module:
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
- `13_active_hours_reference.md`
