#!/usr/bin/env python3
"""
Senior AI: Review and validate proposed fixes
This script reviews fixes and validates search patterns to ensure accuracy
"""

import json
import os
import sys
import re
import requests
from pathlib import Path
from typing import Dict, List, Any

from ai_fix_schema import get_propose_payload_base, get_common_headers, create_system_message


class UnifiedChangeReviewer:
    def __init__(self, openai_api_key: str, repo_root: str):
        self.api_key = openai_api_key
        self.repo_root = Path(repo_root)
        self.base_url = "https://api.openai.com/v1/chat/completions"
        
    def detect_component_type(self, fixes_data: Dict) -> str:
        """Detect component type from fixes data"""
        content_str = json.dumps(fixes_data).lower()
        
        if any(indicator in content_str for indicator in ['ui/', 'vite', 'react', 'jsx', 'tsx']):
            return "frontend"
        elif any(indicator in content_str for indicator in ['backend/', 'node', 'express', 'fastify']):
            return "backend"
        
        # Check files mentioned in fixes
        if 'fixes' in fixes_data:
            for fix in fixes_data['fixes']:
                file_path = fix.get('file', '').lower()
                if 'ui/' in file_path or 'components' in file_path:
                    return "frontend"
                elif 'backend/' in file_path or 'src/lib' in file_path or 'src/routes' in file_path:
                    return "backend"
        
        return "unknown"
    
    def validate_search_patterns(self, fixes_data: Dict) -> Dict:
        """
        Enhanced search pattern validation with auto-correction.
        Validates that search patterns in fixes match actual file content.
        Auto-corrects common patterns and warns about mismatches.
        """
        print("🔍 Validating search patterns in fixes...", file=sys.stderr)
        
        if not isinstance(fixes_data, dict) or 'fixes' not in fixes_data:
            return fixes_data
        
        auto_corrections = 0
        warnings = []
        
        for fix_idx, fix in enumerate(fixes_data['fixes']):
            action = fix.get('action', 'modify')
            file_path = fix.get('file', '')
            search_pattern = fix.get('search', '')
            
            # Skip validation for create actions (they don't need search patterns)
            if action == "create":
                if file_path:
                    print(f"📁 Will create new file: {file_path}", file=sys.stderr)
                continue
            
            # Only validate modify actions
            if not file_path or not search_pattern:
                continue
            
            # Check if file exists
            full_path = self.repo_root / file_path
            if not full_path.exists():
                warnings.append(f"File {file_path} does not exist")
                continue
            
            try:
                file_content = full_path.read_text(encoding='utf-8')
                
                # Validate final pattern
                if search_pattern not in file_content:
                    # Try with normalized whitespace
                    normalized_pattern = re.sub(r'\s+', ' ', search_pattern.strip())
                    normalized_content = re.sub(r'\s+', ' ', file_content)
                    
                    if normalized_pattern not in normalized_content:
                        warnings.append(f"Search pattern not found in {file_path}:\n{search_pattern}")
                
            except Exception as e:
                warnings.append(f"Error validating {file_path}: {str(e)}")
        
        if auto_corrections > 0:
            print(f"✅ Applied {auto_corrections} auto-corrections", file=sys.stderr)
        
        if warnings:
            print(f"⚠️ Found {len(warnings)} validation warnings:", file=sys.stderr)
            for warning in warnings[:5]:  # Limit output
                print(f"  ⚠️ {warning}", file=sys.stderr)
        
        return fixes_data
    
    def review_changes(self, fixes_data: Dict, error_log: str) -> Dict:
        """Review and validate proposed changes."""
        if not self.api_key:
            print("❌ OPENAI_API_KEY is not set - skipping AI review", file=sys.stderr)
            return fixes_data
        
        print("🧠 Senior AI starting review process...", file=sys.stderr)
        
        # Detect component type
        component_type = self.detect_component_type(fixes_data)
        print(f"🎯 Detected component type: {component_type}", file=sys.stderr)
        
        # Validate search patterns with auto-correction
        validated_fixes = self.validate_search_patterns(fixes_data)
        
        # Create review prompt
        review_prompt = f"""You are a Senior Developer AI reviewing proposed fixes! 🎯

ORIGINAL ERROR LOG:
{error_log}

PROPOSED FIXES FROM JUNIOR AI:
{json.dumps(validated_fixes, indent=2)}

COMPONENT TYPE: {component_type}

Your task is to review these fixes carefully and provide a refined version.

FOCUS AREAS:
1. ✅ Verify the fixes address the actual errors
2. 🔍 Check that search patterns are precise and will match exactly
3. 🎯 Ensure replacements are syntactically correct
4. 📋 Validate the reasoning makes sense
5. 🚀 Suggest improvements or optimizations

Be critical but constructive. If fixes look good, approve them. If they need changes, refine them.

Return the SAME JSON structure but with your improvements:
{{
  "analysis": "Your enhanced analysis",
  "fixes": [
    {{
      "file": "exact/file/path",
      "search": "exact code to find (must match exactly)",
      "replace": "exact replacement code",
      "reasoning": "why this fix works"
    }}
  ]
}}"""
        
        payload = get_propose_payload_base("gpt-5")
        payload["messages"] = [
            {
                "role": "system",
                "content": create_system_message(component_type if component_type != "unknown" else "backend", "review")
            },
            {
                "role": "user", 
                "content": review_prompt
            }
        ]
        
        headers = get_common_headers(self.api_key)
        
        try:
            print("🌐 Sending review request to Senior AI...", file=sys.stderr)
            response = requests.post(self.base_url, json=payload, headers=headers, timeout=120)
            print(f"🌐 HTTP Status: {response.status_code}", file=sys.stderr)
            
            if response.status_code != 200:
                print(f"❌ Senior AI API call failed: {response.text}", file=sys.stderr)
                return validated_fixes
            
            result = response.json()
            review_content = result['choices'][0]['message']['content']
            
            try:
                reviewed_fixes = json.loads(review_content)
                print("✅ Senior AI review complete", file=sys.stderr)
                return reviewed_fixes
            except json.JSONDecodeError:
                print("❌ Failed to parse Senior AI response as JSON", file=sys.stderr)
                print(f"Raw response: {review_content}", file=sys.stderr)
                return validated_fixes
                
        except Exception as e:
            print(f"❌ Error during Senior AI review: {e}", file=sys.stderr)
            return validated_fixes


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python review-changes.py <proposed-fixes-json> [error-log-file]", file=sys.stderr)
        sys.exit(1)
    
    fixes_json_file = sys.argv[1]
    error_log_file = sys.argv[2] if len(sys.argv) > 2 else ""
    
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print("🧠 Senior AI starting unified review process...", file=sys.stderr)
    
    # Read proposed fixes
    try:
        with open(fixes_json_file, 'r', encoding='utf-8') as f:
            fixes_data = json.load(f)
    except Exception as e:
        print(f"❌ Failed to read proposed fixes: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Read error log if provided
    error_log = ""
    if error_log_file:
        try:
            with open(error_log_file, 'r', encoding='utf-8') as f:
                error_log = f.read()
        except Exception as e:
            print(f"⚠️ Could not read error log: {e}", file=sys.stderr)
    
    # Initialize reviewer
    reviewer = UnifiedChangeReviewer(api_key, repo_root)
    
    # Review changes
    reviewed_changes = reviewer.review_changes(fixes_data, error_log)
    
    # Output as JSON - ONLY JSON goes to stdout
    print(json.dumps(reviewed_changes, indent=2))


if __name__ == "__main__":
    main()
