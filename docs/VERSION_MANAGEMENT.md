# Version Management

This project uses an automated versioning system with a multi-stage branching strategy to manage releases.

## Branching Strategy

The project follows a **4-tier branching model**:

```
dev/* → develop → test → main
```

### Branch Flow
1. **dev/feature-name**: Development branches for new features
2. **develop**: Integration branch with `-alpha` suffix versions  
3. **test**: Staging branch with `-beta` suffix versions
4. **main**: Production branch with clean versions

### Version Suffixes
- **develop branch**: `1.0.0-alpha`
- **test branch**: `1.0.0-beta` 
- **main branch**: `1.0.0` (production)

## Automated Workflow

### 1. Feature Development
- Push to `dev/your-feature-name`
- AI reviews commits and adds comments
- Auto-creates PR: `dev/feature` → `develop`

### 2. Alpha Release (develop)
- Merge to `develop` triggers alpha release
- Version becomes `X.Y.Z-alpha`
- Auto-creates PR: `develop` → `test`

### 3. Beta Release (test)
- Merge to `test` triggers beta release  
- Version becomes `X.Y.Z-beta`
- Runs full test suite
- Auto-creates PR: `test` → `main`

### 4. Production Release (main)
- Merge to `main` triggers production release
- Version becomes clean `X.Y.Z`
- Creates git tag and GitHub release
- Generates changelog

## Commands

### Manual Version Management

```bash
# Sync all packages to root version
bun run version:sync

# Bump patch version (0.0.1 → 0.0.2)
bun run version:bump

# Bump minor version (0.0.1 → 0.1.0)  
bun run version:bump:minor

# Bump major version (0.0.1 → 1.0.0)
bun run version:bump:major

# Set specific version
bun run version:set 1.2.3
```

### Setup

```bash
# Initial setup (installs dependencies and git hooks)
bun run setup
```

## Branch Management

### Creating New Features
```bash
# Create and push a new feature branch
git checkout -b dev/my-new-feature
git push -u origin dev/my-new-feature
# This will trigger AI review and auto-PR creation
```

### Branch Transitions
The system automatically handles:
- **dev/*** → **develop**: Automatic PR creation
- **develop** → **test**: Automatic PR creation  
- **test** → **main**: Automatic PR creation

### Non-Existing Branch Creation
If target branches don't exist, they are automatically created:
- `develop` branch created from `main` (or current branch)
- `test` branch created from `develop`

## Release Types

### Alpha Releases (develop branch)
- **Trigger**: Push to `develop` branch
- **Version**: `1.0.0-alpha`
- **Purpose**: Early integration testing
- **Auto-creates**: PR to `test`

### Beta Releases (test branch)  
- **Trigger**: Push to `test` branch
- **Version**: `1.0.0-beta`
- **Purpose**: Pre-production testing
- **Includes**: Full test suite execution
- **Auto-creates**: PR to `main`

### Production Releases (main branch)
- **Trigger**: Push to `main` branch
- **Version**: `1.0.0` (clean)
- **Purpose**: Production deployment
- **Includes**: Git tag, GitHub release, changelog

## Automated Release Process

### On Pull Requests
- Checks version consistency across all package.json files
- Fails if versions are not synchronized
- Applies to PRs targeting `main`, `develop`, or `test`

### On Branch Push

#### Develop Branch (`develop`)
- Automatically bumps to alpha version (e.g., `1.0.1-alpha`)
- Builds all projects
- Commits version changes with `[skip ci]`

#### Test Branch (`test`)  
- Automatically updates to beta version (e.g., `1.0.1-beta`)
- Builds all projects
- Runs full test suite
- Commits version changes with `[skip ci]`

#### Main Branch (`main`)
- Automatically bumps to production version (e.g., `1.0.1`)
- Builds all projects
- Runs test suite
- Creates git tag
- Generates changelog
- Creates GitHub release

### Manual Release Trigger
You can also trigger releases manually via GitHub Actions:

1. Go to the **Actions** tab in your repository
2. Select **Version & Release** workflow
3. Click **Run workflow**
4. Choose target branch (`main`, `develop`, or `test`)
5. Choose version type (patch/minor/major) or specify custom version
6. Click **Run workflow**

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

1. **Always use the bun scripts** for version management instead of manually editing package.json files
2. **Run `bun run setup`** after cloning the repository to install git hooks
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
bun run version:sync
git add **/package.json
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
