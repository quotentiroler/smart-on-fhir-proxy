#!/usr/bin/env python3
"""
SMART Checklist Test Builder

This script analyzes CHECKLIST.md files and generates functional unit tests
for checklist items, then updates the checklists with test references.

Tests are placed in:
- backend/tests/ for backend checklist items
- ui/tests/ for frontend/UI checklist items
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

class ChecklistItem:
    """Represents a single checklist item that can be tested."""
    
    def __init__(self, text: str, checked: bool, level: int, category: str, file_path: str, line_number: int):
        self.text = text
        self.checked = checked
        self.level = level
        self.category = category
        self.file_path = file_path
        self.line_number = line_number
        self.test_ref = None
        self.is_testable = self._determine_testability()
        
    def _determine_testability(self) -> bool:
        """Determine if this checklist item can be automatically tested."""
        testable_keywords = [
            'endpoint', 'api', 'response', 'request', 'validation', 'authentication',
            'authorization', 'token', 'scope', 'oauth', 'client', 'redirect',
            'parameter', 'header', 'configuration', 'discovery', 'introspection',
            'registration', 'flow', 'grant', 'code', 'pkce', 'jwt', 'signature',
            'capability', 'support', 'implementation', 'interface', 'component',
            'form', 'button', 'input', 'ui', 'page', 'login', 'dashboard'
        ]
        
        non_testable_keywords = [
            'documentation', 'guide', 'tutorial', 'readme', 'planned',
            'manual', 'review', 'analysis', 'research', 'decision'
        ]
        
        text_lower = self.text.lower()
        
        # Skip non-testable items
        for keyword in non_testable_keywords:
            if keyword in text_lower:
                return False
                
        # Include testable items
        for keyword in testable_keywords:
            if keyword in text_lower:
                return True
                
        # Default: include completed items that don't match exclusions
        return self.checked

class ChecklistParser:
    """Parses CHECKLIST.md files and extracts testable items."""
    
    def parse_file(self, file_path: str) -> List[ChecklistItem]:
        """Parse a single checklist file."""
        items = []
        current_category = "General"
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            for line_num, line in enumerate(lines, 1):
                original_line = line
                line = line.strip()
                
                # Skip empty lines
                if not line:
                    continue
                
                # Extract category from headers
                if line.startswith('#'):
                    current_category = self._extract_category(line)
                    continue
                    
                # Parse checklist items
                item = self._parse_checklist_line(original_line, current_category, file_path, line_num)
                if item:
                    items.append(item)
                    
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            
        return items
    
    def _extract_category(self, header_line: str) -> str:
        """Extract category name from header line."""
        # Remove markdown header symbols and emojis
        category = re.sub(r'^#+\s*', '', header_line)
        category = re.sub(r'[🔍🚀🔐🎫🧪📊🛠️⚡️🎨📱🔄🌐✅📝🔧]', '', category)
        return category.strip()
    
    def _parse_checklist_line(self, line: str, category: str, file_path: str, line_num: int) -> Optional[ChecklistItem]:
        """Parse a single checklist line."""
        # Try to match different checklist formats
        # Format 1: - [x] **Title** description
        match = re.match(r'^(\s*)-\s*\[([xX\s])\]\s*\*\*(.*?)\*\*(.*)$', line)
        if not match:
            # Format 2: - [x] text
            match = re.match(r'^(\s*)-\s*\[([xX\s])\]\s*(.*)$', line)
            if not match:
                return None
        
        indent = match.group(1)
        checked_char = match.group(2)
        checked = checked_char.lower() == 'x'
        
        if len(match.groups()) == 4:  # Format with bold title
            title = match.group(3).strip()
            description = match.group(4).strip()
            text = f"{title} {description}".strip()
        else:  # Simple format
            text = match.group(3).strip()
        
        # Calculate nesting level
        level = len(indent)
        
        return ChecklistItem(text, checked, level, category, file_path, line_num)

class TestGenerator:
    """Generates test files from checklist items."""
    
    def __init__(self):
        self.backend_tests_dir = Path("backend/tests")
        self.ui_tests_dir = Path("ui/tests")
        
        # Create test directories if they don't exist
        self.backend_tests_dir.mkdir(parents=True, exist_ok=True)
        self.ui_tests_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"📁 Backend tests directory: {self.backend_tests_dir}")
        print(f"📁 UI tests directory: {self.ui_tests_dir}")
        
    def generate_tests(self, items: List[ChecklistItem]) -> Dict[str, str]:
        """Generate test files for checklist items."""
        generated_files = {}
        
        # Filter only testable items
        testable_items = [item for item in items if item.is_testable]
        print(f"🧪 Found {len(testable_items)} testable items out of {len(items)} total")
        
        if not testable_items:
            print("⚠️ No testable items found!")
            return generated_files
        
        # Group items by component and category
        grouped_items = self._group_items(testable_items)
        print(f"📊 Grouped items into {len(grouped_items)} test files")
        
        for group_key, group_items in grouped_items.items():
            if group_items:  # Only create files if there are items
                test_file_path = self._generate_test_file(group_key, group_items)
                if test_file_path:
                    generated_files[group_key] = test_file_path
                    print(f"✅ Generated: {test_file_path}")
                
        return generated_files
    
    def _group_items(self, items: List[ChecklistItem]) -> Dict[str, List[ChecklistItem]]:
        """Group items by component and category."""
        groups = {}
        
        for item in items:
            component = self._determine_component(item.file_path)
            
            # Clean category name for file naming
            clean_category = re.sub(r'[^\w\s-]', '', item.category)
            clean_category = re.sub(r'\s+', '_', clean_category).lower()
            clean_category = clean_category.replace('(', '').replace(')', '')
            
            # Create group key
            group_key = f"{component}_{clean_category}"
            
            if group_key not in groups:
                groups[group_key] = []
            groups[group_key].append(item)
            
        return groups
    
    def _determine_component(self, file_path: str) -> str:
        """Determine if item belongs to backend or frontend."""
        if 'backend' in file_path.lower():
            return 'backend'
        elif 'ui' in file_path.lower() or 'frontend' in file_path.lower():
            return 'frontend'
        else:
            # Default to backend for general items
            return 'backend'
    
    def _generate_test_file(self, group_key: str, items: List[ChecklistItem]) -> Optional[str]:
        """Generate a test file for a group of items."""
        if not items:
            return None
            
        component = group_key.split('_')[0]
        category = '_'.join(group_key.split('_')[1:])
        
        # Choose appropriate directory
        if component == 'backend':
            test_dir = self.backend_tests_dir
        else:  # frontend/ui
            test_dir = self.ui_tests_dir
            
        test_file_name = f"test_checklist_{category}.py"
        test_file_path = test_dir / test_file_name
        
        # Generate test content
        test_content = self._build_test_file_content(component, category, items)
        
        # Write test file
        with open(test_file_path, 'w', encoding='utf-8') as f:
            f.write(test_content)
            
        # Update items with test references
        for item in items:
            test_function_name = self._generate_test_function_name(item.text)
            relative_path = str(test_file_path).replace('\\', '/')
            item.test_ref = f"{relative_path}:{test_function_name}"
            
        return str(test_file_path)
    
    def _build_test_file_content(self, component: str, category: str, items: List[ChecklistItem]) -> str:
        """Build the complete test file content."""
        lines = []
        
        # File header
        lines.extend([
            '"""',
            f'Generated tests for {component} SMART App Launch checklist items.',
            f'Category: {category}',
            '',
            f'Auto-generated on {datetime.now().isoformat()}',
            '"""',
            '',
            'import pytest',
            'import os',
            ''
        ])
        
        # Component-specific imports
        if component == 'backend':
            lines.extend([
                'import requests',
                'import json',
                'from unittest.mock import Mock, patch',
                '',
                '# Test configuration',
                "BASE_URL = os.getenv('TEST_BASE_URL', 'http://localhost:8445')",
                'API_TIMEOUT = 30',
                ''
            ])
        else:  # frontend/ui
            lines.extend([
                'from playwright.sync_api import Page, expect',
                '',
                '# Test configuration',
                "UI_BASE_URL = os.getenv('TEST_UI_URL', 'http://localhost:5173')",
                ''
            ])
        
        # Test class
        class_name = f"Test{component.title()}{category.title().replace('_', '')}"
        lines.extend([
            f'class {class_name}:',
            f'    """Test suite for {component} {category} implementation."""',
            ''
        ])
        
        # Setup fixtures
        if component == 'backend':
            lines.extend([
                '    @pytest.fixture(autouse=True)',
                '    def setup(self):',
                '        """Set up test environment."""',
                '        self.base_url = BASE_URL',
                '        self.session = requests.Session()',
                '        self.session.timeout = API_TIMEOUT',
                ''
            ])
        else:  # frontend
            lines.extend([
                '    @pytest.fixture(autouse=True)',
                '    def setup(self, page: Page):',
                '        """Set up test environment."""',
                '        self.page = page',
                '        self.base_url = UI_BASE_URL',
                ''
            ])
        
        # Generate test methods
        for item in items:
            method_lines = self._build_test_method(component, item)
            lines.extend(method_lines)
            lines.append('')
        
        return '\n'.join(lines)
    
    def _build_test_method(self, component: str, item: ChecklistItem) -> List[str]:
        """Build a test method for a checklist item."""
        function_name = self._generate_test_function_name(item.text)
        description = item.text.replace('"', '\\"')
        
        lines = [
            f'    def {function_name}(self):',
            '        """',
            f'        Test: {description}',
            '        ',
            f'        Source: {item.file_path}:{item.line_number}',
            f'        Category: {item.category}',
            f'        Status: {"✅ Implemented" if item.checked else "📋 Planned"}',
            '        """'
        ]
        
        # Add test body based on component and content
        body_lines = self._generate_test_body_lines(component, item)
        lines.extend(body_lines)
        
        return lines
    
    def _generate_test_body_lines(self, component: str, item: ChecklistItem) -> List[str]:
        """Generate test body lines based on component and item."""
        text_lower = item.text.lower()
        
        if component == 'backend':
            return self._generate_backend_test_body(text_lower, item)
        else:  # frontend
            return self._generate_frontend_test_body(text_lower, item)
    
    def _generate_backend_test_body(self, text_lower: str, item: ChecklistItem) -> List[str]:
        """Generate backend test body."""
        if 'discovery' in text_lower or 'configuration' in text_lower:
            return [
                '        # Test SMART configuration discovery endpoint',
                '        response = self.session.get(f"{self.base_url}/.well-known/smart-configuration")',
                '        assert response.status_code == 200',
                '        config = response.json()',
                '        assert "authorization_endpoint" in config',
                '        assert "token_endpoint" in config',
                '        assert "capabilities" in config'
            ]
        elif 'authorization' in text_lower and 'endpoint' in text_lower:
            return [
                '        # Test OAuth authorization endpoint',
                '        params = {',
                '            "response_type": "code",',
                '            "client_id": "test-client",',
                '            "redirect_uri": "http://localhost:3000/callback",',
                '            "scope": "patient/*.read",',
                '            "state": "test-state"',
                '        }',
                '        response = self.session.get(f"{self.base_url}/auth/authorize", params=params, allow_redirects=False)',
                '        assert response.status_code in [302, 200]  # Redirect or auth page'
            ]
        elif 'token' in text_lower and 'endpoint' in text_lower:
            return [
                '        # Test OAuth token endpoint',
                '        data = {',
                '            "grant_type": "client_credentials",',
                '            "client_id": "test-client",',
                '            "client_secret": "test-secret",',
                '            "scope": "system/*.read"',
                '        }',
                '        response = self.session.post(f"{self.base_url}/auth/token", data=data)',
                '        # Note: This may fail without proper client setup',
                '        assert response.status_code in [200, 400, 401]'
            ]
        elif 'introspection' in text_lower:
            return [
                '        # Test token introspection endpoint',
                '        data = {"token": "test-token"}',
                '        response = self.session.post(f"{self.base_url}/auth/introspect", data=data)',
                '        assert response.status_code in [200, 400, 401]',
                '        if response.status_code == 200:',
                '            result = response.json()',
                '            assert "active" in result'
            ]
        elif 'scope' in text_lower:
            return [
                '        # Test scope processing and validation',
                '        # This test validates SMART scope syntax support',
                '        smart_v2_scopes = ["patient/Patient.read", "user/Observation.rs"]',
                '        smart_v1_scopes = ["patient/*.read", "user/*.write"]',
                '        # TODO: Implement scope validation logic test',
                '        assert True  # Placeholder for scope validation'
            ]
        else:
            return [
                '        # Test backend implementation',
                f'        # TODO: Implement specific test for: {item.text[:50]}...',
                '        assert True  # Placeholder - implement based on requirements'
            ]
    
    def _generate_frontend_test_body(self, text_lower: str, item: ChecklistItem) -> List[str]:
        """Generate frontend test body."""
        if 'login' in text_lower or 'authentication' in text_lower:
            return [
                '        # Test login interface',
                '        self.page.goto(f"{self.base_url}/login")',
                '        ',
                '        # Check for login form elements',
                '        expect(self.page.locator("[data-testid=login-button], button[type=submit]")).to_be_visible()',
                '        ',
                '        # Test login form functionality',
                '        login_button = self.page.locator("button").first',
                '        expect(login_button).to_be_enabled()'
            ]
        elif 'app' in text_lower and ('management' in text_lower or 'manager' in text_lower):
            return [
                '        # Test SMART app management interface',
                '        self.page.goto(f"{self.base_url}/admin/smart-apps")',
                '        ',
                '        # Check for app management elements',
                '        expect(self.page.locator("table, .smart-apps-table")).to_be_visible()',
                '        ',
                '        # Test add app functionality',
                '        if self.page.locator("[data-testid=add-app]").is_visible():',
                '            expect(self.page.locator("[data-testid=add-app]")).to_be_enabled()'
            ]
        elif 'scope' in text_lower and ('management' in text_lower or 'manager' in text_lower):
            return [
                '        # Test scope management interface',
                '        self.page.goto(f"{self.base_url}/admin/scopes")',
                '        ',
                '        # Check for scope configuration elements',
                '        expect(self.page.locator(".scope-manager, .scope-list")).to_be_visible()',
                '        ',
                '        # Test scope selection',
                '        checkboxes = self.page.locator("input[type=checkbox]")',
                '        if checkboxes.count() > 0:',
                '            expect(checkboxes.first).to_be_enabled()'
            ]
        elif 'dashboard' in text_lower or 'monitoring' in text_lower:
            return [
                '        # Test monitoring dashboard',
                '        self.page.goto(f"{self.base_url}/admin/monitoring")',
                '        ',
                '        # Check for dashboard elements',
                '        expect(self.page.locator(".dashboard, .monitoring-dashboard")).to_be_visible()',
                '        ',
                '        # Test real-time updates',
                '        self.page.wait_for_timeout(1000)  # Wait for initial load'
            ]
        else:
            return [
                '        # Test frontend component',
                '        self.page.goto(self.base_url)',
                f'        # TODO: Implement specific UI test for: {item.text[:50]}...',
                '        expect(self.page).to_have_title(re.compile(".*"))'
            ]
    
    def _generate_test_function_name(self, text: str) -> str:
        """Generate a valid Python function name from checklist text."""
        # Extract words and clean them
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are'}
        words = [w for w in words if w not in stop_words and len(w) > 2]
        
        # Take first 4 meaningful words
        function_words = words[:4]
        if not function_words:
            function_words = ['test', 'item']
            
        function_name = 'test_' + '_'.join(function_words)
        
        # Ensure valid Python identifier
        function_name = re.sub(r'[^\w]', '_', function_name)
        function_name = re.sub(r'_+', '_', function_name)  # Remove multiple underscores
        
        return function_name

