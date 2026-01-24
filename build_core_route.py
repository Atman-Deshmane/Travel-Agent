#!/usr/bin/env python3
"""
Core 25 Circular Route Generator
=================================
Creates a unified "Golden Loop" starting and ending at Kodaikanal Bus Stand.
Filters for top 25 most popular places in core zones and optimizes their order
using Google Maps Directions API.

Exclusions:
- Places in "Outskirts", "Village & Meadows", or "Poombarai" clusters
- "Jeep Safari" experience

Usage:
    python build_core_route.py
"""

import os
import json
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
import googlemaps

load_dotenv()

# Configuration
PLACES_PATH = 'data/kodaikanal_places.json'
OUTPUT_PATH = 'data/core_route.json'
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

# Clusters to exclude
EXCLUDED_CLUSTERS = {'Outskirts', 'Village & Meadows', 'Poombarai'}

# Specific places to exclude (partial match)
EXCLUDED_NAMES = ['Jeep Safari']

# Bus Stand name for anchor
BUS_STAND_NAME = 'Kodaikanal Bus Stand'
BUS_STAND_ID = 'kodaikanal-bus-stand-kodaikanal'

# Maximum waypoints for Google Maps (excluding origin/destination)
MAX_WAYPOINTS = 25


def load_places() -> List[Dict]:
    """Load places from JSON file."""
    with open(PLACES_PATH, 'r') as f:
        data = json.load(f)
    return data.get('places', [])


def filter_core_places(places: List[Dict]) -> List[Dict]:
    """
    Filter places to core zones only.
    Excludes Outskirts, Village & Meadows, Poombarai, and Jeep Safari.
    """
    filtered = []
    
    for place in places:
        cluster = place.get('location', {}).get('cluster_zone', '')
        name = place.get('name', '')
        
        # Skip excluded clusters
        if cluster in EXCLUDED_CLUSTERS:
            continue
        
        # Skip excluded names (partial match)
        if any(excluded in name for excluded in EXCLUDED_NAMES):
            print(f"  ⏭️ Excluding: {name} (experience, not location)")
            continue
        
        filtered.append(place)
    
    return filtered


def find_bus_stand(places: List[Dict]) -> Optional[Dict]:
    """Find the bus stand place by name or ID."""
    for place in places:
        if place.get('id') == BUS_STAND_ID or BUS_STAND_NAME.lower() in place.get('name', '').lower():
            return place
    return None


def select_top_places(places: List[Dict], bus_stand: Dict, limit: int = 25) -> List[Dict]:
    """
    Select top N places by popularity score.
    Ensures bus stand is in the list.
    """
    # Sort by popularity score (descending)
    sorted_places = sorted(
        places,
        key=lambda p: p.get('stats', {}).get('popularity_score', 0),
        reverse=True
    )
    
    # Check if bus stand is in top N
    top_n = sorted_places[:limit]
    bus_stand_in_top = any(p['id'] == bus_stand['id'] for p in top_n)
    
    if not bus_stand_in_top:
        # Add bus stand and remove last place
        top_n = top_n[:limit-1] + [bus_stand]
    
    return top_n


