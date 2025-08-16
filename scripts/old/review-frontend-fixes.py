#!/usr/bin/env python3
"""
Senior AI: Review and refine frontend fixes
This script reviews junior AI proposals and provides refined, production-ready fixes
"""

import sys
import json
import os
import requests

def review_frontend_fixes(proposed_fixes_path, error_log_path):
    """Review junior AI fixes and provide refined solutions"""
    
    if not os.path.exists(proposed_fixes_path):
        print(f"❌ Proposed fixes file not found: {proposed_fixes_path}", file=sys.stderr)
        return None
        
    if not os.path.exists(error_log_path):
        print(f"❌ Error log file not found: {error_log_path}", file=sys.stderr)
        return None
    
    with open(proposed_fixes_path, 'r', encoding='utf-8') as f:
        proposed_fixes = json.load(f)
        
    with open(error_log_path, 'r', encoding='utf-8') as f:
        error_content = f.read()
    
    # Get OpenAI API key
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable not set", file=sys.stderr)
        return None
    
    # Senior AI prompt - more thorough and architectural
    prompt = f"""You are a SENIOR frontend architect AI. Your job is to review and refine fixes proposed by a junior AI for TypeScript/React/Vite build errors.

ORIGINAL FRONTEND ERRORS:
```
{error_content}
```

JUNIOR AI PROPOSED FIXES:
```json
{json.dumps(proposed_fixes, indent=2)}
```

As a SENIOR AI, you should:
1. 🔍 Carefully review each proposed fix for correctness
2. 🏗️ Ensure fixes follow TypeScript/React best practices
3. 🔗 Check for potential side effects and dependencies
4. 🎯 Optimize solutions for maintainability
5. ⚠️ Flag any dangerous or problematic suggestions
6. 🔄 Provide alternative approaches when needed
7. 📋 Ensure fixes are complete and won't break other code

Review the junior AI's proposals and provide refined, production-ready fixes.

Return a JSON object with this structure:
```json
{{
  "approved_fixes": [
    {{
      "file": "ui/src/path/to/file.ts",
      "issue": "Refined description of the issue",
      "fix_type": "type_fix|import_fix|component_fix|config_fix",
      "changes": [
        {{
          "action": "replace|add|remove",
          "target": "specific code to find/replace",
          "replacement": "refined code to use", 
          "line_context": "surrounding code for context"
        }}
      ],
      "reasoning": "Senior AI reasoning for this approach",
      "junior_review": "What was good/problematic about junior's proposal"
    }}
  ],
  "rejected_fixes": [
    {{
      "original_fix": {{...}},
      "rejection_reason": "Why this fix was rejected",
      "alternative_approach": "Suggested alternative if any"
    }}
  ],
  "additional_fixes": [
    {{
      "file": "ui/src/path/to/file.ts", 
      "issue": "Additional issue found during review",
      "fix_type": "type_fix|import_fix|component_fix|config_fix",
      "changes": [...],
      "reasoning": "Why this additional fix is needed"
    }}
  ],
  "review_summary": "Overall assessment of junior AI's work and refinements made"
}}
```

Be thorough but practical. Focus on fixes that will actually solve the build errors."""

    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-5',  # Senior AI uses the more capable model
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are a senior frontend architect AI. Be thorough, careful, and focus on production-ready solutions.'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                'temperature': 0.3,  # Lower temperature for more conservative approach
                'max_tokens': 6000
            },
            timeout=120
        )
        
        if response.status_code != 200:
            print(f"❌ OpenAI API error: {response.status_code} - {response.text}", file=sys.stderr)
            return None
            
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Extract JSON from the response
        if '```json' in content:
            json_start = content.find('```json') + 7
            json_end = content.find('```', json_start)
            json_content = content[json_start:json_end].strip()
        else:
            json_content = content.strip()
        
        try:
            reviewed_fixes = json.loads(json_content)
            return reviewed_fixes
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON response: {e}", file=sys.stderr)
            print(f"Raw response: {content}", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"❌ Error calling OpenAI API: {e}", file=sys.stderr)
        return None

def main():
    if len(sys.argv) != 3:
        print("Usage: python review-frontend-fixes.py <proposed_fixes_path> <error_log_path>", file=sys.stderr)
        sys.exit(1)
    
    proposed_fixes_path = sys.argv[1]
    error_log_path = sys.argv[2]
    
    print("🧠 Senior AI reviewing frontend fixes...", file=sys.stderr)
    
    reviewed_fixes = review_frontend_fixes(proposed_fixes_path, error_log_path)
    
    if reviewed_fixes:
        print("✅ Senior AI review completed successfully", file=sys.stderr)
        if reviewed_fixes.get('rejected_fixes'):
            print(f"⚠️ Rejected {len(reviewed_fixes['rejected_fixes'])} junior AI proposals", file=sys.stderr)
        if reviewed_fixes.get('additional_fixes'):
            print(f"🔧 Added {len(reviewed_fixes['additional_fixes'])} additional fixes", file=sys.stderr)
        print(json.dumps(reviewed_fixes, indent=2))
    else:
        print("❌ Senior AI review failed", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