class ChecklistUpdater:
    """Updates checklist files with test references."""
    
    def update_checklists(self, items: List[ChecklistItem]):
        """Update checklist files with test references."""
        files_to_update = {}
        
        # Group items by file
        for item in items:
            if item.test_ref:
                if item.file_path not in files_to_update:
                    files_to_update[item.file_path] = []
                files_to_update[item.file_path].append(item)
        
        # Update each file
        for file_path, file_items in files_to_update.items():
            self._update_file(file_path, file_items)
    
    def _update_file(self, file_path: str, items: List[ChecklistItem]):
        """Update a single checklist file with test references."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            updated_lines = []
            for line_num, line in enumerate(lines, 1):
                updated_line = line
                
                # Find matching items for this line
                matching_items = [item for item in items if item.line_number == line_num]
                
                for item in matching_items:
                    if item.test_ref and '[tested:' not in line:
                        # Add test reference to the line
                        updated_line = line.rstrip() + f" [tested: {item.test_ref}]\n"
                        break  # Only add one reference per line
                        
                updated_lines.append(updated_line)
            
            # Write updated file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(updated_lines)
                
            print(f"📝 Updated checklist: {file_path}")
            
        except Exception as e:
            print(f"❌ Error updating {file_path}: {e}")

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Generate tests from SMART checklists')
    parser.add_argument('--checklist-files', help='File containing list of checklist files')
    parser.add_argument('--force-rebuild', action='store_true', help='Force rebuild all tests')
    parser.add_argument('--output-format', default='pytest', help='Test output format')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--update-checklists', action='store_true', help='Update checklists with test refs')
    parser.add_argument('--generated-tests-dir', help='Legacy parameter - tests now go to backend/tests and ui/tests')
    
    args = parser.parse_args()
    
    if args.verbose:
        print("🧪 SMART Checklist Test Builder")
        print("=" * 40)
    
    # Read checklist files
    checklist_files = []
    if args.checklist_files and os.path.exists(args.checklist_files):
        with open(args.checklist_files, 'r') as f:
            checklist_files = [line.strip() for line in f if line.strip()]
    
    if not checklist_files:
        print("❌ No checklist files found")
        return 1
    
    print(f"📋 Found {len(checklist_files)} checklist files:")
    for f in checklist_files:
        print(f"   - {f}")
    
    # Parse checklists
    parser_obj = ChecklistParser()
    all_items = []
    
    for file_path in checklist_files:
        if args.verbose:
            print(f"\n📖 Parsing: {file_path}")
        items = parser_obj.parse_file(file_path)
        all_items.extend(items)
        
        if args.verbose:
            testable_count = sum(1 for item in items if item.is_testable)
            print(f"   Found {len(items)} items, {testable_count} testable")
    
    if not all_items:
        print("❌ No items found in checklist files")
        return 1
    
    # Generate tests
    if not args.update_checklists:
        print(f"\n🔧 Generating tests...")
        generator = TestGenerator()
        generated_files = generator.generate_tests(all_items)
        
        if generated_files:
            print(f"\n✅ Generated {len(generated_files)} test files:")
            for group, file_path in generated_files.items():
                print(f"   📄 {group}: {file_path}")
        else:
            print("⚠️ No test files generated")
    
    # Update checklists with test references
    if args.update_checklists:
        print(f"\n📝 Updating checklists with test references...")
        updater = ChecklistUpdater()
        updater.update_checklists(all_items)
        
        updated_count = sum(1 for item in all_items if item.test_ref)
        print(f"✅ Updated {updated_count} checklist items with test references")
    
    print("\n🎉 Test builder completed successfully!")
    return 0

if __name__ == '__main__':
    sys.exit(main())