def build_core_route(places: List[Dict], bus_stand: Dict, gmaps_client) -> List[Dict]:
    """
    Build optimized circular route using Google Maps Directions API.
    
    Args:
        places: List of places (should include bus stand)
        bus_stand: The bus stand place (anchor)
        gmaps_client: Google Maps client
        
    Returns:
        Ordered list of places with travel times
    """
    print(f"\n🔄 Building Core Route ({len(places)} places)")
    print(f"  🚌 Anchor: {bus_stand['name']}")
    
    # Build waypoints (all places except bus stand)
    waypoints = []
    waypoint_places = []
    
    for place in places:
        if place['id'] != bus_stand['id']:
            waypoints.append(f"place_id:{place['google_place_id']}")
            waypoint_places.append(place)
    
    if len(waypoints) > 25:
        print(f"  ⚠️ Too many waypoints ({len(waypoints)}), limiting to 25")
        waypoints = waypoints[:25]
        waypoint_places = waypoint_places[:25]
    
    print(f"  📍 Waypoints: {len(waypoints)}")
    
    try:
        # Call Google Maps Directions API
        origin = f"place_id:{bus_stand['google_place_id']}"
        destination = origin  # Circular route
        
        print(f"  📡 Calling Directions API...")
        
        directions_result = gmaps_client.directions(
            origin=origin,
            destination=destination,
            waypoints=waypoints,
            optimize_waypoints=True,
            mode='driving'
        )
        
        if not directions_result:
            print(f"  ❌ No route found")
            return []
        
        route = directions_result[0]
        waypoint_order = route.get('waypoint_order', [])
        legs = route.get('legs', [])
        
        print(f"  ✅ Optimized order received: {len(waypoint_order)} waypoints")
        
        # Build result list
        result = []
        
        # First: Bus Stand (anchor/origin)
        first_leg_duration = legs[0]['duration']['value'] if legs else 0
        first_leg_text = legs[0]['duration']['text'] if legs else "0 min"
        
        result.append({
            'sequence': 0,
            'name': bus_stand['name'],
            'id': bus_stand['id'],
            'place_id': bus_stand['google_place_id'],
            'cluster': bus_stand.get('location', {}).get('cluster_zone', ''),
            'type': 'anchor',
            'next_stop_minutes': round(first_leg_duration / 60),
            'next_stop_text': first_leg_text,
            'popularity_rank': bus_stand.get('stats', {}).get('popularity_rank', 0),
            'rating': bus_stand.get('stats', {}).get('rating', 0)
        })
        
        # Middle: Waypoints in optimized order
        for i, wp_idx in enumerate(waypoint_order):
            place = waypoint_places[wp_idx]
            
            # Get travel time to next from corresponding leg
            leg_idx = i + 1
            travel_time = 0
            travel_text = "0 min"
            if leg_idx < len(legs):
                travel_time = legs[leg_idx]['duration']['value']
                travel_text = legs[leg_idx]['duration']['text']
            
            result.append({
                'sequence': i + 1,
                'name': place['name'],
                'id': place['id'],
                'place_id': place['google_place_id'],
                'cluster': place.get('location', {}).get('cluster_zone', ''),
                'type': 'waypoint',
                'next_stop_minutes': round(travel_time / 60),
                'next_stop_text': travel_text,
                'popularity_rank': place.get('stats', {}).get('popularity_rank', 0),
                'rating': place.get('stats', {}).get('rating', 0)
            })
        
        # Add return leg info (last waypoint back to bus stand)
        if legs:
            last_leg = legs[-1]
            return_time = last_leg['duration']['value']
            result[-1]['next_stop_minutes'] = round(return_time / 60)
            result[-1]['next_stop_text'] = last_leg['duration']['text']
        
        return result
        
    except Exception as e:
        print(f"  ❌ API Error: {e}")
        import traceback
        traceback.print_exc()
        return []


def main():
    """Main execution."""
    print("="*60)
    print("🚌 CORE 25 CIRCULAR ROUTE GENERATOR")
    print("="*60)
    
    # Validate API key
    if not GOOGLE_MAPS_API_KEY:
        print("❌ GOOGLE_MAPS_API_KEY not found in environment")
        return
    
    # Initialize Google Maps client
    gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
    print(f"✅ Google Maps client initialized")
    
    # Load places
    all_places = load_places()
    print(f"✅ Loaded {len(all_places)} places from {PLACES_PATH}")
    
    # Filter to core zones
    print("\n📦 FILTERING PLACES")
    print("-"*40)
    core_places = filter_core_places(all_places)
    print(f"  Core zones only: {len(core_places)} places")
    
    # Find bus stand
    bus_stand = find_bus_stand(all_places)
    if not bus_stand:
        print("❌ Could not find Kodaikanal Bus Stand in data")
        return
    print(f"  🚌 Found anchor: {bus_stand['name']}")
    
    # Select top 25
    print("\n🏆 SELECTING TOP 25")
    print("-"*40)
    top_places = select_top_places(core_places, bus_stand, limit=MAX_WAYPOINTS)
    print(f"  Selected: {len(top_places)} places")
    
    for i, p in enumerate(top_places[:10], 1):
        rank = p.get('stats', {}).get('popularity_rank', '?')
        score = p.get('stats', {}).get('popularity_score', 0)
        print(f"    {i:2}. {p['name'][:30]:<30} (Rank {rank}, Score {score:.1f})")
    if len(top_places) > 10:
        print(f"    ... and {len(top_places) - 10} more")
    
    # Build optimized route
    print("\n🚗 ROUTE OPTIMIZATION")
    print("-"*40)
    route = build_core_route(top_places, bus_stand, gmaps)
    
    if not route:
        print("❌ Failed to build route")
        return
    
    # Save output
    print("\n💾 SAVING RESULTS")
    print("-"*40)
    
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(route, f, indent=2)
    
    print(f"✅ Saved to {OUTPUT_PATH}")
    
    # Summary
    print("\n📊 ROUTE SUMMARY")
    print("-"*40)
    total_time = sum(p['next_stop_minutes'] for p in route)
    print(f"  Total Stops: {len(route)}")
    print(f"  Total Drive Time: ~{total_time} min ({total_time // 60}h {total_time % 60}m)")
    
    print("\n🗺️  GOLDEN LOOP ORDER:")
    for stop in route:
        next_time = stop['next_stop_minutes']
        marker = "🚌" if stop['type'] == 'anchor' else "📍"
        print(f"  {marker} {stop['sequence']:2}. {stop['name'][:35]:<35} → {next_time} min")
    print(f"  🚌  ↩ Return to {bus_stand['name']}")
    
    print("\n✅ Pipeline complete!")


if __name__ == '__main__':
    main()
