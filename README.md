# Magic AI Filters

> **ALFA RC2 experiments for document structure, retrieval and client-side filter visualisation**

This repository combines two distinct strands of work: a Vite/React dashboard
with ALFA-themed pipeline views, and a Python document-processing workspace
derived around `pageindex` modules. Treat them as separate local components
until an integration contract is documented.

## Repository map

```text
src/                    Vite/React pages, components and local pipeline UI
pageindex/              Python document-index and retrieval modules
alfa_*.py               RC2 build, query, smoke-test and section-map scripts
examples/               sample documents and retrieval examples
results/                committed sample artefacts and run manifests
RC2_SPEC.md             RC2 specification material
```

The web UI includes pages for chat, models, incidents, filters, chains,
benchmarking and live analysis. Python tools build document structures, produce
section maps and query document results.

## Requirements

- Node.js/npm for the Vite application;
- Python for document-processing scripts;
- PDF and model/provider dependencies only for the selected Python path.

## Local development

For the client:

```bash
npm ci
npm run dev
```

For the Python tooling, use a virtual environment and install the declared
requirements:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
```

Review the arguments and input/output locations of each `alfa_*.py` script
before running it; committed `results/` files are examples, not a clean
runtime directory.

## Configuration and data

Some Python dependencies support LLM providers. Keep tokens in local untracked
environment configuration and avoid using confidential documents as examples.
Document indexing, retrieval and filtering can make mistakes; a displayed
decision or section match is not a security guarantee or factual validation.

## Licence

The root `LICENSE` is MIT. Check the provenance and terms of bundled examples,
datasets and any external model/provider before reuse.
