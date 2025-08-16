#!/usr/bin/env python3
"""
Simple setup script for Junior AI dependencies
"""

import subprocess
import sys
import os

def run_command(cmd):
    """Run a command and return success status"""
    try:
        print(f"🔧 Running: {cmd}")
        subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print("✅ Success!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def main():
    print("🚀 Junior AI Dependency Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("requirements.txt"):
        print("❌ Please run this from the scripts/ directory")
        sys.exit(1)
    
    print("\n📦 Installing CORE dependencies (required)...")
    if not run_command("pip install requests python-dotenv beautifulsoup4 playwright"):
        print("❌ Failed to install core dependencies")
        sys.exit(1)
    
    print("\n🎭 Installing Playwright browsers...")
    if not run_command("playwright install"):
        print("⚠️ Playwright browser install failed, but continuing...")
    
    print("\n🤔 Do you want semantic search? (requires ~100MB download)")
    print("   y = Yes, install CPU-only PyTorch + sentence-transformers")
    print("   n = No, use basic text search only")
    
    choice = input("Choice [y/n]: ").lower().strip()
    
    if choice == 'y':
        print("\n🧠 Installing semantic search dependencies (CPU-only)...")
        
        # Install CPU-only PyTorch first
        print("📦 Installing CPU-only PyTorch...")
        if not run_command("pip install torch --index-url https://download.pytorch.org/whl/cpu"):
            print("❌ Failed to install PyTorch CPU")
            sys.exit(1)
        
        # Install sentence transformers and scikit-learn
        print("📦 Installing sentence-transformers and scikit-learn...")
        if not run_command("pip install sentence-transformers scikit-learn"):
            print("❌ Failed to install ML libraries")
            sys.exit(1)
            
        print("✅ Semantic search enabled!")
    else:
        print("📝 Semantic search skipped - using basic text search only")
    
    print("\n🎉 Setup complete!")
    print("\n🧪 Test the system with:")
    print("   python propose-changes.py test-error.log")
    print("\n💡 The system will gracefully handle missing dependencies")

if __name__ == "__main__":
    main()
