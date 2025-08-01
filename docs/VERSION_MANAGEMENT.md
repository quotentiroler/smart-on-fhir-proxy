# Version Management

This project uses an automated versioning system to keep all package.json files synchronized and manage releases.

## Overview

The versioning system ensures that:
- All package.json files (root, backend, ui, test) have the same version number
- Versions are automatically bumped and tagged on the main branch
- GitHub releases are created automatically with changelogs
- Pre-commit hooks prevent version inconsistencies

## Commands

### Manual Version Management

```bash
# Sync all packages to root version
npm run version:sync

# Bump patch version (0.0.1 → 0.0.2)
npm run version:bump

# Bump minor version (0.0.1 → 0.1.0)  
npm run version:bump:minor

# Bump major version (0.0.1 → 1.0.0)
npm run version:bump:major

# Set specific version
npm run version:set 1.2.3
```

### Setup

```bash
# Initial setup (installs dependencies and git hooks)
npm run setup
```

## Automated Release Process

### On Pull Requests
- Checks version consistency across all package.json files
- Fails if versions are not synchronized

### On Main Branch Push
- Automatically bumps patch version
- Updates all package.json files
- Builds all projects
- Runs tests
- Creates git tag
- Generates changelog
- Creates GitHub release

### Manual Release Trigger
You can also trigger a release manually via GitHub Actions:

1. Go to the **Actions** tab in your repository
2. Select **Version & Release** workflow
3. Click **Run workflow**
4. Choose version type (patch/minor/major) or specify custom version
5. Click **Run workflow**

## Workflow Details

### Version Consistency Check
```yaml
# Runs on every PR to main
- Validates all package.json files have the same version
- Provides clear error messages if inconsistent
```

### Automated Release
```yaml
# Runs on push to main or manual trigger
- Determines next version number
- Updates all package.json files
- Builds backend and UI
- Runs test suite
- Commits changes
- Creates and pushes git tag
- Creates GitHub release with changelog
```

## Git Hooks

### Pre-commit Hook
- Automatically syncs versions before each commit
- Ensures version consistency is maintained
- Adds updated package.json files to the commit

## Files Involved

### Scripts
- `scripts/version.js` - Core version management logic
- `scripts/setup-hooks.js` - Git hooks installation

### Workflows
- `.github/workflows/version-and-release.yml` - Main versioning workflow
- `.github/workflows/commitreview.yml` - Existing commit review workflow

### Hooks
- `.githooks/pre-commit` - Pre-commit version sync

## Best Practices

1. **Always use the npm scripts** for version management instead of manually editing package.json files
2. **Run `npm run setup`** after cloning the repository to install git hooks
3. **Let the automated system handle releases** on the main branch
4. **Use manual workflow triggers** for urgent releases or specific version bumps
5. **Check the Actions tab** if a release fails to see detailed logs

## Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version: incompatible API changes
- **MINOR** version: backwards-compatible functionality additions  
- **PATCH** version: backwards-compatible bug fixes

## Troubleshooting

### Version Inconsistency Error
```bash
# If you see version mismatch errors:
npm run version:sync
git add package.json backend/package.json ui/package.json test/package.json
git commit -m "sync: align package versions"
```

### Git Hooks Not Working
```bash
# Reinstall git hooks:
node scripts/setup-hooks.js
```

### Manual Release Failed
```bash
# Check GitHub Actions logs and retry:
# 1. Fix any issues (tests, builds, etc.)
# 2. Push fixes to main
# 3. Manually trigger workflow if needed
```
