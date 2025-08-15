#!/usr/bin/env python3
"""
AI-powered backend build error analysis script - PROPOSER AI.
This script analyzes backend build errors and proposes initial fixes using OpenAI's API.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict

import requests
from ai_fix_schema import get_propose_payload_base, get_common_headers, create_system_message, create_user_content_base


class BackendFixProposer:
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
            print(f"❌ Build log file not found: {log_file}", file=sys.stderr)
            return ""
    
    def propose_fixes(self, build_errors: str) -> Dict:
        """Propose initial fixes using a 'junior developer' AI approach."""
        if not self.api_key:
            print("❌ OPENAI_API_KEY is not set - skipping AI fixes", file=sys.stderr)
            return {"analysis": "No API key", "fixes": []}
        
        print("🧠 Proposer AI analyzing backend build errors...", file=sys.stderr)
        
        # Use shared schema and message creation
        user_content = create_user_content_base("backend", build_errors, "propose")
        user_content += """

As a junior developer AI, propose fixes for backend-specific issues. Be creative and propose multiple potential solutions even if you're not 100% certain. The goal is to generate good starting points that can be refined by a senior reviewer."""
        
        payload = get_propose_payload_base("gpt-5")
        payload["messages"] = [
            {
                "role": "system",
                "content": create_system_message("backend", "propose")
            },
            {
                "role": "user", 
                "content": user_content
            }
        ]
        
        headers = get_common_headers(self.api_key)
        
        try:
            response = requests.post(self.base_url, json=payload, headers=headers, timeout=60)
            print(f"🌐 Proposer AI HTTP Status: {response.status_code}", file=sys.stderr)
            
            if response.status_code == 200:
                result = response.json()
                fixes_json = result['choices'][0]['message']['content']
                fixes_data = json.loads(fixes_json)
                print("✅ Proposer AI analysis successful", file=sys.stderr)
                return fixes_data
            else:
                print(f"❌ Proposer AI call failed with status {response.status_code}", file=sys.stderr)
                print(f"Response: {response.text}", file=sys.stderr)
                return {"analysis": "Failed to analyze", "fixes": []}
                
        except Exception as e:
            print(f"❌ Error calling Proposer AI: {e}", file=sys.stderr)
            return {"analysis": "Error occurred", "fixes": []}


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python propose-backend-fixes.py <build-log-file>", file=sys.stderr)
        sys.exit(1)
    
    build_log_file = sys.argv[1]
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print("🧠 Proposer AI starting backend analysis...", file=sys.stderr)
    
    # Initialize the proposer
    proposer = BackendFixProposer(api_key, repo_root)
    
    # Read build errors
    build_errors = proposer.read_build_log(build_log_file)
    if not build_errors:
        print("❌ No backend build errors found", file=sys.stderr)
        sys.exit(1)
    
    # Get proposed fixes
    proposed_fixes = proposer.propose_fixes(build_errors)
    
    # Output as JSON for the next step - ONLY JSON goes to stdout
    print(json.dumps(proposed_fixes, indent=2))


if __name__ == "__main__":
    main()
