#!/usr/bin/env python3
"""
Count Targets: Simple utility to count implementation targets
"""

import json
import sys

def main():
    if len(sys.argv) != 2:
        print("0")
        return
    
    try:
        with open(sys.argv[1], 'r') as f:
            data = json.load(f)
        print(len(data.get('targets', [])))
    except:
        print("0")

if __name__ == "__main__":
    main()
