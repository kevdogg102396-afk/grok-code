---
name: commit
description: Create a clean git commit with a good message
trigger: commit
---

# Git Commit Skill

When the user asks you to commit:

1. Run `git status` to see what's changed
2. Run `git diff --staged` to see staged changes (if any)
3. If nothing is staged, ask the user what to stage or suggest `git add -A`
4. Write a concise commit message that describes the "why" not the "what"
5. Run `git commit -m "<message>"`
6. Show the result

Keep commit messages under 72 characters for the first line.
Use conventional commits format: feat:, fix:, docs:, refactor:, etc.
