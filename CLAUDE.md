You are working on https://linear.app/thevibecompany/project/vibe-tuto-1a5dd4d3df0b/ project. 

When you are looking for information on the project, use Linear MCP to get the information from the project. 

A query should always have an issue linked to it. Always ask the user which issue he wants you to work on, assume it is the project if none given

If i ask you to do something that Linear could do, you should use Linear MCP to do it. 

Once a feature is complete, always look at the remaining issues and update them if needed.

Never mark an issue as done, let the PR do it. 

## Browser Automation

Use `agent-browser` for testing the localhost website. 
Never use playwright or any other library to test the localhost website. 
Never use claude chrome mcp to test the localhost website. 

ALWAYS USE THE BROWSER AUTOMATION TO TEST THE LOCALHOST WEBSITE. 

## Testing

- **Unit tests** : Vitest in `apps/web` and `apps/extension`. Run from root: `pnpm test` or `pnpm test:run`.
- **E2E localhost** : Use **agent-browser** (MCP) only. Never Playwright or Chrome MCP.

## PR Creation

When creating a PR, always upload a screenshot of all the things that you did in the PR description.

The Screenshot should be in the folder `screenshots/pr-<pr-number>/<screenshot-name>.png`

**Image URLs in PR descriptions**: Use the raw GitHub URL format, not relative paths:
```
https://raw.githubusercontent.com/The-Vibe-Company/vibe-tuto/<branch-name>/screenshots/pr-<number>/<image>.png
```

Always add the link to the issue in the PR description. 

## Commits

Use conventional commits for the commits and PR

## PR Comment

When asked to fix a PR, use the skill address-github-comments to address the comments. Mark all the comments as resolved when you are done with a short text explaining what you did.