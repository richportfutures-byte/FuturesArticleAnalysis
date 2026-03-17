# Source of Truth

Primary doctrine for this repo lives here.

Priority order:
1. `master_guide/Master_Deployment_Guide_By_Contract_v2.docx`
2. `contract_prompt_library/README.md`
3. Contract-specific protocol stacks in:
   - `contract_prompt_library/NQ/`
   - `contract_prompt_library/ZN/`
   - `contract_prompt_library/GC/`
   - `contract_prompt_library/6E/`
   - `contract_prompt_library/CL/`

Rules:
- Do not infer doctrine that is not present in these files.
- Use the LLM for reasoning over article content and cross-context.
- Use code for structure, constraints, schema enforcement, and bounded outputs.
- This app shapes market bias. It does not dictate trades.
- The canonical master guide remains the `.docx` file above. If runtime loading uses a temporary text fallback, treat that as an implementation limitation rather than a change in doctrine authority.
