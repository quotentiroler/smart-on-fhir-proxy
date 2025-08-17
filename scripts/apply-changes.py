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
        
        print(f"🔧 Processing {action} action for {file_path}", file=sys.stderr)
        print(f"   Repo root: {self.repo_root}", file=sys.stderr)
        print(f"   Full path: {full_path}", file=sys.stderr)
        print(f"   Full path absolute: {full_path.resolve()}", file=sys.stderr)
        
        if action == "create":
            # Create new file
            if full_path.exists():
                print(f"⚠️ File already exists: {file_path} (will overwrite)", file=sys.stderr)
            
            try:
                # Ensure parent directories exist
                full_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write new file content
                full_path.write_text(replacement, encoding='utf-8')
                
                # Verify file was created
                if full_path.exists():
                    actual_size = len(full_path.read_text(encoding='utf-8'))
                    print(f"✅ Created new file: {file_path}", file=sys.stderr)
                    print(f"   Reason: {reasoning}", file=sys.stderr)
                    print(f"   Expected size: {len(replacement)} characters", file=sys.stderr)
                    print(f"   Actual size: {actual_size} characters", file=sys.stderr)
                    print(f"   File exists: {full_path.exists()}", file=sys.stderr)
                else:
                    print(f"❌ File creation verification failed: {file_path}", file=sys.stderr)
                    return False
                
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
            print("🔄 STARTING GIT COMMIT AND PUSH PROCESS", file=sys.stderr)
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", file=sys.stderr)
            
            # Change to repository root directory
            original_cwd = os.getcwd()
            os.chdir(self.repo_root)
            print(f"📁 Changed to repo root: {self.repo_root}", file=sys.stderr)
            
            # Check if there are any changes to commit
            print("📋 Checking for changes to commit...", file=sys.stderr)
            
            # First, let's see what git status shows
            print("📊 Detailed git status:", file=sys.stderr)
            status_result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
            status_output = status_result.stdout.strip()
            if status_output:
                print("   Git status output:", file=sys.stderr)
                for line in status_output.split('\n'):
                    print(f"   {line}", file=sys.stderr)
            else:
                print("   Git status shows no changes", file=sys.stderr)
            
            # Check git diff for unstaged changes
            print("📋 Checking git diff for unstaged changes...", file=sys.stderr)
            result = subprocess.run([
                "git", "diff", "--name-only"
            ], capture_output=True, text=True)
            
            # Also check for untracked files using git status (more reliable)
            print("📋 Checking for untracked files...", file=sys.stderr)
            status_result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
            
            # Parse git status output for untracked files
            untracked_files = []
            for line in status_result.stdout.strip().split('\n'):
                if line.strip() and line.startswith('??'):
                    file_path = line[3:].strip()
                    untracked_files.append(file_path)
            
            changed_files = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            # Combine changed and untracked files
            all_changed_files = []
            if changed_files and changed_files[0]:  # Check if not empty
                all_changed_files.extend(changed_files)
            if untracked_files and untracked_files[0]:  # Check if not empty
                all_changed_files.extend(untracked_files)
            
            print(f"📝 Found {len(changed_files)} modified files and {len(untracked_files)} untracked files", file=sys.stderr)
            
            if not all_changed_files:
                print("ℹ️ No changes to commit (no modified or untracked files)", file=sys.stderr)
                return True
            
            changed_files = all_changed_files
            print(f"📝 Total files to commit: {len(changed_files)}", file=sys.stderr)
            for file in changed_files:
                print(f"   • {file}", file=sys.stderr)
            
            # Check git status for additional info
            print("📊 Git status before adding files:", file=sys.stderr)
            status_result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
            for line in status_result.stdout.strip().split('\n'):
                if line.strip():
                    print(f"   {line}", file=sys.stderr)
            
            # Add all changes explicitly by file path to avoid .gitignore issues
            print("📦 Adding all changes to git...", file=sys.stderr)
            
            # Add each file explicitly to ensure it's included
            for file_path in changed_files:
                try:
                    subprocess.run(["git", "add", file_path], check=True, capture_output=True, text=True)
                    print(f"   ✅ Added: {file_path}", file=sys.stderr)
                except subprocess.CalledProcessError as e:
                    print(f"   ⚠️ Failed to add {file_path}: {e.stderr}", file=sys.stderr)
                    # Continue with other files
            
            print("✅ Successfully added changes to git", file=sys.stderr)
            
            # Create commit message
            total_files = len(changed_files)
            commit_message = f"🤖 AI change: Apply {changes_applied} {component_type} changes ({total_files} files)\n\nChanged files:\n" + \
                           "\n".join(f"- {file}" for file in changed_files)
            
            # Commit changes
            print(f"💾 Committing {total_files} files with {changes_applied} changes...", file=sys.stderr)
            first_line = commit_message.split('\n')[0]
            print(f"📝 Commit message: {first_line}", file=sys.stderr)
            commit_result = subprocess.run([
                "git", "commit", "-m", commit_message
            ], capture_output=True, text=True, check=True)
            
            print(f"✅ Successfully committed {total_files} files with {changes_applied} changes", file=sys.stderr)
            if commit_result.stdout:
                print(f"📝 Commit output: {commit_result.stdout}", file=sys.stderr)
            if commit_result.stderr:
                print(f"📝 Commit stderr: {commit_result.stderr}", file=sys.stderr)
            
            # Check current branch and remote info
            branch_result = subprocess.run([
                "git", "rev-parse", "--abbrev-ref", "HEAD"
            ], capture_output=True, text=True, check=True)
            
            current_branch = branch_result.stdout.strip()
            print(f"🌿 Current branch: {current_branch}", file=sys.stderr)
            
            # Check if remote exists
            remote_result = subprocess.run([
                "git", "remote", "get-url", "origin"
            ], capture_output=True, text=True)
            
            if remote_result.returncode == 0:
                print(f"🌐 Remote origin URL: {remote_result.stdout.strip()}", file=sys.stderr)
            else:
                print("⚠️ No remote origin configured", file=sys.stderr)
            
            # Push changes using GitHub App token
            github_token = os.environ.get("GITHUB_TOKEN")
            if github_token:
                print(f"🔑 GITHUB_TOKEN found (length: {len(github_token)})", file=sys.stderr)
                print(f"📤 Attempting to push to origin/{current_branch}...", file=sys.stderr)
                
                # Push with GitHub App token and capture detailed output
                push_result = subprocess.run([
                    "git", "push", "origin", current_branch
                ], capture_output=True, text=True)
                
                if push_result.returncode == 0:
                    print(f"✅ Successfully pushed changes to {current_branch}", file=sys.stderr)
                    print(f"📤 Push output: {push_result.stdout}", file=sys.stderr)
                    if push_result.stderr:
                        print(f"📝 Push stderr: {push_result.stderr}", file=sys.stderr)
                else:
                    print(f"❌ Push failed with return code: {push_result.returncode}", file=sys.stderr)
                    print(f"📤 Push stdout: {push_result.stdout}", file=sys.stderr)
                    print(f"📝 Push stderr: {push_result.stderr}", file=sys.stderr)
                    return False
                
            else:
                print("⚠️ No GITHUB_TOKEN found, skipping push", file=sys.stderr)
                print("🔍 Available environment variables:", file=sys.stderr)
                for key in sorted(os.environ.keys()):
                    if 'TOKEN' in key or 'GIT' in key or 'GITHUB' in key:
                        print(f"   {key}=***", file=sys.stderr)
            
            print("🎉 Git commit and push process completed successfully!", file=sys.stderr)
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", file=sys.stderr)
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to commit/push changes: {e}", file=sys.stderr)
            return False
        finally:
            # Restore original working directory
            try:
                os.chdir(original_cwd)
            except NameError:
                pass  # original_cwd not set if early return
    
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
