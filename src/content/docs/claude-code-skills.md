---
title: Claude Code Skills 
description: Using Claude Code Skills with Bloc Superpowers.
sidebar:
  order: 100
---

This package includes **Claude Code Skills** that help you use `bloc_superpowers` with AI.

Skills live in the `.claude/skills/` directory. To use them, copy the skills from this
repository to your project:

**Option 1: Project-level installation** (recommended for teams)

Copy the skills to your project so all team members can use them:

```bash
# From your project root
mkdir -p .claude/skills
# Copy or download from:
# https://github.com/marcglasberg/bloc_superpowers/tree/main/.claude/skills
```

**Option 2: Personal installation** (available across all your projects)

Copy the skills to your personal Claude directory:

```bash
# Copy to your home directory
mkdir -p ~/.claude/skills
# Copy or download the skills there
```

### Using the skills

Once installed, you can invoke skills in two ways:

1. **Directly with slash commands**: Type `/skill-name` in Claude Code.
2. **Automatically**: Claude detects when a skill is relevant and applies it.

### Learn more about Claude Code Skills

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Agent Skills Standard](https://agentskills.io)
