#!/usr/bin/env python3
"""
Apply Changes: Apply reviewed changes to actual files
This script applies the final approved changes to both frontend and backend files
"""

import json
import os
import sys
import subprocess
import re
from pathlib import Path
from typing import Dict, List


class UnifiedChangeApplier:
    def __init__(self, repo_root: str):
        self.repo_root = Path(repo_root)
        self.changes_applied = 0
        self.errors_encountered = 0
        
    def detect_component_type(self, changes_data: Dict) -> str:
        """Detect component type from changes data"""
        content_str = json.dumps(changes_data).lower()
        
        if any(indicator in content_str for indicator in ['ui/', 'vite', 'react', 'jsx', 'tsx']):
            return "frontend"
        elif any(indicator in content_str for indicator in ['backend/', 'node', 'express', 'fastify']):
            return "backend"
        
        # Check files mentioned in changes
        if 'changes' in changes_data:
            for change in changes_data['changes']:
                file_path = change.get('file', '').lower()
                if 'ui/' in file_path or 'components' in file_path:
                    return "frontend"
                elif 'backend/' in file_path or 'src/lib' in file_path or 'src/routes' in file_path:
                    return "backend"
        
        return "mixed"
    
    def apply_change_to_file(self, action: str, file_path: str, search_pattern: str, replacement: str, reasoning: str) -> bool:
        """Apply a single change to a file (modify existing or create new)."""
        full_path = self.repo_root / file_path
        
        if action == "create":
            # Create new file
            if full_path.exists():
                print(f"⚠️ File already exists: {file_path} (will overwrite)", file=sys.stderr)
            
            try:
                # Ensure parent directories exist
                full_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write new file content
                full_path.write_text(replacement, encoding='utf-8')
                
                print(f"✅ Created new file: {file_path}", file=sys.stderr)
                print(f"   Reason: {reasoning}", file=sys.stderr)
                print(f"   Size: {len(replacement)} characters", file=sys.stderr)
                
                return True
                
            except Exception as e:
                print(f"❌ Error creating file {file_path}: {e}", file=sys.stderr)
                return False
        
        elif action == "modify":
            # Modify existing file
            if not full_path.exists():
                print(f"❌ File not found: {file_path}", file=sys.stderr)
                return False
            
            try:
                # Read file content
                original_content = full_path.read_text(encoding='utf-8')
                
                # Check if search pattern exists
                if search_pattern not in original_content:
                    print(f"❌ Search pattern not found in {file_path}", file=sys.stderr)
                    print(f"   Pattern: {repr(search_pattern)}", file=sys.stderr)
                    return False
                
                # Count occurrences
                occurrence_count = original_content.count(search_pattern)
                if occurrence_count > 1:
                    print(f"⚠️ Pattern appears {occurrence_count} times in {file_path}", file=sys.stderr)
                    print("   Will replace all occurrences", file=sys.stderr)
                
                # Apply replacement
                new_content = original_content.replace(search_pattern, replacement)
                
                if new_content == original_content:
                    print(f"⚠️ No changes made to {file_path}", file=sys.stderr)
                    return False
                
                # Write back to file
                full_path.write_text(new_content, encoding='utf-8')
                
                print(f"✅ Modified file: {file_path}", file=sys.stderr)
                print(f"   Reason: {reasoning}", file=sys.stderr)
                print(f"   Replaced {occurrence_count} occurrence(s)", file=sys.stderr)
                
                return True
                
            except Exception as e:
                print(f"❌ Error modifying file {file_path}: {e}", file=sys.stderr)
                return False
        
        else:
            print(f"❌ Unknown action: {action}", file=sys.stderr)
            return False
    
    def setup_git_config(self):
        """Set up git configuration for GitHub App commits."""
        try:
            # Configure git for GitHub App commits
            subprocess.run([
                "git", "config", "user.name", "github-actions[bot]"
            ], check=True, capture_output=True)
            
            subprocess.run([
                "git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"
            ], check=True, capture_output=True)
            
            print("✅ Git configuration set for GitHub App", file=sys.stderr)
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to configure git: {e}", file=sys.stderr)
            return False
    
    def commit_and_push_changes(self, component_type: str, changes_applied: int):
        """Commit and push changes with proper GitHub App authentication."""
        try:
            # Check if there are any changes to commit
            result = subprocess.run([
                "git", "diff", "--name-only"
            ], capture_output=True, text=True)
            
            if not result.stdout.strip():
                print("ℹ️ No changes to commit", file=sys.stderr)
                return True
            
            changed_files = result.stdout.strip().split('\n')
            print(f"📝 Changed files: {', '.join(changed_files)}", file=sys.stderr)
            
            # Add all changes
            subprocess.run(["git", "add", "."], check=True)
            
            # Create commit message
            commit_message = f"🤖 AI change: Apply {changes_applied} {component_type} changes\n\nchangeed files:\n" + \
                           "\n".join(f"- {file}" for file in changed_files)
            
            # Commit changes
            subprocess.run([
                "git", "commit", "-m", commit_message
            ], check=True)
            
            print(f"✅ Committed {changes_applied} changes", file=sys.stderr)
            
            # Push changes using GitHub App token
            github_token = os.environ.get("GITHUB_TOKEN")
            if github_token:
                # Get current branch
                branch_result = subprocess.run([
                    "git", "rev-parse", "--abbrev-ref", "HEAD"
                ], capture_output=True, text=True, check=True)
                
                current_branch = branch_result.stdout.strip()
                
                # Push with GitHub App token
                subprocess.run([
                    "git", "push", "origin", current_branch
                ], check=True)
                
                print(f"✅ Pushed changes to {current_branch}", file=sys.stderr)
            else:
                print("⚠️ No GITHUB_TOKEN found, skipping push", file=sys.stderr)
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to commit/push changes: {e}", file=sys.stderr)
            return False
    
    def apply_changes(self, changes_data: Dict) -> Dict:
        """Apply all changes from the reviewed changes."""
        if not isinstance(changes_data, dict) or 'changes' not in changes_data:
            print("❌ Invalid changes data format", file=sys.stderr)
            return {
                "success": False,
                "changes_applied": 0,
                "errors": ["Invalid changes data format"]
            }
        
        # Detect component type
        component_type = self.detect_component_type(changes_data)
        print(f"🎯 Applying {component_type} changes...", file=sys.stderr)
        
        changes = changes_data['changes']
        if not changes:
            print("ℹ️ No changes to apply", file=sys.stderr)
            return {
                "success": True,
                "changes_applied": 0,
                "errors": []
            }
        
        errors = []
        
        # Apply each change
        for i, change in enumerate(changes, 1):
            print(f"\n🔧 Applying change {i}/{len(changes)}...", file=sys.stderr)
            
            action = change.get('action', 'modify')  # Default to modify for backward compatibility
            file_path = change.get('file', '')
            search_pattern = change.get('search', '')
            replacement = change.get('replace', '')
            reasoning = change.get('reasoning', 'No reasoning provided')
            
            # Validate required fields based on action
            if action == "create":
                if not all([file_path, replacement]):
                    error_msg = f"change {i}: Missing required fields for create action (file, replace)"
                    print(f"❌ {error_msg}", file=sys.stderr)
                    errors.append(error_msg)
                    self.errors_encountered += 1
                    continue
            elif action == "modify":
                if not all([file_path, search_pattern]):
                    error_msg = f"change {i}: Missing required fields for modify action (file, search)"
                    print(f"❌ {error_msg}", file=sys.stderr)
                    errors.append(error_msg)
                    self.errors_encountered += 1
                    continue
            else:
                error_msg = f"change {i}: Unknown action '{action}'"
                print(f"❌ {error_msg}", file=sys.stderr)
                errors.append(error_msg)
                self.errors_encountered += 1
                continue
            
            success = self.apply_change_to_file(action, file_path, search_pattern, replacement, reasoning)
            
            if success:
                self.changes_applied += 1
            else:
                self.errors_encountered += 1
                errors.append(f"Failed to apply change to {file_path}")
        
        # Set up git and commit if we have changes
        if self.changes_applied > 0:
            print(f"\n📦 Committing {self.changes_applied} changes...", file=sys.stderr)
            
            if self.setup_git_config():
                commit_success = self.commit_and_push_changes(component_type, self.changes_applied)
                if not commit_success:
                    errors.append("Failed to commit/push changes")
        
        # Summary
        total_changes = len(changes)
        print(f"\n📊 Summary:", file=sys.stderr)
        print(f"   ✅ Applied: {self.changes_applied}/{total_changes}", file=sys.stderr)
        print(f"   ❌ Errors: {self.errors_encountered}/{total_changes}", file=sys.stderr)
        
        return {
            "success": self.errors_encountered == 0,
            "changes_applied": self.changes_applied,
            "total_changes": total_changes,
            "errors": errors,
            "component_type": component_type
        }


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python apply-changes.py <reviewed-changes-json>", file=sys.stderr)
        sys.exit(1)
    
    changes_json_file = sys.argv[1]
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    print("🤖 Starting unified change application...", file=sys.stderr)
    
    # Read reviewed changes
    try:
        print(f"📖 Reading changes from: {changes_json_file}", file=sys.stderr)
        
        if not os.path.exists(changes_json_file):
            print(f"❌ File does not exist: {changes_json_file}", file=sys.stderr)
            sys.exit(1)
            
        with open(changes_json_file, 'r', encoding='utf-8') as f:
            content = f.read()
            print(f"📄 File content (first 500 chars): {content[:500]}", file=sys.stderr)
            
            if not content.strip():
                print("❌ File is empty", file=sys.stderr)
                sys.exit(1)
                
            changes_data = json.loads(content)
            print(f"✅ Successfully parsed JSON with keys: {list(changes_data.keys())}", file=sys.stderr)
            
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse JSON: {e}", file=sys.stderr)
        print(f"📄 Raw content: {content}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to read changes JSON: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Initialize applier
    applier = UnifiedChangeApplier(repo_root)
    
    # Apply changes
    result = applier.apply_changes(changes_data)
    
    # Output result as JSON - ONLY JSON goes to stdout
    print(json.dumps(result, indent=2))
    
    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
