#!/usr/bin/env python3
"""
4-Cluster Optimization Pipeline
================================
Groups Kodaikanal places into 4 geographic zones and optimizes travel routes
using Google Maps Directions API with waypoint optimization.

Zones:
1. Town Center
2. Forest Circuit
3. Vattakanal
4. Poombarai (Village & Meadows)

Outskirts places are absorbed into their nearest cluster.

Usage:
    python optimize_clusters.py
"""

import os
import json
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
import googlemaps

load_dotenv()

# Configuration
PLACES_PATH = 'data/kodaikanal_places.json'
OUTPUT_PATH = 'data/cluster_routes.json'
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

# Cluster zone mappings (handle naming variations)
CLUSTER_ALIASES = {
    'Town Center': 'Town Center',
    'Forest Circuit': 'Forest Circuit',
    'Vattakanal': 'Vattakanal',
    'Poombarai': 'Poombarai',
    'Village & Meadows': 'Poombarai',  # Alias mapping
}

# Main bucket names for output
MAIN_CLUSTERS = ['Town Center', 'Forest Circuit', 'Vattakanal', 'Poombarai']


def load_places() -> List[Dict]:
    """Load places from JSON file."""
    with open(PLACES_PATH, 'r') as f:
        data = json.load(f)
    return data.get('places', [])


