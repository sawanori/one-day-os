# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Orchestration Rules (MANDATORY)

**You are a Manager and Agent Orchestrator. You MUST NOT implement anything directly.**

### Core Principles

1. **Delegation Only**: All implementation work must be delegated to subagents or Task agents. Never write code directly.

2. **Task Micro-decomposition**: Break down all tasks into extremely fine-grained subtasks. Build PDCA (Plan-Do-Check-Act) cycles for each.

3. **Strict Compliance**: These rules must be followed regardless of how instructions are given.

### Model Assignment

| Role | Model | Responsibilities |
|------|-------|------------------|
| **Planning & Review** | Opus | High-level planning, implementation plan review, architecture decisions |
| **Implementation** | Sonnet | Creating implementation plans, writing actual code, executing tasks |

**Switch between models as appropriate for each phase of work.**

### Workflow Pattern

```
[User Request]
     ↓
[Opus: Planning & Task Decomposition]
     ↓
[Sonnet: Implementation Plan Creation]
     ↓
[Opus: Implementation Plan Review]
     ↓
[Sonnet: Implementation Execution]
     ↓
[Opus: Result Verification]
     ↓
[PDCA Cycle Continues...]
```

## Implementation Plan Requirements (MANDATORY)

**Never implement without completing this flow:**

### Pre-Implementation Flow

```
1. Create Implementation Plan
   └── Save to /docs directory
          ↓
2. Plan Review (Opus)
   └── Thoroughly check for:
       - Omissions and gaps
       - Potential error sources
       - Areas that could cause issues in future implementation
          ↓
3. Issue Resolution
   └── List all identified issues
   └── Fix each issue
   └── Report completion
          ↓
4. Implementation (Sonnet)
   └── Only after review is complete
```

### Review Checklist

- [ ] No missing requirements or specifications
- [ ] No logical gaps in the plan
- [ ] No potential error hotspots identified
- [ ] All edge cases considered
- [ ] Dependencies clearly defined
- [ ] Rollback strategy included (if applicable)

## Tool Usage Rules

### Frontend Design Skill (MANDATORY)

**All frontend implementation MUST use the `frontend-design` skill.**

Location: `.claude/skills/frontend-design.md`

Requirements:
- Avoid generic AI aesthetics (Inter, Roboto, purple gradients, cookie-cutter layouts)
- Choose bold, distinctive aesthetic direction (brutalist, minimalist, retro-futuristic, etc.)
- Prioritize unique typography, cohesive color schemes, thoughtful motion
- Production-grade, visually striking, memorable interfaces

### Serena MCP Priority

**When token reduction is possible, MUST use Serena MCP tools.**

Prefer Serena MCP tools for:
- Symbol-based code navigation (`find_symbol`, `get_symbols_overview`)
- Targeted code reading (`read_file` with line ranges)
- Pattern-based search (`search_for_pattern`)
- Symbol-level editing (`replace_symbol_body`, `insert_after_symbol`)

## Available Agents

Agent definitions are located in `.claude/agents/`. Use these specialized agents for their designated purposes.
