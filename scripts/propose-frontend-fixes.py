#!/usr/bin/env python3
"""
Junior AI: Propose initial frontend fixes
This script analyzes frontend build/test errors and proposes initial fixes
"""

import sys
import json
import os
import requests

def analyze_frontend_errors(error_log_path):
    """Analyze frontend errors and propose initial fixes"""
    
    if not os.path.exists(error_log_path):
        print(f"❌ Error log file not found: {error_log_path}", file=sys.stderr)
        return None
        
    with open(error_log_path, 'r', encoding='utf-8') as f:
        error_content = f.read()
    
    if not error_content.strip():
        print("❌ Error log is empty", file=sys.stderr)
        return None
    
    # Get OpenAI API key
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable not set", file=sys.stderr)
        return None
    
    # Junior AI prompt - more aggressive, less cautious
    prompt = f"""You are a JUNIOR frontend developer AI assistant. Your job is to quickly propose initial fixes for TypeScript/React/Vite build errors.

FRONTEND BUILD/TEST ERRORS:
```
{error_content}
```

As a JUNIOR AI, you should:
1. 🚀 Propose fixes quickly without overthinking
2. 🔧 Focus on common TypeScript/React patterns  
3. 📦 Address import/export issues aggressively
4. 🎯 Fix type errors with practical solutions
5. ⚡ Don't worry too much about perfect architecture

Analyze these frontend errors and propose specific file changes. Be direct and action-oriented.

Return a JSON array with this structure:
```json
[
  {{
    "file": "ui/src/path/to/file.ts",
    "issue": "Brief description of the issue",
    "fix_type": "type_fix|import_fix|component_fix|config_fix",
    "changes": [
      {{
        "action": "replace|add|remove",
        "target": "specific code to find/replace",
        "replacement": "new code to use",
        "line_context": "surrounding code for context"
      }}
    ],
    "reasoning": "Why this fix should work"
  }}
]
```

Focus on the most critical errors first. Be bold with your suggestions!"""

    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-4o-mini',  # Junior AI uses the smaller, faster model
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are a junior frontend developer AI. Be quick, direct, and action-oriented in proposing fixes.'
                    },
                    {
                        'role': 'user', 
                        'content': prompt
                    }
                ],
                'temperature': 0.7,  # Slightly higher temperature for creativity
                'max_tokens': 4000
            },
            timeout=60
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
            fixes = json.loads(json_content)
            return fixes
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON response: {e}", file=sys.stderr)
            print(f"Raw response: {content}", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"❌ Error calling OpenAI API: {e}", file=sys.stderr)
        return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python propose-frontend-fixes.py <error_log_path>", file=sys.stderr)
        sys.exit(1)
    
    error_log_path = sys.argv[1]
    
    print("🤖 Junior AI analyzing frontend errors...", file=sys.stderr)
    
    fixes = analyze_frontend_errors(error_log_path)
    
    if fixes:
        print("✅ Junior AI proposed fixes successfully", file=sys.stderr)
        print(json.dumps(fixes, indent=2))
    else:
        print("❌ Junior AI failed to propose fixes", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
