#!/usr/bin/env python3
"""
Itinerary Scheduler (Tetris Engine)
====================================
Builds day-wise itineraries with:
- Forest Circuit strict one-way routing (auto-updated via Google Maps)
- Hardest-First anchoring for standard clusters
- Pace-based place limits per day
- Cluster merging when days < clusters

Usage:
    from scheduler import ItineraryScheduler
    scheduler = ItineraryScheduler()
    itinerary = scheduler.build_itinerary(selected_places, user_config)
"""

import os
import json
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv
import googlemaps
from math import radians, cos, sin, asin, sqrt

load_dotenv()

# Configuration
PLACES_PATH = 'data/kodaikanal_places.json'
FOREST_ROUTE_CACHE = 'data/forest_circuit_route.json'
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
API_BASE_URL = os.getenv('API_BASE_URL', 'http://127.0.0.1:5001')

# Pace limits: places per day
PACE_LIMITS = {
    'slow': 3,
    'medium': 5,
    'fast': 8
}

# Pace-based start times (hours from midnight)
PACE_START_TIMES = {
    'slow': 11,      # 11:00 AM
    'chill': 11,     # 11:00 AM (alias)
    'medium': 9,     # 9:00 AM
    'balanced': 9,   # 9:00 AM (alias)
    'fast': 7,       # 7:00 AM
    'packed': 7      # 7:00 AM (alias)
}

# Pace-based end times (hours from midnight)
PACE_END_TIMES = {
    'slow': 16,      # 4:00 PM
    'chill': 16,     # 4:00 PM (alias)
    'medium': 18,    # 6:00 PM
    'balanced': 18,  # 6:00 PM (alias)
    'fast': 20,      # 8:00 PM
    'packed': 20     # 8:00 PM (alias)
}

# Lunch break configuration
LUNCH_BREAK_TIME = 13.5  # 1:30 PM
LUNCH_BREAK_DURATION = 90  # 90 minutes

# Cluster priority order (for day assignment)
CLUSTER_ORDER = ['Town Center', 'Forest Circuit', 'Vattakanal', 'Poombarai']


