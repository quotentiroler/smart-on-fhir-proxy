# Revert and Recreate PR Action

This GitHub Action automatically reverts the most recent merge commit using `git revert` and recreates a pull request from a source branch. This is useful for handling failed releases where you need to undo a problematic merge and restart the review process.

## Features

- 🔍 **Smart Merge Detection**: Automatically finds the most recent "Merge pull request" commit
- ⏪ **Safe Revert**: Uses `git revert --mainline 1` to create a revert commit (preserves history)
- 🔄 **Auto PR Recreation**: Creates a new PR from source to target branch
- 📝 **Issue Tracking**: Creates detailed GitHub issues for tracking
- 🛡️ **No Force Push**: Uses standard git push (no branch protection violations)
- 📚 **History Preservation**: Maintains complete git history with revert commits

## Usage

```yaml
- name: Revert and recreate PR
  uses: ./.github/actions/revert-and-recreate-pr
  with:
    target-branch: "main"
    source-branch: "test"
    workflow-url: "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
    failure-context: "Production Release"
    github-token: ${{ secrets.GITHUB_TOKEN }}
    commits-to-check: "10"
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `target-branch` | The branch to revert (e.g., `main`) | ✅ | - |
| `source-branch` | The source branch to recreate PR from (e.g., `test`) | ✅ | - |
| `workflow-url` | URL of the failed workflow for issue tracking | ✅ | - |
| `failure-context` | Context about what failed (e.g., "Production Release") | ✅ | `Release` |
| `github-token` | GitHub token with appropriate permissions | ✅ | - |
| `commits-to-check` | Number of commits to check for merge commits | ❌ | `10` |

## Outputs

| Output | Description |
|--------|-------------|
| `reverted-to` | The commit hash of the revert commit that was created |
| `merge-commit` | The problematic merge commit that was reverted |
| `push-success` | Whether the revert commit was successfully pushed (`true`/`false`) |
| `pr-created` | Whether a new PR was created (`true`/`false`) |
| `pr-number` | The number of the created/existing PR |

## How It Works

1. **Find Merge Commit**: Searches through the last N commits (configurable) for commits containing "Merge pull request"
2. **Create Revert Commit**: Uses `git revert --mainline 1` to create a new commit that undoes the merge
3. **Push Revert**: Pushes the revert commit using standard git push (no force push needed)
4. **Create Issue**: Documents the revert with detailed information for tracking
5. **Recreate PR**: If the source branch has commits ahead of the target, creates a new PR

## Required Permissions

The GitHub token needs the following permissions:
- `contents: write` - To push the revert commit
- `pull-requests: write` - To create the new PR
- `issues: write` - To create tracking issues

**Note**: No special `workflows` permission needed since we use `git revert` instead of force push!

## Example Scenarios

### Production Release Failure
```yaml
- uses: ./.github/actions/revert-and-recreate-pr
  with:
    target-branch: "main"
    source-branch: "test"
    failure-context: "Production Release"
    # ... other inputs
```

### Beta Release Failure
```yaml
- uses: ./.github/actions/revert-and-recreate-pr
  with:
    target-branch: "test"
    source-branch: "develop"
    failure-context: "Beta Release"
    # ... other inputs
```

### Development Release Failure
```yaml
- uses: ./.github/actions/revert-and-recreate-pr
  with:
    target-branch: "develop"
    source-branch: "feature/xyz"
    failure-context: "Development Integration"
    # ... other inputs
```

## Safety Features

- **Merge Conflict Handling**: Detects if `git revert` fails due to conflicts
- **Branch Existence Check**: Verifies source branch exists before creating PR
- **Duplicate Prevention**: Checks if PR already exists before creating
- **Detailed Logging**: Provides clear output about what actions are taken
- **History Preservation**: Uses `git revert` to maintain complete git history
- **No Force Push**: Safe standard git operations that respect branch protection

## Integration

This action is designed to be used in failure scenarios within your release workflows:

```yaml
jobs:
  production-release:
    # ... your release job

  revert-on-failure:
    needs: [production-release]
    if: ${{ failure() && needs.production-release.result == 'failure' }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - uses: ./.github/actions/revert-and-recreate-pr
        with:
          target-branch: "main"
          source-branch: "test"
          # ... other inputs
```
