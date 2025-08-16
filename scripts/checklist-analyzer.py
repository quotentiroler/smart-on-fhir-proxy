#!/usr/bin/env python3
"""
Checklist Analyzer: Analyze checklists for implementation opportunities
"""

import argparse
import json
import re
import sys
from pathlib import Path

def analyze_checklist_for_implementation(file_path, item_filter=None, force_implement=False):
    """Analyze checklist and identify items ready for AI implementation"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.split('\n')
        implementation_targets = []
        
        for line_num, line in enumerate(lines, 1):
            # Match checklist items
            match = re.match(r'^(\s*)-\s*\[([xX\s])\]\s*(.+)$', line.strip())
            if not match:
                continue
                
            checked_char = match.group(2)
            item_text = match.group(3).strip()
            is_complete = checked_char.lower() == 'x'
            
            # Apply item filter if provided
            if item_filter and not re.search(item_filter, item_text, re.IGNORECASE):
                continue
            
            # Determine if item is ready for implementation
            ready_for_implementation = False
            
            if force_implement:
                ready_for_implementation = True
            elif not is_complete:
                # Look for implementation-ready keywords
                impl_keywords = [
                    'endpoint', 'api', 'route', 'handler', 'middleware',
                    'component', 'interface', 'form', 'validation',
                    'authentication', 'authorization', 'oauth', 'token',
                    'database', 'model', 'schema', 'migration',
                    'test', 'unit test', 'integration test',
                    'configuration', 'settings', 'environment'
                ]
                
                if any(keyword in item_text.lower() for keyword in impl_keywords):
                    ready_for_implementation = True
            
            if ready_for_implementation:
                implementation_targets.append({
                    'file': file_path,
                    'line': line_num,
                    'text': item_text,
                    'complete': is_complete,
                    'priority': 'high' if not is_complete else 'medium'
                })
        
        return implementation_targets
        
    except Exception as e:
        print(f'Error analyzing {file_path}: {e}', file=sys.stderr)
        return []

def main():
    parser = argparse.ArgumentParser(description='Analyze checklists for implementation targets')
    parser.add_argument('--checklist-file', help='Specific checklist file to process')
    parser.add_argument('--item-filter', help='Filter for specific checklist items (regex pattern)')
    parser.add_argument('--force-implement', action='store_true', help='Force implementation even if items are marked complete')
    parser.add_argument('--output', default='implementation_targets.json', help='Output file path')
    
    args = parser.parse_args()
    
    # Find checklist files
    checklist_files = []
    if args.checklist_file and Path(args.checklist_file).exists():
        checklist_files = [args.checklist_file]
        print(f"📋 Using specified checklist: {args.checklist_file}", file=sys.stderr)
    else:
        # Find all CHECKLIST.md files
        for checklist_path in Path('.').rglob('CHECKLIST.md'):
            if 'node_modules' not in str(checklist_path) and '.git' not in str(checklist_path):
                checklist_files.append(str(checklist_path))
        print(f"📋 Found {len(checklist_files)} checklist files", file=sys.stderr)
    
    # Process all checklist files
    all_targets = []
    for checklist_file in checklist_files:
        targets = analyze_checklist_for_implementation(
            checklist_file, 
            args.item_filter, 
            args.force_implement
        )
        all_targets.extend(targets)
    
    # Sort by priority and save
    all_targets.sort(key=lambda x: (x['priority'] == 'medium', x['file'], x['line']))
    
    print(f'📊 Found {len(all_targets)} implementation targets', file=sys.stderr)
    for i, target in enumerate(all_targets[:10]):  # Show first 10
        status = '✅' if target['complete'] else '📋'
        print(f'  {i+1}. {status} {target["text"][:60]}...', file=sys.stderr)
    
    # Save results
    result = {
        'total_checklists': len(checklist_files),
        'targets': all_targets,
        'analysis': {
            'item_filter': args.item_filter,
            'force_implement': args.force_implement,
            'high_priority': len([t for t in all_targets if t['priority'] == 'high']),
            'medium_priority': len([t for t in all_targets if t['priority'] == 'medium'])
        }
    }
    
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f'✅ Analysis saved to {args.output}', file=sys.stderr)

if __name__ == "__main__":
    main()