class ItineraryScheduler:
    """
    Builds optimized day-wise itineraries.
    
    Features:
    - Forest Circuit: Strict one-way, auto-updated via Google Maps
    - Standard Clusters: Hardest-First anchoring + Google Maps optimization
    - Pace Limits: Slow=3, Medium=5, Fast=8 places/day
    - Cluster Merging: When days < clusters, merge nearest
    """
    
    def __init__(self):
        """Initialize the scheduler."""
        self.gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY) if GOOGLE_MAPS_API_KEY else None
        self.forest_route = self._load_forest_route()
        self.places_data = self._load_places()
        print("✅ ItineraryScheduler initialized")
    
    def _load_places(self) -> Dict[str, Dict]:
        """Load places indexed by ID."""
        try:
            with open(PLACES_PATH, 'r') as f:
                data = json.load(f)
            return {p['id']: p for p in data.get('places', [])}
        except Exception as e:
            print(f"⚠️ Could not load places: {e}")
            return {}
    
    def _load_forest_route(self) -> List[Dict]:
        """Load cached Forest Circuit route, or return default."""
        try:
            with open(FOREST_ROUTE_CACHE, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Default hardcoded route
            return [
                {"id": "green-valley-viewpoint-kodaikanal", "travel_to_next_min": 5},
                {"id": "guna-cave-kodaikanal", "travel_to_next_min": 1},
                {"id": "pillar-rocks-road-kodaikanal", "travel_to_next_min": 4},
                {"id": "pine-forest-kodaikanal", "travel_to_next_min": 3},
                {"id": "moir-point-kodaikanal", "travel_to_next_min": 0}
            ]
    
    def rebuild_forest_route(self) -> List[Dict]:
        """
        Rebuild Forest Circuit route using Google Maps.
        Called when new places are added to Forest Circuit cluster.
        
        Logic:
        1. Get all Forest Circuit places from JSON
        2. Call Google Maps: Bus Stand → [all places] → Bus Stand
        3. Remove Bus Stand from ends and cache result
        """
        if not self.gmaps:
            print("⚠️ Google Maps API not available, using default route")
            return self.forest_route
        
        # Find all Forest Circuit places
        forest_places = [
            p for p in self.places_data.values()
            if p.get('location', {}).get('cluster_zone') == 'Forest Circuit'
        ]
        
        if len(forest_places) < 2:
            print("⚠️ Not enough Forest Circuit places to optimize")
            return self.forest_route
        
        # Find bus stand
        bus_stand = self.places_data.get('kodaikanal-bus-stand-kodaikanal')
        if not bus_stand:
            print("⚠️ Bus Stand not found, using default route")
            return self.forest_route
        
        try:
            # Build waypoints
            waypoints = [f"place_id:{p['google_place_id']}" for p in forest_places]
            origin = f"place_id:{bus_stand['google_place_id']}"
            
            print(f"🔄 Rebuilding Forest Circuit route ({len(waypoints)} places)...")
            
            result = self.gmaps.directions(
                origin=origin,
                destination=origin,
                waypoints=waypoints,
                optimize_waypoints=True,
                mode='driving'
            )
            
            if not result:
                print("⚠️ No route found, using default")
                return self.forest_route
            
            route = result[0]
            waypoint_order = route.get('waypoint_order', [])
            legs = route.get('legs', [])
            
            # Build optimized route (skip first and last leg which are bus stand)
            optimized = []
            for i, wp_idx in enumerate(waypoint_order):
                place = forest_places[wp_idx]
                travel_time = 0
                if i + 1 < len(legs) - 1:  # Not the last leg back to bus stand
                    travel_time = round(legs[i + 1]['duration']['value'] / 60)
                
                optimized.append({
                    "id": place['id'],
                    "travel_to_next_min": travel_time
                })
            
            # Last place has 0 travel time (end of forest loop)
            if optimized:
                optimized[-1]['travel_to_next_min'] = 0
            
            # Cache the route
            with open(FOREST_ROUTE_CACHE, 'w') as f:
                json.dump(optimized, f, indent=2)
            
            print(f"✅ Forest Circuit route rebuilt: {[p['id'].split('-')[0] for p in optimized]}")
            self.forest_route = optimized
            return optimized
            
        except Exception as e:
            print(f"❌ Error rebuilding Forest route: {e}")
            return self.forest_route
    
    def _get_forest_route_for_selection(self, selected_ids: List[str]) -> List[Dict]:
        """
        Get Forest Circuit route filtered by selected places.
        Sums travel times across skipped places.
        """
        result = []
        accumulated_time = 0
        
        for item in self.forest_route:
            if item['id'] in selected_ids:
                result.append({
                    'id': item['id'],
                    'travel_to_next_min': accumulated_time + item['travel_to_next_min']
                })
                accumulated_time = 0
            else:
                # Place not selected, accumulate its travel time
                accumulated_time += item['travel_to_next_min']
        
        # Last place should have 0 travel time
        if result:
            result[-1]['travel_to_next_min'] = 0
        
        return result
    
    def _haversine(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points in km."""
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        return 2 * 6371 * asin(sqrt(a))
    
    def _get_cluster_centroid(self, places: List[Dict]) -> Tuple[float, float]:
        """Calculate average lat/lng for a cluster."""
        if not places:
            return (0, 0)
        lats = [p.get('location', {}).get('lat', 0) for p in places]
        lngs = [p.get('location', {}).get('lng', 0) for p in places]
        return (sum(lats) / len(lats), sum(lngs) / len(lngs))
    
    def _find_anchor(self, places: List[Dict]) -> Optional[Dict]:
        """Find anchor place: Hard difficulty first, then highest popularity."""
        # Try to find a Hard difficulty place
        hard_places = [p for p in places if p.get('logic', {}).get('difficulty') == 'Hard']
        if hard_places:
            return sorted(hard_places, key=lambda p: p.get('stats', {}).get('popularity_rank', 999))[0]
        
        # Fallback: highest popularity
        return sorted(places, key=lambda p: p.get('stats', {}).get('popularity_rank', 999))[0] if places else None
    
    def _optimize_cluster_route(
        self,
        places: List[Dict],
        hotel_cluster: str
    ) -> List[Dict]:
        """
        Optimize route for a non-Forest cluster.
        Strategy: Hotel → Anchor (hardest/most popular) → optimized waypoints → Hotel
        """
        if not places:
            return []
        
        if len(places) == 1:
            return [{
                'id': places[0]['id'],
                'name': places[0]['name'],
                'travel_to_next_min': 0
            }]
        
        # Find anchor (Hardest First)
        anchor = self._find_anchor(places)
        if not anchor:
            anchor = places[0]
        
        other_places = [p for p in places if p['id'] != anchor['id']]
        
        if not self.gmaps or not other_places:
            # No API or single place - return as-is
            result = [{'id': anchor['id'], 'name': anchor['name'], 'travel_to_next_min': 0}]
            for p in other_places:
                result.append({'id': p['id'], 'name': p['name'], 'travel_to_next_min': 0})
            return result
        
        try:
            # Build waypoints
            waypoints = [f"place_id:{p['google_place_id']}" for p in other_places]
            anchor_id = f"place_id:{anchor['google_place_id']}"
            
            # Route: Anchor → waypoints → Anchor (round trip)
            result_route = self.gmaps.directions(
                origin=anchor_id,
                destination=anchor_id,
                waypoints=waypoints,
                optimize_waypoints=True,
                mode='driving'
            )
            
            if not result_route:
                # Fallback: unoptimized order
                result = [{'id': anchor['id'], 'name': anchor['name'], 'travel_to_next_min': 0}]
                for p in other_places:
                    result.append({'id': p['id'], 'name': p['name'], 'travel_to_next_min': 0})
                return result
            
            route = result_route[0]
            waypoint_order = route.get('waypoint_order', [])
            legs = route.get('legs', [])
            
            # Build result: Anchor first
            result = [{
                'id': anchor['id'],
                'name': anchor['name'],
                'travel_to_next_min': round(legs[0]['duration']['value'] / 60) if legs else 0
            }]
            
            # Add waypoints in optimized order
            for i, wp_idx in enumerate(waypoint_order):
                place = other_places[wp_idx]
                travel_time = 0
                if i + 1 < len(legs):
                    travel_time = round(legs[i + 1]['duration']['value'] / 60)
                result.append({
                    'id': place['id'],
                    'name': place['name'],
                    'travel_to_next_min': travel_time
                })
            
            # Last place travel time is back to start (we'll use this for return to hotel)
            if result:
                result[-1]['travel_to_next_min'] = round(legs[-1]['duration']['value'] / 60) if legs else 0
            
            return result
            
        except Exception as e:
            print(f"⚠️ Route optimization failed: {e}")
            result = [{'id': anchor['id'], 'name': anchor['name'], 'travel_to_next_min': 0}]
            for p in other_places:
                result.append({'id': p['id'], 'name': p['name'], 'travel_to_next_min': 0})
            return result
    
    def _assign_to_clusters(self, places: List[Dict]) -> Dict[str, List[Dict]]:
        """Group places by cluster, absorbing Outskirts into nearest_cluster."""
        clusters = {c: [] for c in CLUSTER_ORDER}
        
        for place in places:
            cluster = place.get('location', {}).get('cluster_zone', 'Town Center')
            
            if cluster == 'Outskirts':
                # Absorb into nearest cluster
                nearest = place.get('location', {}).get('nearest_cluster', 'Town Center')
                if nearest in clusters:
                    clusters[nearest].append(place)
                else:
                    clusters['Town Center'].append(place)
            elif cluster in clusters:
                clusters[cluster].append(place)
            else:
                clusters['Town Center'].append(place)
        
        return clusters
    
    def _merge_clusters(
        self,
        clusters: Dict[str, List[Dict]],
        num_days: int
    ) -> Dict[str, List[Dict]]:
        """
        Merge clusters if num_days < num_clusters.
        Strategy: Merge the two clusters with the fewest combined places.
        This balances place counts across days better than geographic merging.
        """
        active_clusters = {k: v for k, v in clusters.items() if v}
        
        while len(active_clusters) > num_days and len(active_clusters) > 1:
            # Find two clusters with the fewest combined places
            cluster_names = list(active_clusters.keys())
            min_combined = float('inf')
            merge_pair = (cluster_names[0], cluster_names[1])
            
            for i, c1 in enumerate(cluster_names):
                for c2 in cluster_names[i+1:]:
                    combined_count = len(active_clusters[c1]) + len(active_clusters[c2])
                    if combined_count < min_combined:
                        min_combined = combined_count
                        merge_pair = (c1, c2)
            
            # Merge c2 into c1
            c1, c2 = merge_pair
            print(f"📦 Merging clusters for balance: {c1} ({len(active_clusters[c1])} places) + {c2} ({len(active_clusters[c2])} places)")
            active_clusters[f"{c1} + {c2}"] = active_clusters[c1] + active_clusters[c2]
            del active_clusters[c1]
            del active_clusters[c2]
        
        return active_clusters

    def _generate_suggestions(self, itinerary_days: List[Dict], selected_ids: List[str]) -> List[Dict]:
        """Generate 5 on-the-way suggestions based on itinerary clusters."""
        visited_clusters = set()
        for day in itinerary_days:
            c = day['cluster']
            if ' + ' in c:
                visited_clusters.update(c.split(' + '))
            else:
                visited_clusters.add(c)
        
        selected_set = set(selected_ids)
        candidates = []
        
        for pid, place in self.places_data.items():
            if pid in selected_set:
                continue
            
            # Suggest only places in the same clusters we are visiting
            # This ensures they are "on the way" or nearby
            p_cluster = place.get('location', {}).get('cluster_zone')
            if p_cluster in visited_clusters:
                content = place.get('content', {})
                photo_ref = content.get('photo_reference')
                candidates.append({
                    'id': pid,
                    'name': place.get('name'),
                    'cluster': p_cluster,
                    'image_url': f"{API_BASE_URL}/api/photo/{photo_ref}" if photo_ref else '',
                    'rating': place.get('stats', {}).get('rating', 0),
                    'review_count': place.get('stats', {}).get('review_count', 0),
                    'avg_time_minutes': place.get('logic', {}).get('avg_time_spent_minutes', 60),
                    'difficulty': place.get('logic', {}).get('difficulty', 'Easy')
                })
        
        # Sort by rating (desc) then review count (desc)
        candidates.sort(key=lambda x: (x.get('rating', 0) or 0, x.get('review_count', 0) or 0), reverse=True)
        
        return candidates[:5]
    
    def _estimate_day_duration(self, places: List[Dict]) -> int:
        """Estimate total duration for a list of places in minutes."""
        total = 0
        for p in places:
            # Time at place
            if isinstance(p, dict):
                total += p.get('avg_time_minutes', 60) if 'avg_time_minutes' in p else p.get('logic', {}).get('avg_time_spent_minutes', 60)
                total += p.get('travel_to_next_min', 10)
            else:
                total += 70  # Default estimate
        return total
    
    def _split_days_if_needed(
        self, 
        days: List[Dict], 
        num_days: int,
        pace: str
    ) -> List[Dict]:
        """
        Split longest days when we have more requested days than clusters.
        Prioritizes splitting days with Hard difficulty places or longest duration.
        """
        while len(days) < num_days:
            # Find day with longest estimated duration
            if not days:
                break
            
            # Never split Forest Circuit - it's a one-way route that must stay together
            splittable_days = [d for d in days if 'Forest Circuit' not in d.get('cluster', '')]
            if not splittable_days:
                print("⚠️ Cannot split further - only Forest Circuit days remain")
                break
            
            # Calculate duration for each splittable day
            day_durations = []
            for day in splittable_days:
                duration = sum(
                    p.get('avg_time_minutes', 60) + p.get('travel_to_next_min', 0) 
                    for p in day['places']
                )
                # Bonus for hard places to prioritize splitting those
                hard_count = sum(1 for p in day['places'] if p.get('difficulty') == 'Hard')
                day_durations.append((day, duration + hard_count * 30))
            
            # Sort by duration descending
            day_durations.sort(key=lambda x: x[1], reverse=True)
            longest_day = day_durations[0][0]
            
            if len(longest_day['places']) <= 2:
                print(f"⚠️ Cannot split further - day has only {len(longest_day['places'])} places")
                break  # Can't split further
            
            # Split in half
            places = longest_day['places']
            mid = len(places) // 2
            first_half = places[:mid]
            second_half = places[mid:]
            
            original_cluster = longest_day['cluster']
            original_day_num = longest_day['day']
            
            print(f"📅 Splitting Day {original_day_num} ({original_cluster}): {len(first_half)} + {len(second_half)} places")
            
            # Update original day with first half
            longest_day['places'] = first_half
            longest_day['place_count'] = len(first_half)
            longest_day['total_drive_min'] = sum(p.get('travel_to_next_min', 0) for p in first_half)
            
            # Create new day with second half
            new_day_num = len(days) + 1
            new_day = {
                'day': new_day_num,
                'cluster': f"{original_cluster} (Part 2)",
                'places': second_half,
                'total_drive_min': sum(p.get('travel_to_next_min', 0) for p in second_half),
                'place_count': len(second_half),
                'is_split': True
            }
            days.append(new_day)
        
        # Renumber days sequentially
        for i, day in enumerate(days):
            day['day'] = i + 1
        
        return days
    
    def _get_travel_time(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> int:
        """
        Get driving time in minutes between two coordinates.
        Uses Google Maps Directions API, falls back to haversine estimate.
        """
        if not self.gmaps:
            # Fallback: estimate ~3 min per km
            dist_km = self._haversine(origin_lat, origin_lng, dest_lat, dest_lng)
            return max(5, int(dist_km * 3))
        
        try:
            result = self.gmaps.directions(
                origin=(origin_lat, origin_lng),
                destination=(dest_lat, dest_lng),
                mode="driving"
            )
            if result and result[0].get('legs'):
                duration_sec = result[0]['legs'][0]['duration']['value']
                return max(1, int(duration_sec / 60))
        except Exception as e:
            print(f"⚠️ Google Maps directions failed: {e}")
        
        # Fallback
        dist_km = self._haversine(origin_lat, origin_lng, dest_lat, dest_lng)
        return max(5, int(dist_km * 3))


    def build_itinerary(
        self,
        selected_place_ids: List[str],
        user_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Build day-wise itinerary from selected places.
        
        Args:
            selected_place_ids: List of place IDs to include
            user_config: {
                'num_days': 3,
                'pace': 'medium',
                'hotel_cluster': 'Town Center',
                'start_time': '09:00',
                'end_time': '18:00'
            }
            
        Returns:
            {'days': [{'day': 1, 'cluster': '...', 'places': [...], 'total_drive_min': X}]}
        """
        num_days = user_config.get('num_days', 3)
        pace = user_config.get('pace', 'medium')
        hotel_cluster = user_config.get('hotel_cluster', 'Town Center')
        places_per_day = PACE_LIMITS.get(pace, 5)
        
        print(f"\n🗓️ Building {num_days}-day itinerary (pace: {pace}, {places_per_day} places/day)")
        
        # Get full place data for selected IDs
        selected_places = [
            self.places_data[pid] 
            for pid in selected_place_ids 
            if pid in self.places_data
        ]
        
        # Filter out places not meant for itinerary (restaurants, services, etc.)
        selected_places = [
            p for p in selected_places 
            if p.get('logic', {}).get('itinerary_include', True) is not False
        ]
        
        if not selected_places:
            return {"days": [], "error": "No valid places selected"}
        
        # Assign to clusters
        clusters = self._assign_to_clusters(selected_places)
        
        # Merge if needed
        if sum(1 for v in clusters.values() if v) > num_days:
            clusters = self._merge_clusters(clusters, num_days)
        
        # Optimize day order based on opening hours if start_date is provided
        start_date_str = user_config.get('start_date')
        if start_date_str:
            try:
                from datetime import datetime
                start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                start_day_idx = int(start_date.strftime('%w')) # 0=Sun, 6=Sat
                
                # We have N clusters and N days (or fewer).
                # We need to assign clusters to days (0, 1, 2...) such that closed places are minimized.
                # Simple greedy approach or permutation if days are small (usually 2-3).
                
                cluster_names = list(clusters.keys())
                import itertools
                
                best_perm = cluster_names
                min_closed = float('inf')
                
                # Check all permutations of clusters against days
                for perm in itertools.permutations(cluster_names):
                    closed_count = 0
                    current_day_idx = start_day_idx
                    
                    for cluster_name in perm:
                        cluster_places = clusters[cluster_name]
                        # Check each place against current_day_idx
                        for p in cluster_places:
                            # 0=Sunday in Google Maps API opening_hours
                            periods = p.get('logic', {}).get('opening_hours', {}).get('periods', [])
                            if not periods: continue # Assume open 24/7 if no data
                            
                            is_open = False
                            for period in periods:
                                open_day = period.get('open', {}).get('day')
                                if open_day == current_day_idx:
                                    is_open = True
                                    break
                            
                            if not is_open:
                                closed_count += 1
                        
                        current_day_idx = (current_day_idx + 1) % 7
                    
                    if closed_count < min_closed:
                        min_closed = closed_count
                        best_perm = perm
                
                # Reorder clusters dict
                new_clusters = {name: clusters[name] for name in best_perm}
                clusters = new_clusters
                print(f"🗓️ Optimized schedule starting weekday {start_day_idx} (0=Sun): {list(clusters.keys())}")
                
            except Exception as e:
                print(f"⚠️ Day optimization failed: {e}")

        # Build itinerary by day
        days = []
        day_num = 1
        
        for cluster_name, places in clusters.items():
            if not places:
                continue
            
            # No longer truncating by pace limit - keep all selected places
            # Overflow will be handled by spreading to adjacent days in future
            day_places = places
            
            if 'Forest Circuit' in cluster_name:
                # Separate Forest Circuit places from other places in merged cluster
                forest_route_ids = {item['id'] for item in self.forest_route}
                forest_places = [p for p in day_places if p['id'] in forest_route_ids]
                other_places = [p for p in day_places if p['id'] not in forest_route_ids]
                
                print(f"📍 {cluster_name}: {len(forest_places)} forest places, {len(other_places)} other places")
                
                # Process Forest Circuit places using the route
                forest_ids = [p['id'] for p in forest_places]
                route = self._get_forest_route_for_selection(forest_ids)
                
                # Enrich Forest Circuit places
                enriched = []
                for item in route:
                    place = self.places_data.get(item['id'], {})
                    content = place.get('content', {})
                    photo_ref = content.get('photo_reference')
                    enriched.append({
                        'id': item['id'],
                        'name': place.get('name', item['id']),
                        'cluster': 'Forest Circuit',
                        'image_url': f"{API_BASE_URL}/api/photo/{photo_ref}" if photo_ref else '',
                        'tags': content.get('tags', [])[:3],
                        'rating': place.get('stats', {}).get('rating'),
                        'review_count': place.get('stats', {}).get('review_count', 0),
                        'avg_time_minutes': place.get('logic', {}).get('avg_time_spent_minutes', 60),
                        'tips': content.get('tips', []),
                        'short_summary': content.get('short_summary', ''),
                        'best_time_text': content.get('best_time_text', ''),
                        'difficulty': place.get('logic', {}).get('difficulty', 'Easy'),
                        'travel_to_next_min': item['travel_to_next_min'],
                        'is_forest_circuit': True
                    })
                
                # Add non-Forest places (e.g., Vattakanal) at the end
                for place in other_places:
                    content = place.get('content', {})
                    photo_ref = content.get('photo_reference')
                    enriched.append({
                        'id': place['id'],
                        'name': place.get('name'),
                        'cluster': place.get('location', {}).get('cluster_zone', cluster_name),
                        'image_url': f"{API_BASE_URL}/api/photo/{photo_ref}" if photo_ref else '',
                        'tags': content.get('tags', [])[:3],
                        'rating': place.get('stats', {}).get('rating'),
                        'review_count': place.get('stats', {}).get('review_count', 0),
                        'avg_time_minutes': place.get('logic', {}).get('avg_time_spent_minutes', 60),
                        'tips': content.get('tips', []),
                        'short_summary': content.get('short_summary', ''),
                        'best_time_text': content.get('best_time_text', ''),
                        'difficulty': place.get('logic', {}).get('difficulty', 'Easy'),
                        'travel_to_next_min': 10,  # Estimate 10 min travel between merged clusters
                        'is_forest_circuit': False
                    })
                
                total_drive = sum(p['travel_to_next_min'] for p in enriched)
                
                days.append({
                    'day': day_num,
                    'cluster': cluster_name,
                    'places': enriched,
                    'total_drive_min': total_drive,
                    'place_count': len(enriched)
                })
            else:
                # Standard cluster optimization
                route = self._optimize_cluster_route(day_places, hotel_cluster)
                
                # Enrich with place data
                enriched = []
                for item in route:
                    place = self.places_data.get(item['id'], {})
                    content = place.get('content', {})
                    photo_ref = content.get('photo_reference')
                    enriched.append({
                        'id': item['id'],
                        'name': item.get('name', place.get('name', item['id'])),
                        'cluster': cluster_name,
                        'image_url': f"{API_BASE_URL}/api/photo/{photo_ref}" if photo_ref else '',
                        'tags': content.get('tags', [])[:3],
                        'rating': place.get('stats', {}).get('rating'),
                        'review_count': place.get('stats', {}).get('review_count', 0),
                        'avg_time_minutes': place.get('logic', {}).get('avg_time_spent_minutes', 60),
                        'tips': content.get('tips', []),
                        'short_summary': content.get('short_summary', ''),
                        'best_time_text': content.get('best_time_text', ''),
                        'difficulty': place.get('logic', {}).get('difficulty', 'Easy'),
                        'travel_to_next_min': item.get('travel_to_next_min', 0),
                        'is_forest_circuit': False
                    })
                
                total_drive = sum(p['travel_to_next_min'] for p in enriched)
                
                days.append({
                    'day': day_num,
                    'cluster': cluster_name,
                    'places': enriched,
                    'total_drive_min': total_drive,
                    'place_count': len(enriched)
                })
            
            day_num += 1
        
        # Split days if we have more requested days than clusters
        if len(days) < num_days:
            days = self._split_days_if_needed(days, num_days, pace)
        
        # Get timing configuration
        start_hour = PACE_START_TIMES.get(pace.lower(), 9)
        end_hour = PACE_END_TIMES.get(pace.lower(), 18)
        end_time_minutes = end_hour * 60
        
        # Get user-forced place IDs (these won't be removed, just flagged)
        user_forced_ids = set(user_config.get('user_forced_ids', []))
        
        # Track removed places
        removed_places = []
        
        # Calculate scheduled times for each place and enforce end time
        for day in days:
            current_time = start_hour * 60  # Convert to minutes from midnight
            lunch_inserted = False
            
            # Track places to keep and places to overflow
            places_to_keep = []
            overflow_places = []
            
            for place in day['places']:
                # Estimate time needed for this place
                time_at_place = place.get('avg_time_minutes', 60)
                travel_after = place.get('travel_to_next_min', 0)
                lunch_addition = 0
                
                # Check if we need lunch break
                needs_lunch = not lunch_inserted and current_time >= LUNCH_BREAK_TIME * 60 - 30
                if needs_lunch:
                    lunch_addition = LUNCH_BREAK_DURATION
                
                # Calculate when we'd finish this place
                finish_time = current_time + lunch_addition + time_at_place + travel_after
                
                # Check if this place exceeds end time
                is_user_forced = place.get('id') in user_forced_ids
                exceeds_end_time = finish_time > end_time_minutes
                
                if exceeds_end_time and not is_user_forced:
                    # Remove this place - it doesn't fit
                    overflow_places.append(place)
                    continue
                
                # Add lunch break if needed
                if needs_lunch:
                    place['has_lunch_before'] = True
                    current_time += LUNCH_BREAK_DURATION
                    lunch_inserted = True
                else:
                    place['has_lunch_before'] = False
                
                # Set scheduled arrival time
                hours = int(current_time // 60)
                minutes = int(current_time % 60)
                place['scheduled_time'] = f"{hours:02d}:{minutes:02d}"
                
                # Calculate departure time
                departure_time = current_time + time_at_place
                dep_hours = int(departure_time // 60)
                dep_minutes = int(departure_time % 60)
                place['departure_time'] = f"{dep_hours:02d}:{dep_minutes:02d}"
                
                # Add warning for user-forced places that exceed end time
                if is_user_forced and exceeds_end_time:
                    place['warning'] = 'late_schedule'
                    place['warning_message'] = f"This place causes schedule to extend past {end_hour}:00"
                
                # Move current time forward
                current_time = departure_time + travel_after
                
                places_to_keep.append(place)
            
            # Update day's places with only the kept ones
            day['places'] = places_to_keep
            day['place_count'] = len(places_to_keep)
            day['total_drive_min'] = sum(p.get('travel_to_next_min', 0) for p in places_to_keep)
            
            # Track removed/overflow places
            for p in overflow_places:
                removed_places.append({
                    'id': p.get('id'),
                    'name': p.get('name'),
                    'cluster': p.get('cluster'),
                    'reason': 'exceeded_end_time',
                    'reason_text': f"Could not fit within {end_hour}:00 end time (pace: {pace})",
                    'image_url': p.get('image_url', ''),
                    'avg_time_minutes': p.get('avg_time_minutes', 60)
                })
            
            # Add end time of day
            end_hours = int(current_time // 60)
            end_minutes = int(current_time % 60)
            day['end_time'] = f"{end_hours:02d}:{end_minutes:02d}"
            day['start_time'] = f"{start_hour:02d}:00"
            day['target_end_time'] = f"{end_hour:02d}:00"
        
        # Remove empty days
        days = [d for d in days if d['places']]
        
        # Renumber days
        for i, day in enumerate(days):
            day['day'] = i + 1
        
        # Calculate hotel travel times if hotel_location is provided
        hotel_location = user_config.get('hotel_location')
        hotel_name = 'Hotel'
        if hotel_location and hotel_location.get('lat') and hotel_location.get('lng'):
            hotel_lat = hotel_location['lat']
            hotel_lng = hotel_location['lng']
            hotel_name = hotel_location.get('name', 'Hotel')
            
            for day in days:
                if not day['places']:
                    continue
                
                first_place = day['places'][0]
                last_place = day['places'][-1]
                
                # Get first place coordinates
                first_data = self.places_data.get(first_place['id'], {})
                first_loc = first_data.get('location', {})
                first_lat = first_loc.get('lat', 0)
                first_lng = first_loc.get('lng', 0)
                
                # Get last place coordinates
                last_data = self.places_data.get(last_place['id'], {})
                last_loc = last_data.get('location', {})
                last_lat = last_loc.get('lat', 0)
                last_lng = last_loc.get('lng', 0)
                
                # Calculate travel times
                if first_lat and first_lng:
                    day['hotel_to_first_min'] = self._get_travel_time(
                        hotel_lat, hotel_lng, first_lat, first_lng
                    )
                else:
                    day['hotel_to_first_min'] = 15  # Default estimate
                
                if last_lat and last_lng:
                    day['last_to_hotel_min'] = self._get_travel_time(
                        last_lat, last_lng, hotel_lat, hotel_lng
                    )
                else:
                    day['last_to_hotel_min'] = 15  # Default estimate
                
                # Adjust start time to include hotel departure
                hotel_depart_min = start_hour * 60 - day['hotel_to_first_min']
                dep_h = int(hotel_depart_min // 60)
                dep_m = int(hotel_depart_min % 60)
                day['hotel_departure_time'] = f"{dep_h:02d}:{dep_m:02d}"
                day['hotel_name'] = hotel_name
                
                print(f"  🏨 Day {day['day']}: Hotel→{first_place['name']} {day['hotel_to_first_min']}min, {last_place['name']}→Hotel {day['last_to_hotel_min']}min")
        
        print(f"✅ Built {len(days)}-day itinerary")
        if removed_places:
            print(f"⚠️ {len(removed_places)} places removed due to time constraints")
        
        # Generate on-the-way suggestions
        suggestions = self._generate_suggestions(days, selected_place_ids)
        
        return {
            "days": days, 
            "start_hour": start_hour,
            "end_hour": end_hour,
            "suggestions": suggestions,
            "removed_places": removed_places
        }


# Singleton instance
_scheduler_instance: Optional[ItineraryScheduler] = None


def get_scheduler() -> ItineraryScheduler:
    """Get or create the singleton scheduler instance."""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = ItineraryScheduler()
    return _scheduler_instance


if __name__ == '__main__':
    # Quick test
    scheduler = ItineraryScheduler()
    
    # Test with sample places
    test_places = [
        'pine-forest-kodaikanal',
        'guna-cave-kodaikanal',
        'bryant-park-kodaikanal',
        'kodaikanal-lake-kodaikanal',
        'dolphin-nose-kodaikanal'
    ]
    
    result = scheduler.build_itinerary(
        test_places,
        {'num_days': 2, 'pace': 'medium', 'hotel_cluster': 'Town Center'}
    )
    
    print("\n" + "="*60)
    print("ITINERARY")
    print("="*60)
    for day in result['days']:
        print(f"\nDay {day['day']}: {day['cluster']} ({day['total_drive_min']} min driving)")
        for p in day['places']:
            print(f"  → {p['name']} ({p['travel_to_next_min']} min to next)")
