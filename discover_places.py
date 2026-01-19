#!/usr/bin/env python3
"""
Discover Top Places in Kodaikanal
==================================
Fetches popular tourist spots from Google Maps API and ranks them by review count.
"""

import os
import json
from dotenv import load_dotenv
import googlemaps

load_dotenv()

# Kodaikanal center coordinates
KODAIKANAL_CENTER = (10.232, 77.489)

# Search radius in meters (50km = 50000m)
SEARCH_RADIUS = 50000

# Place types to search for tourist attractions
PLACE_TYPES = [
    "tourist_attraction",
    "park", 
    "point_of_interest",
    "natural_feature",
]

def discover_places():
    """Find top places around Kodaikanal sorted by review count."""
    
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_MAPS_API_KEY not set")
    
    gmaps = googlemaps.Client(key=api_key)
    
    all_places = {}
    
    print("=" * 70)
    print("DISCOVERING TOP PLACES IN KODAIKANAL")
    print("=" * 70)
    print(f"Search center: {KODAIKANAL_CENTER}")
    print(f"Search radius: {SEARCH_RADIUS/1000} km")
    print("=" * 70)
    
    # Search with different keywords to get variety
    keywords = [
        "museum in Kodaikanal",
        "adventure sports Kodaikanal",
        "trekking Kodaikanal",
        "boating Kodaikanal",
        "shopping Kodaikanal",
        "hidden gems Kodaikanal",
        "nature park Kodaikanal",
        "waterfall Kodaikanal",
    ]
    
    for keyword in keywords:
        print(f"\n🔍 Searching: {keyword}")
        
        try:
            # Text search for the keyword
            results = gmaps.places(
                query=keyword,
                location=KODAIKANAL_CENTER,
                radius=SEARCH_RADIUS
            )
            
            places = results.get("results", [])
            print(f"   Found {len(places)} places")
            
            for place in places:
                place_id = place.get("place_id")
                if place_id and place_id not in all_places:
                    all_places[place_id] = {
                        "name": place.get("name"),
                        "place_id": place_id,
                        "rating": place.get("rating"),
                        "user_ratings_total": place.get("user_ratings_total", 0),
                        "types": place.get("types", []),
                        "address": place.get("formatted_address", place.get("vicinity", "")),
                        "lat": place.get("geometry", {}).get("location", {}).get("lat"),
                        "lng": place.get("geometry", {}).get("location", {}).get("lng"),
                    }
            
            # Handle pagination if available
            while results.get("next_page_token"):
                import time
                time.sleep(2)  # Required delay for next_page_token
                results = gmaps.places(
                    query=keyword,
                    page_token=results["next_page_token"]
                )
                for place in results.get("results", []):
                    place_id = place.get("place_id")
                    if place_id and place_id not in all_places:
                        all_places[place_id] = {
                            "name": place.get("name"),
                            "place_id": place_id,
                            "rating": place.get("rating"),
                            "user_ratings_total": place.get("user_ratings_total", 0),
                            "types": place.get("types", []),
                            "address": place.get("formatted_address", place.get("vicinity", "")),
                            "lat": place.get("geometry", {}).get("location", {}).get("lat"),
                            "lng": place.get("geometry", {}).get("location", {}).get("lng"),
                        }
                        
        except Exception as e:
            print(f"   Error: {e}")
    
    # Sort by review count (descending)
    sorted_places = sorted(
        all_places.values(),
        key=lambda x: x.get("user_ratings_total", 0),
        reverse=True
    )
    
    # Take top 30
    top_places = sorted_places[:30]
    
    print("\n" + "=" * 70)
    print("TOP 30 PLACES BY REVIEW COUNT")
    print("=" * 70)
    print(f"{'Rank':<5} {'Name':<40} {'Rating':<8} {'Reviews':<10}")
    print("-" * 70)
    
    for i, place in enumerate(top_places, 1):
        name = place['name'][:38] if len(place['name']) > 38 else place['name']
        rating = place.get('rating', 'N/A')
        reviews = place.get('user_ratings_total', 0)
        print(f"{i:<5} {name:<40} {rating:<8} {reviews:<10,}")
    
    print("=" * 70)
    print(f"\nTotal unique places found: {len(all_places)}")
    print(f"Top 30 shown above")
    
    # Save to file for later use
    output_file = "data/discovered_places.json"
    os.makedirs("data", exist_ok=True)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "total_found": len(all_places),
            "top_30": top_places,
            "all_places": sorted_places
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n📁 Full results saved to: {output_file}")
    
    return top_places

if __name__ == "__main__":
    discover_places()
