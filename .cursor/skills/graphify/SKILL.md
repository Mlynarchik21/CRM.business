---
name: graphify
description: any input (code, docs, papers, images) → knowledge graph → clustered communities → HTML + JSON + audit report
trigger: /graphify
---

# Studio CRM — graphify prelude

**Project:** `C:\Users\ggmly\studio-crm`  
**Project paths:** see [reference.md](./reference.md) in this folder.

## Quick commands (this repo)

```powershell
cd C:\Users\ggmly\studio-crm
graphify . --wiki --no-viz
# or scoped:
graphify app lib supabase/migrations types --wiki --no-viz
```

After build, read `graphify-out/wiki/index.md` or `graphify-out/GRAPH_REPORT.md`.

## Full upstream skill

This file is a **stub** until the official skill is synced. Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-graphify-skill.ps1
```

That downloads the full skill from:
`https://raw.githubusercontent.com/safishamsi/graphify/v1/skills/graphify/skill.md`

---

<!-- Below: minimal graphify usage; replaced when sync runs -->

## Usage (summary)

```
/graphify <path> --wiki --no-viz
/graphify <path> --update
/graphify query "<question>"
/graphify path "ConceptA" "ConceptB"
```

Install: `pipx install graphifyy` (Windows) or `pip install graphifyy`.

Honesty: edges are EXTRACTED, INFERRED, or AMBIGUOUS — never invent relationships.
