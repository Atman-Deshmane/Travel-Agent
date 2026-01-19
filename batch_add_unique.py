#!/usr/bin/env python3
"""
Batch Fetch Additional Unique Places
==================================
Running pipeline for specific category additions.
"""

import time
from fetch_place_data import fetch_place_data, load_master_json

PLACES_TO_ADD = [
    "Poombarai View Point",
    "Pampadum Shola National Park",
    "Wax Museum Kodaikanal",
    "La Saleth Church Kodaikanal",
    "Perumal Peak",
    "Berijam Lake",
    "Kukkal Caves",
    "Dolmen Circle",
    "Kodaikanal Boating Club",
    "Sarts Gallery",
]

def batch_add_unique():
    print("=" * 70)
    print("ADDING UNIQUE CATEGORY PLACES")
    print("=" * 70)
    
    master = load_master_json()
    existing_names = {p["name"].lower() for p in master.get("places", [])}
    
    for place_name in PLACES_TO_ADD:
        if place_name.lower() in existing_names:
            print(f"Skipping {place_name} (Already exists)")
            continue
            
        print(f"\nProcessing: {place_name}")
        try:
            fetch_place_data(place_name)
            print(f"✅ Added {place_name}")
            time.sleep(2)
        except Exception as e:
            print(f"❌ Failed {place_name}: {e}")

if __name__ == "__main__":
    batch_add_unique()
