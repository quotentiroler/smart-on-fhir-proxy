#!/usr/bin/env python3
"""
AI-powered frontend build error fixing script for GitHub Actions.
This script analyzes frontend build errors and applies structured fixes using OpenAI's API.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List

import requests


class FrontendAIFixApplier:
    def __init__(self, openai_api_key: str, repo_root: str):
        self.api_key = openai_api_key
        self.repo_root = Path(repo_root)
        self.ui_root = self.repo_root / "ui"
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
    
    def read_api_client_context(self) -> str:
        """Read essential API client files to provide focused context about backend-frontend integration."""
        api_client_dir = self.ui_root / "src" / "lib" / "api-client"
        
        if not api_client_dir.exists():
            return ""
        
        context_parts = self._read_api_context_files(api_client_dir)
        
        if context_parts:
            print(f"📡 Including API client context for frontend fixes ({len(context_parts)} files)")
            return "\n".join(context_parts)
        else:
            print("ℹ️ No API client context found")
            return ""
    
    def _read_api_context_files(self, api_client_dir: Path) -> List[str]:
        """Read API context files with limited content."""
        context_parts = []
        index_filename = "index.ts"
        
        # Main index file
        self._add_file_content(api_client_dir / index_filename, "API Client Index", context_parts)
        
        # APIs index file
        self._add_file_content(api_client_dir / "apis" / index_filename, "Available APIs", context_parts, 1000)
        
        # Models index file
        self._add_file_content(api_client_dir / "models" / index_filename, "Available Types/Models", context_parts, 1500)
        
        return context_parts
    
    def _add_file_content(self, file_path: Path, section_name: str, context_parts: List[str], max_chars: int = None):
        """Add file content to context parts with optional truncation."""
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if max_chars and len(content) > max_chars:
                        content = content[:max_chars] + "\n... (truncated)"
                    context_parts.append(f"=== {section_name} ===\n{content}\n")
            except Exception as e:
                print(f"⚠️ Could not read {file_path}: {e}")
    
    def get_ai_fixes(self, build_errors: str) -> List[Dict]:
        """Get structured fixes from OpenAI API for frontend issues."""
        if not self.api_key:
            print("❌ OPENAI_API_KEY is not set - skipping AI fixes")
            return []
        
        print("✅ OpenAI API key is available, making request...")
        
        # Get API client context for better frontend-backend integration fixes
        api_context = self.read_api_client_context()
        
        # Build the user content focused on frontend
        user_content = f"""Fix these TypeScript/React frontend build errors. This is the frontend part of a monorepo. Build errors are run from the ui/ directory, so file paths like 'src/file.tsx' should be 'ui/src/file.tsx' in your fixes.

FRONTEND BUILD ERRORS:
{build_errors}"""
        
        if api_context:
            user_content += f"""

GENERATED API CLIENT CONTEXT (for frontend-backend integration):
{api_context}

The above shows the current generated API client code. Use this context to understand the available API endpoints, models, and types when fixing frontend code that interacts with the backend."""
        
        user_content += """

