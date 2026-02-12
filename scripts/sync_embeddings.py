"""
Sync Embeddings - Offline Builder Script
==========================================
Generates Gemini embeddings for all places in kodaikanal_places.json
and caches them to data/place_embeddings.json.

Only processes NEW places not already in the cache (diff check).

Usage:
    python scripts/sync_embeddings.py             # Generate missing embeddings
    python scripts/sync_embeddings.py --dry-run    # Preview only, no API calls
    python scripts/sync_embeddings.py --status     # Show cache status
"""

import os
import sys
import json
import time
import argparse
from dotenv import load_dotenv

# Ensure project root is on path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from google import genai

# --- Configuration ---
PLACES_PATH = os.path.join(PROJECT_ROOT, 'data', 'kodaikanal_places.json')
EMBEDDINGS_PATH = os.path.join(PROJECT_ROOT, 'data', 'place_embeddings.json')
EMBEDDING_MODEL = "gemini-embedding-001"


def load_places():
    """Load the master places list."""
    if not os.path.exists(PLACES_PATH):
        print(f"❌ Places file not found: {PLACES_PATH}")
        sys.exit(1)
    
    with open(PLACES_PATH, 'r') as f:
        data = json.load(f)
    return data.get('places', [])


def load_cache():
    """Load existing embeddings cache."""
    if os.path.exists(EMBEDDINGS_PATH):
        with open(EMBEDDINGS_PATH, 'r') as f:
            return json.load(f)
    return {}


def get_api_key():
    """Get Gemini API key from environment, trying multiple names."""
    load_dotenv(os.path.join(PROJECT_ROOT, '.env'))
    
    for key_name in ['GEMINI_API_KEY', 'GEMINI_API_KEY_CAPSTONE_1', 'GEMINI_API_KEY_NextLeap']:
        key = os.getenv(key_name)
        if key and not key.startswith('your_'):
            return key
    
    # Check for GCP Application Default Credentials
    if os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
        print("  ℹ️  Using GOOGLE_APPLICATION_CREDENTIALS")
        return None  # genai can use ADC
    
    return None


def show_status():
    """Show current cache status."""
    places = load_places()
    cache = load_cache()
    
    place_ids = {p.get('id') for p in places if p.get('id')}
    cached_ids = set(cache.keys())
    
    missing = place_ids - cached_ids
    stale = cached_ids - place_ids
    
    print(f"\n📊 Embedding Cache Status")
    print(f"{'='*50}")
    print(f"  Places in master list:  {len(place_ids)}")
    print(f"  Embeddings in cache:    {len(cached_ids)}")
    print(f"  ✅ Covered:             {len(place_ids & cached_ids)}")
    
    if missing:
        print(f"  ⚠️  Missing:             {len(missing)}")
        for pid in sorted(missing):
            name = next((p['name'] for p in places if p.get('id') == pid), pid)
            print(f"      - {name}")
    else:
        print(f"  ✅ All places have embeddings!")
    
    if stale:
        print(f"  🗑️  Stale (not in master): {len(stale)}")
    
    print(f"\n  Cache file: {EMBEDDINGS_PATH}")
    if os.path.exists(EMBEDDINGS_PATH):
        size_kb = os.path.getsize(EMBEDDINGS_PATH) / 1024
        print(f"  Cache size: {size_kb:.1f} KB")
    print()


def main():
    parser = argparse.ArgumentParser(description='Sync Gemini embeddings for places')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without making API calls')
    parser.add_argument('--status', action='store_true', help='Show cache status and exit')
    args = parser.parse_args()

    # Status mode
    if args.status:
        show_status()
        return

    # 1. Setup
    api_key = get_api_key()
    if not api_key and not os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
        print("❌ No API key found. Set GEMINI_API_KEY in .env or use GOOGLE_APPLICATION_CREDENTIALS")
        sys.exit(1)
    
    if api_key:
        client = genai.Client(api_key=api_key)
    else:
        client = genai.Client()  # Uses ADC
    
    print(f"✅ Gemini API configured")

    # 2. Load Source & Target
    places = load_places()
    cache = load_cache()
    
    print(f"📍 Loaded {len(places)} places from {os.path.basename(PLACES_PATH)}")
    print(f"📦 Existing cache: {len(cache)} embeddings")

    # 3. Diff Check & Generate
    new_count = 0
    skip_count = 0
    error_count = 0
    
    new_places = []
    for place in places:
        place_id = place.get('id')
        name = place.get('name', 'Unknown')
        
        if not place_id:
            print(f"  ⚠️ Skipping place with no ID: {name}")
            continue
        
        if place_id in cache:
            skip_count += 1
            continue
        
        new_places.append(place)
    
    if not new_places:
        print(f"\n✅ All {skip_count} places already have embeddings. Nothing to do.")
        show_status()
        return
    
    print(f"\n{'='*50}")
    print(f"  {len(new_places)} new places need embeddings")
    print(f"  {skip_count} places already cached")
    print(f"{'='*50}")
    
    if args.dry_run:
        print(f"\n🏃 DRY RUN - would generate embeddings for:")
        for p in new_places:
            print(f"  [ ] {p.get('name', 'Unknown')}")
        print(f"\nRun without --dry-run to generate.")
        return

    # Generate embeddings
    for place in new_places:
        place_id = place.get('id')
        name = place.get('name', 'Unknown')
        
        content = place.get('content', {})
        description = content.get('short_summary', '')
        tags = ', '.join(content.get('tags', []))
        text = f"{name} - {description} Tags: {tags}"

        try:
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config={"task_type": "RETRIEVAL_DOCUMENT"}
            )
            
            cache[place_id] = result.embeddings[0].values
            new_count += 1
            print(f"  [+] Generated embedding for: {name}")
            
            time.sleep(1)
            
        except Exception as e:
            error_count += 1
            print(f"  ❌ Error embedding {name}: {e}")
            continue

    # 4. Save
    with open(EMBEDDINGS_PATH, 'w') as f:
        json.dump(cache, f)
    
    # 5. Summary
    print(f"\n{'='*50}")
    print(f"✅ Sync complete!")
    print(f"   New:     {new_count}")
    print(f"   Skipped: {skip_count}")
    print(f"   Errors:  {error_count}")
    print(f"   Total:   {len(cache)} embeddings in cache")
    print(f"   Saved:   {EMBEDDINGS_PATH}")
    
    if error_count > 0:
        print(f"\n   ⚠️  {error_count} places failed. Re-run to retry.")


if __name__ == '__main__':
    main()
