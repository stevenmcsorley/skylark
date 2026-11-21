# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Solo developers and small teams who run their own apps on a Raspberry Pi or small server. They open Skylark when something breaks, or after a deploy, to see whether new errors appeared and to triage them. AI coding agents also use it through the MCP / API.

## Product Purpose
Skylark is a self-hosted error monitor. Apps send errors with the normal Sentry SDKs; Skylark groups them into issues, shows what broke and how often, and lets people (or agents) resolve, ignore, assign and comment. Success is: a developer sees what broke, understands it from the stack trace, and closes it, without running a heavy hosted service.

## Positioning
- Self-hosted and tiny: runs on a Raspberry Pi, the owner holds the data, works with the standard Sentry SDKs.
- Agent-native: one Code Mode MCP endpoint lets AI agents query and resolve issues and file tickets (GitHub, Ossicone).
- Factory loop: errors can become tickets that the Agent Factory picks up and fixes.

## Operating Context
Live at https://skylark.halfagiraf.com (Pi, Docker Compose, deploys on push to main). Django + DRF + Celery backend, React 18 + Vite + Tailwind frontend. Sentry-compatible ingest at `/api/<project_id>/envelope|store/`.

## Capabilities and Constraints
Projects with DSN and Connect-your-app snippets, Issues (list, detail, resolve/ignore/assign/comment), Overview, Dashboards, Explore (events), Releases and deployments, Alerts, Integrations, MCP & API. No performance tracing: do not show or imply it. Dark UI only (no light theme required).

## Brand Commitments
Existing green logo mark; one accent colour (the logo green). Monochrome line icons (lucide), no emoji. Honest data only: never show invented numbers, customers or features that do not exist.

## Evidence on Hand
Real seeded data exists only in the local review rig (`/home/dev/opencode/skylark-review-rig`). No testimonials, customers or benchmarks exist and none may be invented.

## Product Principles
1. Show what is broken and how bad it is before anything else.
2. Every number on screen is real; empty states say so plainly and show the next step.
3. Quiet, dense, scannable: it is a tool people use under mild stress.
4. Humans and agents are both first-class users.
