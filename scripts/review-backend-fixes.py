#!/usr/bin/env python3
"""
AI-powered backend build error review script - REVIEWER AI.
This script reviews proposed fixes and refines them using a senior AI approach.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict

import requests
from ai_fix_schema import get_openai_payload_base, get_common_headers, create_system_message, create_user_content_base


class BackendFixReviewer:
    def __init__(self, openai_api_key: str, repo_root: str):
        self.api_key = openai_api_key
        self.repo_root = Path(repo_root)
        self.base_url = "https://api.openai.com/v1/chat/completions"
        
    def read_build_log(self, log_file: str) -> str:
        """Read build errors from log file."""
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')[:2000]
                return '\n'.join(lines)
        except FileNotFoundError:
            print(f"❌ Build log file not found: {log_file}")
            return ""
    
    def review_fixes(self, proposed_fixes: Dict, build_errors: str) -> Dict:
        """Review and refine proposed fixes using a 'senior developer' AI approach."""
        if not self.api_key:
            print("❌ OPENAI_API_KEY is not set - skipping AI review")
            return {"analysis": "No API key", "fixes": []}
        
        print("🎓 Reviewer AI analyzing proposed backend fixes...")
        
        # Use shared schema and message creation
        user_content = f"""Review and refine these proposed backend fixes. Act as a senior developer reviewing a junior's work.

ORIGINAL BUILD ERRORS:
{build_errors}

PROPOSED FIXES FROM JUNIOR AI:
{json.dumps(proposed_fixes, indent=2)}

As a senior developer AI, carefully review each proposed fix:
1. Validate the approach and reasoning
2. Identify potential issues or better alternatives
3. Refine or completely rewrite fixes as needed
4. Only keep fixes that you're confident will work
5. Add new fixes if the junior missed important issues

Focus on:
- Correctness and safety of the proposed changes
- TypeScript best practices
- Potential side effects
- Missing edge cases
- Code quality and maintainability"""
        
        payload = get_openai_payload_base("gpt-5")
        payload["messages"] = [
            {
                "role": "system",
                "content": create_system_message("backend", "review")
            },
            {
                "role": "user",
                "content": user_content
            }
        ]
        
        headers = get_common_headers(self.api_key)
        
        print(f"🔍 Review request details:")
        print(f"  - API Key length: {len(self.api_key)}")
        print(f"  - Payload size: {len(json.dumps(payload))} chars")
        print(f"  - Proposed fixes count: {len(proposed_fixes.get('fixes', []))}")
        print(f"  - Build errors length: {len(build_errors)} chars")
        
        try:
            print("📡 Making request to OpenAI API...")
            response = requests.post(self.base_url, json=payload, headers=headers, timeout=60)
            print(f"🌐 Reviewer AI HTTP Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"📥 Response structure: {list(result.keys())}")
                
                if 'choices' in result and len(result['choices']) > 0:
                    choice = result['choices'][0]
                    print(f"📝 Choice structure: {list(choice.keys())}")
                    
                    if 'message' in choice and 'content' in choice['message']:
                        fixes_json = choice['message']['content']
                        print(f"📄 Response content length: {len(fixes_json)} chars")
                        print(f"📄 Response content preview: {fixes_json[:200]}...")
                        
                        try:
                            fixes_data = json.loads(fixes_json)
                            print("✅ Reviewer AI analysis successful")
                            print(f"📊 Parsed response structure: {list(fixes_data.keys())}")
                            return fixes_data  # Return full data structure like propose step
                        except json.JSONDecodeError as je:
                            print(f"❌ JSON decode error: {je}")
                            print(f"Raw content: {fixes_json}")
                            return {"analysis": "JSON parse error", "fixes": []}
                    else:
                        print("❌ Missing message content in response")
                        print(f"Choice content: {choice}")
                        return {"analysis": "Missing response content", "fixes": []}
                else:
                    print("❌ Missing choices in response")
                    print(f"Result content: {result}")
                    return {"analysis": "Missing choices", "fixes": []}
            else:
                print(f"❌ Reviewer AI call failed with status {response.status_code}")
                print(f"Response headers: {dict(response.headers)}")
                print(f"Response: {response.text}")
                return {"analysis": "API call failed", "fixes": []}
                
        except requests.exceptions.Timeout:
            print("❌ Request timed out after 60 seconds")
            return {"analysis": "Timeout error", "fixes": []}
        except requests.exceptions.RequestException as re:
            print(f"❌ Request error: {re}")
            return {"analysis": "Request error", "fixes": []}
        except Exception as e:
            print(f"❌ Unexpected error calling Reviewer AI: {e}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return {"analysis": "Error occurred", "fixes": []}


def main():
    """Main entry point."""
    if len(sys.argv) != 3:
        print("Usage: python review-backend-fixes.py <proposed-fixes-json> <build-log-file>")
        sys.exit(1)
    
    proposed_fixes_file = sys.argv[1]
    build_log_file = sys.argv[2]
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is required")
        sys.exit(1)
    
    print("🎓 Reviewer AI starting backend fix review...")
    print(f"📁 Proposed fixes file: {proposed_fixes_file}")
    print(f"📁 Build log file: {build_log_file}")
    print(f"🔑 API key available: {bool(api_key)}")
    print(f"📂 Repo root: {repo_root}")
    
    # Initialize the reviewer
    reviewer = BackendFixReviewer(api_key, repo_root)
    
    # Read proposed fixes
    try:
        print("📖 Reading proposed fixes...")
        with open(proposed_fixes_file, 'r', encoding='utf-8') as f:
            proposed_fixes = json.load(f)
        print(f"✅ Loaded proposed fixes: {len(proposed_fixes.get('fixes', []))} fixes")
        print(f"📊 Proposed fixes structure: {list(proposed_fixes.keys())}")
    except Exception as e:
        print(f"❌ Error reading proposed fixes: {e}")
        sys.exit(1)
    
    # Read build errors
    print("📖 Reading build errors...")
    build_errors = reviewer.read_build_log(build_log_file)
    if not build_errors:
        print("❌ No backend build errors found")
        sys.exit(1)
    print(f"✅ Loaded build errors: {len(build_errors)} chars")
    
    # Review and refine fixes
    print("🎓 Starting AI review process...")
    reviewed_data = reviewer.review_fixes(proposed_fixes, build_errors)
    
    print(f"📤 Review completed, outputting results...")
    print(f"📊 Reviewed data structure: {list(reviewed_data.keys()) if isinstance(reviewed_data, dict) else 'Not a dict'}")
    
    # Output as JSON for the application step - consistent with propose step
    print(json.dumps(reviewed_data, indent=2))


if __name__ == "__main__":
    main()
