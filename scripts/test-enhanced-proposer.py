#!/usr/bin/env python3
"""
Test-Enhanced AI Proposer: Specialized version for test coverage and quality improvements
This script extends the standard proposer with test-specific capabilities
"""

import sys
import os
import json
import importlib.util
from pathlib import Path

# Import the main proposer
sys.path.append(str(Path(__file__).parent))
try:
    from propose_changes import UnifiedChangeProposer
except ImportError:
    # Handle the case where propose-changes.py has hyphens
    propose_changes_path = Path(__file__).parent / "propose-changes.py"
    spec = importlib.util.spec_from_file_location("propose_changes", propose_changes_path)
    propose_changes_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(propose_changes_module)
    UnifiedChangeProposer = propose_changes_module.UnifiedChangeProposer

class TestEnhancedProposer(UnifiedChangeProposer):
    """Enhanced proposer with test-specific capabilities"""
    
    def detect_test_scenario(self, error_log: str) -> str:
        """Detect what kind of test scenario we're dealing with"""
        log_lower = error_log.lower()
        
        if "coverage" in log_lower and ("threshold" in log_lower or "%" in log_lower):
            return "coverage_improvement"
        elif "test" in log_lower and ("fail" in log_lower or "error" in log_lower):
            return "test_fixes"
        elif "no test" in log_lower or "missing test" in log_lower:
            return "test_creation"
        elif "vitest" in log_lower or "jest" in log_lower:
            return "test_framework"
        else:
            return "general_testing"
    
    def enhance_test_prompt(self, error_log: str, component_type: str) -> str:
        """Create test-specific enhanced prompts for the Junior AI"""
        
        test_scenario = self.detect_test_scenario(error_log)
        
        test_expertise = {
            "coverage_improvement": """
🎯 TEST COVERAGE ENHANCEMENT SPECIALIST 🎯

You are an expert at analyzing code coverage reports and creating comprehensive test suites!

Your mission: Generate missing tests to improve coverage based on the coverage analysis provided.

KEY COVERAGE ENHANCEMENT STRATEGIES:
1. 📊 ANALYZE COVERAGE GAPS: Look for untested functions, branches, and edge cases
2. 🧪 CREATE COMPREHENSIVE TESTS: Unit tests, integration tests, edge cases
3. 🎭 TEST ERROR SCENARIOS: Error handling, invalid inputs, boundary conditions
4. 🔄 TEST STATE CHANGES: Component state, user interactions, async operations
5. 📝 FOLLOW PATTERNS: Use existing test structure and naming conventions

VITEST + TESTING LIBRARY PATTERNS:
- describe() blocks for test organization
- it() or test() for individual test cases
- expect().toBe(), .toHaveBeenCalled(), .toBeInTheDocument()
- render() for component testing
- userEvent for interaction testing
- vi.fn() for mocking
- vi.mock() for module mocking

CREATE TESTS FOR:
- Untested React components and hooks
- Uncovered utility functions
- Error boundaries and edge cases
- User interaction flows
- API integration points
- State management logic
""",
            "test_fixes": """
🔧 TEST DEBUGGING & FIXING EXPERT 🔧

You are a master at diagnosing and fixing failing tests!

Your mission: Analyze test failures and implement robust fixes.

COMMON TEST FAILURE PATTERNS:
1. 🚫 Import/Export Issues: Missing modules, incorrect paths
2. 🎭 DOM/Environment Issues: JSDOM setup, missing globals
3. 🔄 Async Issues: Promises, timers, async/await
4. 🎨 Component Testing: Props, state, lifecycle
5. 📦 Mock Issues: Incomplete mocks, wrong mock data
6. ⚙️ Configuration: Vitest config, test setup files

DEBUGGING APPROACH:
- Read the exact error messages carefully
- Check file paths and imports
- Verify test environment setup
- Ensure mocks are properly configured
- Test async operations correctly
""",
            "test_creation": """
🚀 TEST SUITE ARCHITECT 🚀

You are building a complete test suite from scratch!

Your mission: Create a comprehensive testing foundation.

TESTING ARCHITECTURE:
1. 📁 STRUCTURE: Organize tests logically (components/, utils/, hooks/)
2. ⚙️ SETUP: Configure test runners, environment, helpers
3. 🎯 COVERAGE: Aim for meaningful coverage, not just metrics
4. 📝 PATTERNS: Establish consistent testing patterns
5. 🔄 CI/CD: Ensure tests work in automated environments

ESSENTIAL TEST FILES TO CREATE:
- test/setup.ts (test configuration)
- Component tests for UI elements
- Utility function tests
- Integration tests for key workflows
- Mock files for external dependencies
""",
            "test_framework": """
🛠️ TEST FRAMEWORK CONFIGURATION EXPERT 🛠️

You are setting up and configuring test frameworks!

Your mission: Configure Vitest, Testing Library, and related tools perfectly.

CONFIGURATION AREAS:
1. ⚙️ VITEST CONFIG: vite.config.ts test configuration
2. 🌍 ENVIRONMENT: JSDOM setup for React testing
3. 📦 DEPENDENCIES: Ensure all testing packages are installed
4. 🎭 MOCKS: Configure module mocking and globals
5. 📊 COVERAGE: Set up coverage reporting and thresholds

VITEST CONFIGURATION ESSENTIALS:
- test.environment: 'jsdom'
- test.setupFiles: ['./test/setup.ts']
- test.globals: true for global test functions
- coverage.provider: 'v8' for fast coverage
- coverage.reporter: ['text', 'json', 'html']
""",
            "general_testing": """
🧪 TESTING EXCELLENCE ADVISOR 🧪

You are a comprehensive testing expert!

Your mission: Improve overall test quality and coverage.

TESTING BEST PRACTICES:
1. 🎯 FOCUSED TESTS: Each test should verify one specific behavior
2. 📝 CLEAR NAMING: Test names should describe what they verify
3. 🔄 ARRANGE-ACT-ASSERT: Structure tests clearly
4. 🎭 REALISTIC SCENARIOS: Test real user interactions
5. 🚫 NO FLAKY TESTS: Ensure tests are deterministic
6. 📊 MEANINGFUL COVERAGE: Focus on critical code paths
"""
        }
        
        framework_specific = {
            "frontend": """
FRONTEND TESTING STACK:
- 🧪 Vitest: Fast test runner
- 🎭 Testing Library: User-centric testing utilities
- 🌍 JSDOM: DOM simulation for React components
- 🎯 Jest DOM: Additional DOM matchers
- 👤 User Event: Realistic user interaction simulation

REACT COMPONENT TESTING PATTERNS:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentName } from '@/components/ComponentName'

describe('ComponentName', () => {
  it('should render with default props', () => {
    render(<ComponentName />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
  
  it('should handle user interactions', async () => {
    const user = userEvent.setup()
    const mockFn = vi.fn()
    
    render(<ComponentName onClick={mockFn} />)
    await user.click(screen.getByRole('button'))
    
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
```
""",
            "backend": """
BACKEND TESTING STACK:
- 🧪 Vitest: Fast test runner for Node.js
- 🔌 Supertest: HTTP assertion library
- 🎭 Test Doubles: Mocks, stubs, spies
- 📊 Coverage: Track API endpoint coverage

BACKEND TESTING PATTERNS:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'

describe('API Endpoints', () => {
  beforeEach(() => {
    // Setup test data
  })
  
  afterEach(() => {
    // Cleanup
  })
  
  it('should return 200 for GET /health', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)
    
    expect(response.body).toEqual({ status: 'ok' })
  })
})
```
"""
        }
        
        return f"""
{test_expertise.get(test_scenario, test_expertise['general_testing'])}

{framework_specific.get(component_type, framework_specific['frontend'])}

SCENARIO DETECTED: {test_scenario}
COMPONENT TYPE: {component_type}

Remember: Focus on creating tests that actually verify important behavior, not just achieving coverage metrics!
"""

    def propose_changes(self, error_log: str) -> dict:
        """Enhanced propose_changes with test-specific prompting"""
        
        if not self.api_key:
            return {"analysis": "No API key provided", "fixes": []}
        
        # Detect component type and test scenario
        component_type = self.detect_component_type(error_log)
        test_scenario = self.detect_test_scenario(error_log)
        
        print(f"🎯 Component: {component_type}, Test Scenario: {test_scenario}", file=sys.stderr)
        
        # Create test-enhanced prompt
        test_enhancement = self.enhance_test_prompt(error_log, component_type)
        
        # Get the base context
        seeded_context = self.seed_context_from_errors(error_log)
        
        # Create enhanced prompt with test focus
        enhanced_prompt = f"""🧪 TEST-ENHANCED JUNIOR AI - Your Testing Specialist! 🧪

{test_enhancement}

ERROR LOG TO ANALYZE:
{error_log}

SEEDED CONTEXT:
{seeded_context}

🛠️ YOUR ENHANCED TESTING TOOLKIT:
You have access to all the standard MCP tools PLUS test-specific capabilities:

🔍 TEST ANALYSIS TOOLS:
- list_directory: Explore test structure and existing test files
- read_file: Study existing test patterns and configuration
- search_files: Find similar test patterns across the codebase
- semantic_search: Find related test files and testing utilities

🧪 TEST CREATION TOOLS:
- create_dynamic_tool: Build specialized test analysis tools
- consult_friend_ai: Brainstorm testing strategies with your best friend

🎯 TESTING MISSION:
Create comprehensive, maintainable tests that actually verify important behavior!

Focus on:
1. Following existing test patterns in the codebase
2. Creating realistic test scenarios
3. Ensuring tests are reliable and not flaky
4. Improving coverage in meaningful ways
5. Testing edge cases and error conditions

RESPOND WITH SPECIFIC, ACTIONABLE CHANGES TO IMPROVE THE TEST SUITE!
"""
        
        # Use the enhanced prompt for analysis
        # The rest follows the same pattern as the base proposer
        return super().propose_changes(enhanced_prompt)


def main():
    """Main entry point for test-enhanced proposer"""
    if len(sys.argv) != 2:
        print("Usage: python test-enhanced-proposer.py <error-log-file>", file=sys.stderr)
        sys.exit(1)
    
    error_log_file = sys.argv[1]
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print("🧪 Test-Enhanced Junior AI starting analysis...", file=sys.stderr)
    
    # Initialize the test-enhanced proposer
    proposer = TestEnhancedProposer(api_key, repo_root)
    
    # Read error log
    with open(error_log_file, 'r', encoding='utf-8') as f:
        error_log = f.read()
    
    if not error_log:
        print("❌ No errors found in log", file=sys.stderr)
        sys.exit(1)
    
    # Get proposed changes
    proposed_changes = proposer.propose_changes(error_log)
    
    # Output as JSON for the next step
    print(json.dumps(proposed_changes, indent=2))


if __name__ == "__main__":
    main()