Focus on frontend-specific issues like:
- React component errors
- TypeScript compilation in JSX/TSX files
- Import/export issues in components
- State management problems
- API client integration issues
- UI library integration problems
- Vite/build tool issues"""
        
        payload = {
            "model": "gpt-5",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a code fixing assistant specialized in TypeScript/React frontend applications. Analyze frontend build errors and provide structured fixes. Always return valid JSON with fixes array, even if empty. IMPORTANT: File paths in build errors are relative to the ui/ folder. When providing file_path, include the full path from repository root (e.g., 'ui/src/file.tsx' not 'src/file.tsx'). Pay special attention to API client integration - if you see generated API client context, use it to understand available endpoints and types when fixing frontend code. Focus on React, TypeScript, JSX/TSX, and frontend-specific issues."
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
                    "name": "frontend_fixes",
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
        
        print(f"🔧 Applying frontend fix: {description}")
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
            
            print("✅ Frontend fix applied successfully")
            return True
            
        except Exception as e:
            print(f"❌ Failed to apply frontend fix: {e}")
            return False
    
    def apply_fixes(self, fixes: List[Dict]) -> bool:
        """Apply all fixes and return True if any were successfully applied."""
        if not fixes:
            print("ℹ️ No frontend fixes to apply")
            return False
        
        print(f"🔢 Number of frontend fixes: {len(fixes)}")
        applied_count = 0
        
        for fix in fixes:
            if self.apply_fix(fix):
                applied_count += 1
        
        print(f"✅ Successfully applied {applied_count}/{len(fixes)} frontend fixes")
        return applied_count > 0
    
    def git_commit_and_push(self) -> bool:
        """Commit and push frontend changes if any exist."""
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
                print("⚠️ No frontend changes to commit")
                return False
            
            # Stage, commit and push
            subprocess.run(["git", "add", "."], cwd=self.repo_root, check=True)
            subprocess.run(["git", "commit", "-m", "chore: auto-fix frontend build errors via OpenAI [skip ci]"], 
                         cwd=self.repo_root, check=True)
            subprocess.run(["git", "push"], cwd=self.repo_root, check=True)
            
            print("✅ Frontend fixes committed and pushed")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Git operation failed: {e}")
            return False
    
    def retry_frontend_build(self) -> bool:
        """Retry the frontend build process."""
        print("🔄 Retrying frontend build after AI fixes...")
        
        try:
            print("=== Retrying Frontend Build ===")
            subprocess.run(["bun", "install"], cwd=self.ui_root, check=True)
            subprocess.run(["bun", "run", "build"], cwd=self.ui_root, check=True)
            
            print("✅ Frontend build succeeded after AI fixes!")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Frontend build still failed after AI fixes: {e}")
            return False


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python apply-frontend-fixes.py <build-log-file>")
        sys.exit(1)
    
    build_log_file = sys.argv[1]
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is required")
        sys.exit(1)
    
    print("🔄 Auto-fix attempt after frontend build failure")
    print(f"📝 Analyzing frontend build errors from: {build_log_file}")
    
    # Initialize the fixer
    fixer = FrontendAIFixApplier(api_key, repo_root)
    
    # Read build errors
    build_errors = fixer.read_build_log(build_log_file)
    if not build_errors:
        print("❌ No frontend build errors found")
        sys.exit(1)
    
    # Debug: show what we're sending to AI
    print("🔍 Frontend build errors being sent to AI (first 500 chars):")
    print(build_errors[:500] + "...")
    
    # Get AI fixes
    fixes = fixer.get_ai_fixes(build_errors)
    
    print("🔍 AI generated frontend fixes:")
    print(json.dumps({"fixes": fixes}, indent=2))
    print("--- End of frontend fixes ---")
    
    # Apply fixes
    fixes_applied = fixer.apply_fixes(fixes)
    
    if fixes_applied:
        # Commit and push changes
        commit_success = fixer.git_commit_and_push()
        
        # Retry build
        build_success = fixer.retry_frontend_build()
        
        # Set GitHub Actions output
        with open(os.environ.get("GITHUB_OUTPUT", "/dev/null"), "a") as f:
            f.write(f"frontend_build_success={'true' if build_success else 'false'}\n")
            f.write("frontend_fixes_applied=true\n")
            f.write(f"frontend_commit_success={'true' if commit_success else 'false'}\n")
        
        if build_success:
            print("🎉 AI fixes successfully resolved the frontend build issues!")
            sys.exit(0)  # Success - fixes worked
        else:
            print("⚠️ Frontend AI fixes applied but build still fails")
            sys.exit(1)  # Failure - fixes didn't work
    else:
        print("⚠️ No frontend patches were applied")
        with open(os.environ.get("GITHUB_OUTPUT", "/dev/null"), "a") as f:
            f.write("frontend_build_success=false\n")
            f.write("frontend_fixes_applied=false\n")
        sys.exit(1)  # Failure - no fixes applied


if __name__ == "__main__":
    main()
