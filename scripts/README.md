# Junior AI Setup Guide

## Quick Start

### Option 1: Basic Setup (Recommended)
```bash
cd scripts
pip install -r requirements.txt
```
This gives you:
- ✅ Web scraping (BeautifulSoup)
- ✅ Browser automation (Playwright)  
- ✅ Text-based search
- ✅ Dynamic tool creation
- ✅ Friend AI collaboration
- ❌ No semantic search (falls back to text search)

### Option 2: Full Setup with Semantic Search
```bash
cd scripts
python setup.py
```
Interactive setup that asks if you want semantic search (~100MB extra).

### Option 3: Manual Full Setup
```bash
cd scripts
# Install CPU-only PyTorch first
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install ML libraries
pip install sentence-transformers scikit-learn

# Install core dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install
```

## What You Get

### Core Features (Always Available)
- 📁 `list_directory` - Explore project structure
- 📖 `read_file` - Read and analyze code  
- 🔍 `search_files` - Text-based pattern matching
- 🌐 `fetch_webpage` - Web scraping with BeautifulSoup
- 🎭 `create_playwright_automation` - Generate browser automation scripts
- 🛠️ `create_dynamic_tool` - Build custom MCP tools on demand
- 📦 Sandbox testing environment
- 🤝 Friend AI collaboration via A2A protocol

### Optional Features (With ML Dependencies)
- 🧠 `semantic_search` - SBERT-powered code similarity search

## Usage

```bash
python propose-changes.py test-error.log
```

The system automatically detects what dependencies are available and adapts accordingly!

## Dependencies Breakdown

| Component | Size | Required | Purpose |
|-----------|------|----------|---------|
| requests | ~1MB | ✅ Required | API calls |
| beautifulsoup4 | ~1MB | ✅ Required | Web scraping |
| playwright | ~50MB | ✅ Required | Browser automation |
| python-dotenv | <1MB | ✅ Required | Environment variables |
| **torch (CPU)** | ~100MB | ❌ Optional | ML backend for semantic search |
| **sentence-transformers** | ~50MB | ❌ Optional | Code embedding models |
| **scikit-learn** | ~30MB | ❌ Optional | ML utilities |

**Total Required:** ~52MB  
**Total with Semantic Search:** ~232MB

## Troubleshooting

### "SBERT dependencies not available"
This is normal if you chose basic setup. The system uses regular text search instead.

### Playwright browser install fails
Run manually: `playwright install`

### Import errors
Make sure you're in the `scripts/` directory when running commands.
