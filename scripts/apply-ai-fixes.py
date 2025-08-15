#!/usr/bin/env python3
"""
AI-powered build error fixing script for GitHub Actions.
This script analyzes build errors and applies structured fixes using OpenAI's API.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests


class AIFixApplier:
    def __init__(self, openai_api_key: str, repo_root: str):
        self.api_key = openai_api_key
        self.repo_root = Path(repo_root)
        self.base_url = "https://api.openai.com/v1/chat/completions"
        
    def read_build_log(self, log_file: str) -> str:
        """Read build errors from log file."""
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # Limit to first 2000 lines to avoid token limits
                lines = content.split('\n')[:2000]
                return '\n'.join(lines)
        except FileNotFoundError:
            print(f"❌ Build log file not found: {log_file}")
            return ""
    
    def get_ai_fixes(self, build_errors: str) -> List[Dict]:
        """Get structured fixes from OpenAI API."""
        if not self.api_key:
            print("❌ OPENAI_API_KEY is not set - skipping AI fixes")
            return []
        
        print("✅ OpenAI API key is available, making request...")
        
        payload = {
            "model": "gpt-4o-2024-08-06",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a code fixing assistant. Analyze build errors and provide structured fixes. Always return valid JSON with fixes array, even if empty. IMPORTANT: File paths in build errors are relative to project folders (backend/ or ui/). When providing file_path, include the full path from repository root (e.g., 'ui/src/file.tsx' not 'src/file.tsx')."
                },
                {
                    "role": "user",
                    "content": f"Fix these TypeScript/JavaScript build errors. Note: This is a monorepo with backend/ and ui/ folders. Build errors from the UI are run from the ui/ directory, so file paths like 'src/file.tsx' should be 'ui/src/file.tsx' in your fixes. Build errors from backend are run from backend/ directory, so 'src/file.ts' should be 'backend/src/file.ts':\n\n{build_errors}"
                }
            ],
            "temperature": 0.1,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "code_fixes",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "fixes": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "file_path": {
                                            "type": "string",
                                            "description": "Path to the file to fix"
                                        },
                                        "line_number": {
                                            "type": "number",
                                            "description": "Line number where the fix should be applied"
                                        },
                                        "search_text": {
                                            "type": "string",
                                            "description": "Exact text to search for and replace"
                                        },
                                        "replacement_text": {
                                            "type": "string",
                                            "description": "Text to replace the search text with"
                                        },
                                        "description": {
                                            "type": "string",
                                            "description": "Description of what this fix does"
                                        }
                                    },
                                    "required": ["file_path", "line_number", "search_text", "replacement_text", "description"],
                                    "additionalProperties": False
                                }
                            }
                        },
                        "required": ["fixes"],
                        "additionalProperties": False
                    }
                }
            }
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        try:
            response = requests.post(self.base_url, json=payload, headers=headers, timeout=60)
            print(f"🌐 OpenAI API HTTP Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                fixes_json = result['choices'][0]['message']['content']
                fixes_data = json.loads(fixes_json)
                print("✅ OpenAI API call successful")
                return fixes_data.get('fixes', [])
            else:
                print(f"❌ OpenAI API call failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error calling OpenAI API: {e}")
            return []
    
    def apply_fix(self, fix: Dict) -> bool:
        """Apply a single fix to a file."""
        file_path = self.repo_root / fix['file_path']
        search_text = fix['search_text']
        replacement_text = fix['replacement_text']
        description = fix['description']
        
        print(f"🔧 Applying fix: {description}")
        print(f"📁 File: {file_path}")
        print(f"🔍 Search: {search_text}")
        print(f"🔄 Replace: {replacement_text}")
        
        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            return False
        
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Apply replacement
            new_content = content.replace(search_text, replacement_text)
            
            if new_content == content:
                print("⚠️ No changes made - search text not found")
                return False
            
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print("✅ Fix applied successfully")
            return True
            
        except Exception as e:
            print(f"❌ Failed to apply fix: {e}")
            return False
    
    def apply_fixes(self, fixes: List[Dict]) -> bool:
        """Apply all fixes and return True if any were successfully applied."""
        if not fixes:
            print("ℹ️ No fixes to apply")
            return False
        
        print(f"🔢 Number of fixes: {len(fixes)}")
        applied_count = 0
        
        for fix in fixes:
            if self.apply_fix(fix):
                applied_count += 1
        
        print(f"✅ Successfully applied {applied_count}/{len(fixes)} fixes")
        return applied_count > 0
    
    def git_commit_and_push(self) -> bool:
        """Commit and push changes if any exist."""
        try:
            # Configure git
            subprocess.run(["git", "config", "user.name", "github-actions[bot]"], 
                         cwd=self.repo_root, check=True)
            subprocess.run(["git", "config", "user.email", "github-actions[bot]@users.noreply.github.com"], 
                         cwd=self.repo_root, check=True)
            
            # Check if there are changes
            result = subprocess.run(["git", "status", "--porcelain"], 
                                  cwd=self.repo_root, capture_output=True, text=True)
            
            if not result.stdout.strip():
                print("⚠️ No changes to commit")
                return False
            
            # Stage, commit and push
            subprocess.run(["git", "add", "."], cwd=self.repo_root, check=True)
            subprocess.run(["git", "commit", "-m", "chore: auto-fix build errors via OpenAI [skip ci]"], 
                         cwd=self.repo_root, check=True)
            subprocess.run(["git", "push"], cwd=self.repo_root, check=True)
            
            print("✅ Code fixes committed and pushed")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Git operation failed: {e}")
            return False
    
    def retry_build(self) -> bool:
        """Retry the build process."""
        print("🔄 Retrying build after AI fixes...")
        
        try:
            # Backend build
            print("=== Retrying Backend Build ===")
            subprocess.run(["bun", "install"], cwd=self.repo_root / "backend", check=True)
            subprocess.run(["bun", "run", "build"], cwd=self.repo_root / "backend", check=True)
            
            # UI build
            print("=== Retrying UI Build ===")
            subprocess.run(["bun", "install"], cwd=self.repo_root / "ui", check=True)
            subprocess.run(["bun", "run", "build"], cwd=self.repo_root / "ui", check=True)
            
            print("✅ Build succeeded after AI fixes!")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Build still failed after AI fixes: {e}")
            return False


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python apply-ai-fixes.py <build-log-file>")
        sys.exit(1)
    
    build_log_file = sys.argv[1]
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is required")
        sys.exit(1)
    
    print(f"🔄 Auto-fix attempt after build failure")
    print(f"📝 Analyzing build errors from: {build_log_file}")
    
    # Initialize the fixer
    fixer = AIFixApplier(api_key, repo_root)
    
    # Read build errors
    build_errors = fixer.read_build_log(build_log_file)
    if not build_errors:
        print("❌ No build errors found")
        sys.exit(1)
    
    # Debug: show what we're sending to AI
    print("🔍 Build errors being sent to AI (first 500 chars):")
    print(build_errors[:500] + "...")
    
    # Get AI fixes
    fixes = fixer.get_ai_fixes(build_errors)
    
    print("🔍 AI generated structured fixes:")
    print(json.dumps({"fixes": fixes}, indent=2))
    print("--- End of fixes ---")
    
    # Apply fixes
    fixes_applied = fixer.apply_fixes(fixes)
    
    if fixes_applied:
        # Commit and push changes
        commit_success = fixer.git_commit_and_push()
        
        # Retry build
        build_success = fixer.retry_build()
        
        # Set GitHub Actions output
        with open(os.environ.get("GITHUB_OUTPUT", "/dev/null"), "a") as f:
            f.write(f"build_success={'true' if build_success else 'false'}\n")
            f.write("fixes_applied=true\n")
            f.write(f"commit_success={'true' if commit_success else 'false'}\n")
        
        if build_success:
            print("🎉 AI fixes successfully resolved the build issues!")
            sys.exit(0)  # Success - fixes worked
        else:
            print("⚠️ AI fixes applied but build still fails")
            sys.exit(1)  # Failure - fixes didn't work
    else:
        print("⚠️ No patches were applied")
        with open(os.environ.get("GITHUB_OUTPUT", "/dev/null"), "a") as f:
            f.write("build_success=false\n")
            f.write("fixes_applied=false\n")
        sys.exit(1)  # Failure - no fixes applied


if __name__ == "__main__":
    main()
