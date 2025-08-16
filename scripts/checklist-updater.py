#!/usr/bin/env python3
"""
Checklist Updater: Update checklist files with implementation status
"""

import argparse
import json
import re
import sys
from pathlib import Path

def update_checklist_with_implementation(checklist_file, implemented_items, application_result):
    """Update checklist items to mark them as implemented"""
    try:
        with open(checklist_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        updated_lines = []
        changes_made = False
        
        for line_num, line in enumerate(lines, 1):
            original_line = line
            
            # Check if this line matches any implemented item
            for item in implemented_items:
                if item['file'] == checklist_file and item['line'] == line_num:
                    # Update the line to mark as implemented
                    if '- [ ]' in line:
                        line = line.replace('- [ ]', '- [x]')
                        changes_made = True
                    
                    # Add implementation reference if not already present
                    if '[implemented:' not in line:
                        line = line.rstrip() + f' [implemented: AI-{item["priority"]}]\n'
                        changes_made = True
                    break
            
            updated_lines.append(line)
        
        if changes_made:
            with open(checklist_file, 'w', encoding='utf-8') as f:
                f.writelines(updated_lines)
            print(f'✅ Updated checklist: {checklist_file}', file=sys.stderr)
        
        return changes_made
        
    except Exception as e:
        print(f'❌ Error updating {checklist_file}: {e}', file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description='Update checklists with implementation status')
    parser.add_argument('--targets', required=True, help='Implementation targets JSON file')
    parser.add_argument('--results', required=True, help='Application results JSON file')
    parser.add_argument('--action', default='mark-implemented', help='Action to perform')
    
    args = parser.parse_args()
    
    try:
        with open(args.targets, 'r') as f:
            targets_data = json.load(f)
        
        with open(args.results, 'r') as f:
            results_data = json.load(f)
    except Exception as e:
        print(f'❌ Error reading input files: {e}', file=sys.stderr)
        sys.exit(1)
    
    targets = targets_data.get('targets', [])
    
    if results_data.get('success', False) and results_data.get('changes_applied', 0) > 0:
        # Mark implemented items in checklists
        checklist_files = set(target['file'] for target in targets)
        
        updated_count = 0
        for checklist_file in checklist_files:
            checklist_targets = [t for t in targets if t['file'] == checklist_file]
            if update_checklist_with_implementation(checklist_file, checklist_targets, results_data):
                updated_count += 1
        
        print(f'📊 Implementation Summary:', file=sys.stderr)
        print(f'  - Changes applied: {results_data.get("changes_applied", 0)}', file=sys.stderr)
        print(f'  - Component type: {results_data.get("component_type", "unknown")}', file=sys.stderr)
        print(f'  - Checklists updated: {updated_count}', file=sys.stderr)
        print(f'  - Success: {results_data.get("success", False)}', file=sys.stderr)
    else:
        print('ℹ️ No successful implementations to mark in checklists', file=sys.stderr)

if __name__ == "__main__":
    main()
