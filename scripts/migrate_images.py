#!/usr/bin/env python3
"""
One-time migration: download images for all existing places in kodaikanal_places.json.
Sets the 'local_image' field in each place's content.

Usage: python3 scripts/migrate_images.py
"""

import json
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
PLACES_FILE = PROJECT_DIR / 'data' / 'kodaikanal_places.json'
IMAGES_DIR = PROJECT_DIR / 'data' / 'images'


def download_image(place_slug: str, photo_reference: str, api_key: str) -> str | None:
    """Download image from Google Maps and save locally."""
    image_path = IMAGES_DIR / f"{place_slug}.jpg"

    # Skip if already downloaded
    if image_path.exists() and image_path.stat().st_size > 0:
        return f"images/{place_slug}.jpg"

    url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo_reference}&key={api_key}"

    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200 and 'image' in resp.headers.get('Content-Type', ''):
            with open(image_path, 'wb') as f:
                f.write(resp.content)
            return f"images/{place_slug}.jpg"
        else:
            return None
    except Exception as e:
        print(f"    Error: {e}")
        return None


def main():
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not api_key:
        print("❌ GOOGLE_MAPS_API_KEY not set in .env")
        return

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    with open(PLACES_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    places = data.get('places', [])
    downloaded = 0
    skipped = 0
    failed = 0

    print(f"📸 Downloading images for {len(places)} places...\n")

    for place in places:
        name = place.get('name', '?')
        slug = place.get('id', '')
        photo_ref = place.get('content', {}).get('photo_reference')

        # Already has local image on disk?
        if place.get('content', {}).get('local_image'):
            img_file = IMAGES_DIR / f"{slug}.jpg"
            if img_file.exists() and img_file.stat().st_size > 0:
                print(f"  ✔️  {name}: already has local image")
                skipped += 1
                continue

        if not photo_ref:
            print(f"  ⏭️  {name}: no photo_reference, skipping")
            skipped += 1
            continue

        local_path = download_image(slug, photo_ref, api_key)
        if local_path:
            place.setdefault('content', {})['local_image'] = local_path
            downloaded += 1
            size_kb = (IMAGES_DIR / f"{slug}.jpg").stat().st_size // 1024
            print(f"  ✅ {name}: saved ({size_kb}KB)")
        else:
            print(f"  ❌ {name}: download failed")
            failed += 1

    # Save updated JSON
    with open(PLACES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Total size
    total_size = sum(f.stat().st_size for f in IMAGES_DIR.iterdir() if f.is_file()) // 1024
    print(f"\n{'='*50}")
    print(f"✅ Done! {downloaded} downloaded, {skipped} skipped, {failed} failed")
    print(f"   Total image size: {total_size}KB ({total_size // 1024}MB)")
    print(f"{'='*50}")


if __name__ == '__main__':
    main()
