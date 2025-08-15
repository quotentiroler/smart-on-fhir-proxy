## Dual-AI Backend Fix System

The workflow now implements a dual-AI consultation system for backend fixes:

### Step 1: Junior AI Proposes Fixes
- **Script**: `scripts/propose-backend-fixes.py`
- **Role**: "Junior developer" with higher creativity (temperature 0.7)
- **Output**: JSON with proposed fixes, confidence levels, and reasoning
- **Purpose**: Generate initial creative solutions to build errors

### Step 2: Senior AI Reviews Fixes
- **Script**: `scripts/review-backend-fixes.py`
- **Role**: "Senior developer" with lower temperature (0.1) for precision
- **Input**: Proposed fixes + original build errors
- **Output**: Refined fixes with review status (approved/modified/rejected/new)
- **Purpose**: Validate, refine, or replace proposed fixes

### Step 3: Apply Reviewed Fixes
- **Script**: `scripts/apply-backend-fixes.py` (updated)
- **Input**: JSON file with reviewed fixes
- **Purpose**: Apply the final fixes and retry the build

### Workflow Integration
```yaml
- name: Propose Backend Fixes with Junior AI
- name: Review Proposed Backend Fixes with Senior AI  
- name: Apply Reviewed Backend Fixes and retry build
```

This creates a collaborative AI approach where:
- Junior AI explores creative solutions
- Senior AI ensures quality and correctness
- Only validated fixes are applied

### Benefits
1. **Higher fix quality**: Two AI perspectives reduce errors
2. **Better reasoning**: Each fix includes confidence and review notes
3. **Safer application**: Senior AI validates before applying
4. **Learning system**: Review notes help understand AI decisions