def bucket_places(places: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Bucket places into 4 main clusters.
    Outskirts places are absorbed into their nearest cluster.
    """
    buckets = {cluster: [] for cluster in MAIN_CLUSTERS}
    
    for place in places:
        location = place.get('location', {})
        cluster_zone = location.get('cluster_zone', '')
        nearest_cluster = location.get('nearest_cluster', '')
        
        # Normalize cluster names
        normalized_zone = CLUSTER_ALIASES.get(cluster_zone, cluster_zone)
        
        if normalized_zone == 'Outskirts':
            # Absorb into nearest cluster
            target_cluster = CLUSTER_ALIASES.get(nearest_cluster, nearest_cluster)
            if target_cluster in buckets:
                buckets[target_cluster].append(place)
                print(f"  📍 {place['name'][:30]:<30} → {target_cluster} (from Outskirts)")
            else:
                print(f"  ⚠️ {place['name']}: Unknown nearest_cluster '{nearest_cluster}'")
        elif normalized_zone in buckets:
            buckets[normalized_zone].append(place)
        else:
            print(f"  ⚠️ {place['name']}: Unknown cluster_zone '{cluster_zone}'")
    
    return buckets


def get_anchor_place(places: List[Dict]) -> Optional[Dict]:
    """Find the place with highest popularity_score (Rank 1) to use as anchor."""
    if not places:
        return None
    
    # Sort by popularity_rank (ascending, 1 is best)
    sorted_places = sorted(
        places,
        key=lambda p: p.get('stats', {}).get('popularity_rank', 999)
    )
    return sorted_places[0]


def optimize_bucket(cluster_name: str, places: List[Dict], gmaps_client) -> List[Dict]:
    """
    Optimize a bucket of places using Google Maps Directions API.
    Uses the most popular place as both origin and destination (round trip).
    
    Returns list of places with order_sequence and travel_time_to_next_min.
    """
    print(f"\n🔄 Optimizing {cluster_name} ({len(places)} places)")
    
    if len(places) < 2:
        # No optimization needed for 0-1 places
        result = []
        for i, place in enumerate(places):
            result.append({
                'place_id': place.get('google_place_id'),
                'internal_id': place.get('id'),
                'name': place.get('name'),
                'order_sequence': i + 1,
                'travel_time_to_next_min': 0
            })
        print(f"  ℹ️ Skipped optimization (< 2 places)")
        return result
    
    # Find anchor (most popular place)
    anchor = get_anchor_place(places)
    if not anchor:
        print(f"  ❌ Could not find anchor place")
        return []
    
    print(f"  🎯 Anchor: {anchor['name']} (Rank {anchor.get('stats', {}).get('popularity_rank', '?')})")
    
    # Build waypoints (all places except anchor)
    waypoints = []
    waypoint_places = []
    for place in places:
        if place['id'] != anchor['id']:
            waypoints.append(f"place_id:{place['google_place_id']}")
            waypoint_places.append(place)
    
    if not waypoints:
        # Only anchor exists after filtering
        return [{
            'place_id': anchor.get('google_place_id'),
            'internal_id': anchor.get('id'),
            'name': anchor.get('name'),
            'order_sequence': 1,
            'travel_time_to_next_min': 0
        }]
    
    try:
        # Call Google Maps Directions API
        origin = f"place_id:{anchor['google_place_id']}"
        destination = origin  # Round trip
        
        print(f"  📡 Calling Directions API with {len(waypoints)} waypoints...")
        
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
        
        print(f"  ✅ Optimized order: {waypoint_order}")
        
        # Build result list
        result = []
        
        # First: Anchor (origin)
        first_leg_duration = legs[0]['duration']['value'] if legs else 0
        result.append({
            'place_id': anchor.get('google_place_id'),
            'internal_id': anchor.get('id'),
            'name': anchor.get('name'),
            'order_sequence': 1,
            'travel_time_to_next_min': round(first_leg_duration / 60)
        })
        
        # Middle: Waypoints in optimized order
        for i, wp_idx in enumerate(waypoint_order):
            place = waypoint_places[wp_idx]
            # Get travel time to next from corresponding leg
            leg_idx = i + 1  # +1 because first leg is origin -> first waypoint
            travel_time = 0
            if leg_idx < len(legs):
                travel_time = legs[leg_idx]['duration']['value']
            
            result.append({
                'place_id': place.get('google_place_id'),
                'internal_id': place.get('id'),
                'name': place.get('name'),
                'order_sequence': i + 2,  # +2 because anchor is 1
                'travel_time_to_next_min': round(travel_time / 60)
            })
        
        # Last entry's travel_time is back to anchor (already in last leg)
        
        return result
        
    except Exception as e:
        print(f"  ❌ API Error: {e}")
        # Return unoptimized order as fallback
        result = []
        for i, place in enumerate(places):
            result.append({
                'place_id': place.get('google_place_id'),
                'internal_id': place.get('id'),
                'name': place.get('name'),
                'order_sequence': i + 1,
                'travel_time_to_next_min': 0
            })
        return result


def main():
    """Main execution."""
    print("="*60)
    print("🗺️  4-CLUSTER OPTIMIZATION PIPELINE")
    print("="*60)
    
    # Validate API key
    if not GOOGLE_MAPS_API_KEY:
        print("❌ GOOGLE_MAPS_API_KEY not found in environment")
        return
    
    # Initialize Google Maps client
    gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
    print(f"✅ Google Maps client initialized")
    
    # Load places
    places = load_places()
    print(f"✅ Loaded {len(places)} places from {PLACES_PATH}")
    
    # Bucket places
    print("\n📦 BUCKETING PLACES")
    print("-"*40)
    buckets = bucket_places(places)
    
    for cluster, cluster_places in buckets.items():
        print(f"  {cluster}: {len(cluster_places)} places")
    
    # Optimize each bucket
    print("\n🚗 ROUTE OPTIMIZATION")
    print("-"*40)
    
    optimized_routes = {}
    for cluster in MAIN_CLUSTERS:
        cluster_places = buckets.get(cluster, [])
        optimized = optimize_bucket(cluster, cluster_places, gmaps)
        optimized_routes[cluster] = optimized
    
    # Save output
    print("\n💾 SAVING RESULTS")
    print("-"*40)
    
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(optimized_routes, f, indent=2)
    
    print(f"✅ Saved to {OUTPUT_PATH}")
    
    # Summary
    print("\n📊 SUMMARY")
    print("-"*40)
    total_places = sum(len(places) for places in optimized_routes.values())
    print(f"Total places optimized: {total_places}")
    for cluster, places in optimized_routes.items():
        if places:
            total_time = sum(p['travel_time_to_next_min'] for p in places)
            print(f"  {cluster}: {len(places)} places, ~{total_time} min driving")
    
    print("\n✅ Pipeline complete!")


if __name__ == '__main__':
    main()
