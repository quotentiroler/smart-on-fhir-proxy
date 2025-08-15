#!/usr/bin/env python3
"""
AI-powered backend build error fixing script for GitHub Actions.
This script analyzes backend build errors and applies structured fixes using OpenAI's API.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List

import requests

# Constants
GITHUB_OUTPUT_DEFAULT = "/dev/null"


class BackendAIFixApplier:
    def __init__(self, openai_api_key: str, repo_root: str):
        self.api_key = openai_api_key
        self.repo_root = Path(repo_root)
        self.backend_root = self.repo_root / "backend"
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
        """Get structured fixes from OpenAI API for backend issues."""
        if not self.api_key:
            print("❌ OPENAI_API_KEY is not set - skipping AI fixes")
            return []
        
        print("✅ OpenAI API key is available, making request...")
        
        # Build the user content focused on backend
        user_content = f"""Fix these TypeScript/Node.js backend build errors. This is the backend part of a monorepo. Build errors are run from the backend/ directory, so file paths like 'src/file.ts' should be 'backend/src/file.ts' in your fixes.

BACKEND BUILD ERRORS:
{build_errors}

Focus on backend-specific issues like:
- TypeScript compilation errors
- Import/export issues  
- Type definitions
- Node.js/Express/Fastify related problems
- Database/ORM issues
- API route problems"""
        
        payload = {
            "model": "gpt-4o-2024-08-06",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a code fixing assistant specialized in TypeScript/Node.js backend applications. Analyze backend build errors and provide structured fixes. Always return valid JSON with fixes array, even if empty. IMPORTANT: File paths in build errors are relative to the backend/ folder. When providing file_path, include the full path from repository root (e.g., 'backend/src/file.ts' not 'src/file.ts'). Focus on backend-specific TypeScript, Node.js, API, and server-side issues."
                },
                {
                    "role": "user",
                    "content": user_content
                }
            ],
            "temperature": 0.1,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "backend_fixes",
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
                                            "description": "Path to the file to fix (from repo root)"
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
        
        print(f"🔧 Applying backend fix: {description}")
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
            
            print("✅ Backend fix applied successfully")
            return True
            
        except Exception as e:
            print(f"❌ Failed to apply backend fix: {e}")
            return False
    
    def apply_fixes(self, fixes: List[Dict]) -> bool:
        """Apply all fixes and return True if any were successfully applied."""
        if not fixes:
            print("ℹ️ No backend fixes to apply")
            return False
        
        print(f"🔢 Number of backend fixes: {len(fixes)}")
        applied_count = 0
        
        for fix in fixes:
            if self.apply_fix(fix):
                applied_count += 1
        
        print(f"✅ Successfully applied {applied_count}/{len(fixes)} backend fixes")
        return applied_count > 0
    
    def git_commit_and_push(self) -> bool:
        """Commit and push backend changes if any exist."""
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
                print("⚠️ No backend changes to commit")
                return False
            
            # Stage, commit and push
            subprocess.run(["git", "add", "."], cwd=self.repo_root, check=True)
            subprocess.run(["git", "commit", "-m", "chore: auto-fix backend build errors via OpenAI [skip ci]"], 
                         cwd=self.repo_root, check=True)
            subprocess.run(["git", "push"], cwd=self.repo_root, check=True)
            
            print("✅ Backend fixes committed and pushed")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Git operation failed: {e}")
            return False
    
    def retry_backend_build(self) -> bool:
        """Retry the backend build process."""
        print("🔄 Retrying backend build after AI fixes...")
        
        try:
            print("=== Retrying Backend Build ===")
            subprocess.run(["bun", "install"], cwd=self.backend_root, check=True)
            subprocess.run(["bun", "run", "build"], cwd=self.backend_root, check=True)
            
            print("✅ Backend build succeeded after AI fixes!")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Backend build still failed after AI fixes: {e}")
            return False


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python apply-backend-fixes.py <fixes-json-file>")
        sys.exit(1)
    
    fixes_file = sys.argv[1]
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    print("🔄 Applying reviewed backend fixes")
    print(f"📝 Reading fixes from: {fixes_file}")
    
    # Initialize the fixer
    fixer = BackendAIFixApplier(api_key, repo_root)
    
    # Read fixes from JSON file
    try:
        with open(fixes_file, 'r', encoding='utf-8') as f:
            fixes_data = json.load(f)
        fixes = fixes_data.get('fixes', [])
    except Exception as e:
        print(f"❌ Error reading fixes file: {e}")
        sys.exit(1)
    
    if not fixes:
        print("ℹ️ No fixes provided - exiting")
        with open(os.environ.get("GITHUB_OUTPUT", GITHUB_OUTPUT_DEFAULT), "a") as f:
            f.write("backend_build_success=false\n")
            f.write("backend_fixes_applied=false\n")
        sys.exit(1)
    
    print("🔍 Backend fixes to apply:")
    print(json.dumps({"fixes": fixes}, indent=2))
    print("--- End of backend fixes ---")
    
    # Apply fixes
    fixes_applied = fixer.apply_fixes(fixes)
    
    if fixes_applied:
        # Commit and push changes
        commit_success = fixer.git_commit_and_push()
        
        # Retry build
        build_success = fixer.retry_backend_build()
        
        # Set GitHub Actions output
        with open(os.environ.get("GITHUB_OUTPUT", GITHUB_OUTPUT_DEFAULT), "a") as f:
            f.write(f"backend_build_success={'true' if build_success else 'false'}\n")
            f.write("backend_fixes_applied=true\n")
            f.write(f"backend_commit_success={'true' if commit_success else 'false'}\n")
        
        if build_success:
            print("🎉 AI fixes successfully resolved the backend build issues!")
            sys.exit(0)  # Success - fixes worked
        else:
            print("⚠️ Backend AI fixes applied but build still fails")
            sys.exit(1)  # Failure - fixes didn't work
    else:
        print("⚠️ No backend patches were applied")
        with open(os.environ.get("GITHUB_OUTPUT", GITHUB_OUTPUT_DEFAULT), "a") as f:
            f.write("backend_build_success=false\n")
            f.write("backend_fixes_applied=false\n")
        sys.exit(1)  # Failure - no fixes applied


if __name__ == "__main__":
    main()
