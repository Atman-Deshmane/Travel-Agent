#!/usr/bin/env python3
"""
Refresh photo_reference for all places in kodaikanal_places.json.
Uses each place's google_place_id to fetch a fresh photo_reference from Google Maps API.
"""

import json
import os
import googlemaps
from dotenv import load_dotenv

load_dotenv()

PLACES_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'kodaikanal_places.json')

def main():
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not api_key:
        print("❌ GOOGLE_MAPS_API_KEY not set")
        return

    gmaps = googlemaps.Client(key=api_key)

    with open(PLACES_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    places = data.get('places', [])
    updated = 0
    failed = 0

    for place in places:
        name = place.get('name', '?')
        place_id = place.get('google_place_id')

        if not place_id:
            print(f"  ⏭️  {name}: no google_place_id, skipping")
            continue

        try:
            details = gmaps.place(place_id=place_id, fields=['photo'])
            result = details.get('result', {})
            photos = result.get('photos', [])

            if photos:
                new_ref = photos[0].get('photo_reference')
                old_ref = place.get('content', {}).get('photo_reference')

                if new_ref and new_ref != old_ref:
                    place.setdefault('content', {})['photo_reference'] = new_ref
                    updated += 1
                    print(f"  ✅ {name}: photo_reference refreshed")
                elif new_ref:
                    print(f"  ✔️  {name}: photo_reference unchanged")
                else:
                    print(f"  ⚠️  {name}: no photo_reference in response")
            else:
                print(f"  ⚠️  {name}: no photos available")

        except Exception as e:
            print(f"  ❌ {name}: error - {e}")
            failed += 1

    # Save updated data
    with open(PLACES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"✅ Done! {updated} updated, {failed} failed, {len(places)} total")
    print(f"{'='*50}")

if __name__ == '__main__':
    main()
