#!/usr/bin/env python3
"""
Batch Fetch Places for Kodaikanal
==================================
Runs the pipeline for multiple places sequentially.
"""

import time
import sys
from fetch_place_data import fetch_place_data, load_master_json

# Places to fetch (excluding already fetched and removed ones)
PLACES_TO_FETCH = [
    # Already in DB: "Bryant Park", "Pine Forest"
    # Removed: "Kodaikanal Hill Station", "Great Trails by GRT Hotels", "Coakers Walk View Point"
    
    "Guna Cave",
    "Moir Point",
    "Green Valley Viewpoint",
    "Liril Falls",
    "Upper Lake View",
    "Coakers Walk",
    "Kodaikanal Lake",
    "Kurinji Andavar Temple",
    "Dolphin Nose",
    "Silver Cascade Falls",
    "Kumbakkarai Falls",
    "Chettiar Park",
    "Kodaikanal Solar Observatory Museum",
    "Mannavanur Lake",
    "Sacred Heart College Museum",
    "Fairy Falls",
    "Natural History Museum",
    "7D Theater Kodaikanal",
    "Silent Valley View",
    "Government Rose Garden Kodaikanal",
    "Vattakanal Waterfalls",
    "Pillar Rock",
    "Kodai Jeep Safari",
    "Remas Resorts and Adventure Park",
    "Thalaiyar Waterfalls",
]

def batch_fetch():
    """Fetch all places in batch."""
    
    print("=" * 70)
    print("BATCH FETCHING KODAIKANAL PLACES")
    print("=" * 70)
    print(f"Total places to fetch: {len(PLACES_TO_FETCH)}")
    print("=" * 70)
    
    # Check what's already in DB
    master = load_master_json()
    existing_names = {p["name"].lower() for p in master.get("places", [])}
    
    success_count = 0
    failed = []
    
    for i, place_name in enumerate(PLACES_TO_FETCH, 1):
        print(f"\n[{i}/{len(PLACES_TO_FETCH)}] Processing: {place_name}")
        
        # Skip if already exists
        if place_name.lower() in existing_names:
            print(f"   ⏭️ Already in database, skipping...")
            continue
        
        try:
            result = fetch_place_data(place_name)
            print(f"   ✅ Success: {result['name']} (Rank #{result['stats']['popularity_rank']})")
            success_count += 1
            
            # Small delay to avoid rate limiting
            time.sleep(2)
            
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            failed.append((place_name, str(e)))
    
    print("\n" + "=" * 70)
    print("BATCH COMPLETE")
    print("=" * 70)
    print(f"✅ Successfully fetched: {success_count}")
    print(f"❌ Failed: {len(failed)}")
    
    if failed:
        print("\nFailed places:")
        for name, error in failed:
            print(f"  - {name}: {error}")
    
    # Show final count
    master = load_master_json()
    print(f"\n📊 Total places in database: {master['total_count']}")
    print("=" * 70)

if __name__ == "__main__":
    batch_fetch()
