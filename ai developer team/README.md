# Cortex AI Team — Optimized SDLC Skills

**An autonomous AI software development team built for end-to-end SDLC coverage.**

This repository contains 14 specialized AI agent skill definitions that together form a complete, senior-level software development lifecycle team — from product discovery to production release.

---

## What Is This?

Each `SKILL.md` file defines an AI agent role with:
- **Role definition** — what the agent does and why
- **Responsibilities** — concrete, scoped duties
- **Best practices** — world-class standards the agent enforces
- **Triggers** — when to activate this agent
- **Workflow** — step-by-step operating procedure including autonomous verification loops

These skills are designed for use with **Claude Code** (or Cursor) as slash-command style agent roles.

---

## Team Roster (14 Agents)

| Agent | Role | Level |
|---|---|---|
| `team-leader` | Engineering Manager / Scrum Master | Staff / Principal |
| `software-architect` | System Design & Tech Stack | Principal Architect |
| `product-manager` | Agile PM, Backlog, PRD | Senior PM |
| `ui-ux-designer` | Design System, User Flows | Senior Product Designer |
| `frontend-engineer` | React / Next.js / Tailwind | Senior Frontend |
| `backend-engineer` | NestJS / FastAPI / PostgreSQL | Senior Backend |
| `mobile-engineer` | React Native / Flutter / Swift / Kotlin | Senior Mobile |
| `devops-engineer` | CI/CD / Docker / Terraform / K8s | Senior DevOps / SRE |
| `security-engineer` | OWASP / SAST / DAST / Zero Trust | Senior AppSec |
| `qa-engineer` | TDD / Playwright / Jest / k6 | Senior QA Automation |
| `uat-engineer` | BDD / Gherkin / Nielsen Heuristics | Senior UAT / UX Research |
| `code-reviewer` | Adversarial Review / SOLID / DRY | Senior Staff Engineer |
| `technical-writer` | API Docs / ADR / Diátaxis | Senior Technical Writer |
| `release-manager` | SemVer / Conventional Commits / GitOps | Senior Release Manager |

---

## SDLC Workflow

```
User Request
     │
     ▼
[team-leader] — reads .clauderules + docs/ADR/
     │
     ├──► [product-manager]     → GitHub Issues, PRD, User Stories
     ├──► [software-architect]  → ADR, API contracts, system design
     ├──► [ui-ux-designer]      → Design tokens, user flows, handoff
     │
     ├──► [frontend-engineer]   → UI components → auto-test
     │    [backend-engineer]    → API endpoints → auto-test
     │    [mobile-engineer]     → iOS/Android → auto-test
     │
     ├──► [qa-engineer]         → Auto-correction loop until 100% pass
     │    [uat-engineer]        → Given/When/Then BDD scenarios
     │
     ├──► [security-engineer]   → OWASP audit, CVSS-scored findings
     │    [devops-engineer]     → CI/CD pipeline, IaC, observability
     │
     ├──► [code-reviewer]       → Adversarial PR review on GitHub
     │    [technical-writer]    → Swagger docs, ADR, README update
     │
     └──► [release-manager]     → SemVer tag, CHANGELOG, GitHub Release
                                        │
                                        ▼
                                 Delivered to User
```

---

## Key Design Principles

- **Autonomous Verification Loop:** No agent declares work complete without running tests and reading the terminal output. Agents self-correct until tests pass.
- **Shared Memory:** All agents read `.clauderules` and `docs/ADR/` before writing code, ensuring decisions stay consistent with past architectural choices.
- **Standardized Handoffs:** Defined output formats between roles (e.g., UX → Frontend: color tokens + typography scale + Mermaid flow diagram).
- **GitHub-Native:** `product-manager`, `team-leader`, and `code-reviewer` connect directly to GitHub Issues and Pull Requests via MCP.
- **Security-First:** `security-engineer` runs before any code reaches production; findings include CVSS scores and remediation examples.

---

## Usage

### With Claude Code
Copy any `SKILL.md` into your project's `.claude/skills/` directory and invoke via slash command:
```
/team-leader Build a new appointment booking module end-to-end.
/security-engineer Audit the authentication flow for OWASP vulnerabilities.
/release-manager Generate CHANGELOG and tag v2.1.0.
```

### With Cursor
Add skills as `.mdc` rules or reference them in your Cursor system prompt.

---

## Repository Structure

```
cortex-ai-team/
├── team-leader/SKILL.md
├── software-architect/SKILL.md
├── product-manager/SKILL.md
├── ui-ux-designer/SKILL.md
├── frontend-engineer/SKILL.md
├── backend-engineer/SKILL.md
├── mobile-engineer/SKILL.md
├── devops-engineer/SKILL.md
├── security-engineer/SKILL.md
├── qa-engineer/SKILL.md
├── uat-engineer/SKILL.md
├── code-reviewer/SKILL.md
├── technical-writer/SKILL.md
├── release-manager/SKILL.md
├── TEAM_REPORT.md            ← Team capability overview
└── PULPAX_PROJECT_ASSESSMENT.md  ← Example assessment output
```

---

## Team Maturity Score

| Category | Score |
|---|---|
| Technical Expertise | 10/10 — All 14 roles at Senior level |
| Autonomous Operation | 9/10 — Terminal + MCP + Auto-fix integrated |
| Quality Assurance | 10/10 — QA + UAT + Code Review triad |
| Institutional Memory | 9/10 — ADR + .clauderules architecture active |
| External Integration | 8/10 — GitHub-native, extensible |
| Mobile Coverage | 10/10 — React Native / Flutter / Swift / Kotlin |

**Overall: Senior-Level AI Development Team ✅**

---

*Built by [Metacortex CAI](https://github.com/metacortex-cai)*
