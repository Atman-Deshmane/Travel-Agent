#!/usr/bin/env python3
"""
Kodaikanal Intelligence Pipeline
=================================
A 3-stage pipeline that aggregates travel data from Google Maps and Gemini APIs.

Stage 1: Hard Data (Google Maps Places API)
Stage 2: Soft Data (Gemini 3.0 Flash with grounding)
Stage 3: Clustering (Distance Matrix API)

Usage:
    python fetch_place_data.py "Dolphin's Nose"
    python fetch_place_data.py "Kodaikanal Lake" --aggregate
"""

import os
import sys
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any

import googlemaps
from google import genai
from google.genai import types
from slugify import slugify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# =============================================================================
# CONSTANTS
# =============================================================================

# Kodaikanal center coordinates (Kodaikanal Lake)
KODAIKANAL_CENTER = (10.232, 77.489)

# Maximum distance from Kodaikanal center (km) - places beyond this get a warning
MAX_DISTANCE_FROM_CENTER_KM = 50.0

# Cluster Centers for Kodaikanal (lat, lng, name)
CLUSTER_CENTERS = {
    "Town Center": (10.230, 77.488),      # Lake Area
    "Forest Circuit": (10.213, 77.458),   # Moir Point
    "Vattakanal": (10.218, 77.495),       # Dolphin Nose Start
    "Poombarai": (10.252, 77.408),        # Village View
}

# Distance threshold for cluster assignment (km)
CLUSTER_DISTANCE_THRESHOLD_KM = 5.0

# Popularity score normalization factor
POPULARITY_NORMALIZATION = 20000

# Data output directory
DATA_DIR = Path(__file__).parent / "data"

# Images directory
IMAGES_DIR = DATA_DIR / "images"

# =============================================================================
# DISTANCE HELPERS
# =============================================================================

import math

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth.
    
    Args:
        lat1, lng1: First point coordinates
        lat2, lng2: Second point coordinates
    
    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


def check_distance_from_kodaikanal(lat: float, lng: float) -> dict:
    """
    Check if a place is within acceptable distance from Kodaikanal center.
    
    Args:
        lat, lng: Place coordinates
    
    Returns:
        Dictionary with distance info and warning if applicable
    """
    distance = haversine_distance(
        KODAIKANAL_CENTER[0], KODAIKANAL_CENTER[1],
        lat, lng
    )
    
    result = {
        "distance_from_center_km": round(distance, 2),
        "is_within_range": distance <= MAX_DISTANCE_FROM_CENTER_KM,
        "warning": None
    }
    
    if not result["is_within_range"]:
        result["warning"] = f"This place is {result['distance_from_center_km']} km from Kodaikanal center (limit: {MAX_DISTANCE_FROM_CENTER_KM} km). It will be classified as 'Outskirts'."
    
    return result


# =============================================================================
# API CLIENTS
# =============================================================================

def get_maps_client() -> googlemaps.Client:
    """Initialize Google Maps client."""
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_MAPS_API_KEY environment variable not set")
    return googlemaps.Client(key=api_key)


def get_genai_client() -> genai.Client:
    """Initialize Google GenAI client."""
    api_key = os.getenv("GEMINI_API_KEY_CAPSTONE_1")
    if not api_key:
        raise ValueError("GEMINI_API_KEY_CAPSTONE_1 environment variable not set")
    return genai.Client(api_key=api_key)


# =============================================================================
# STAGE 1: HARD DATA (Google Maps)
# =============================================================================

def fetch_maps_data(place_name: str, gmaps: googlemaps.Client) -> dict:
    """
    Stage 1: Fetch hard data from Google Maps Places API.
    
    Args:
        place_name: Name of the place to search
        gmaps: Google Maps client instance
    
    Returns:
        Dictionary with Maps data including place_id, name, location, etc.
    """
    logger.info(f"[Stage 1] Searching Google Maps for: {place_name}")
    
    # Add "Kodaikanal" to improve search accuracy
    search_query = f"{place_name} Kodaikanal"
    
    # Text search to find the place
    places_result = gmaps.places(query=search_query)
    
    if not places_result.get("results"):
        raise ValueError(f"No places found for query: {search_query}")
    
    # Get the first result
    place = places_result["results"][0]
    place_id = place["place_id"]
    
    logger.info(f"[Stage 1] Found place_id: {place_id}")
    
    # Fetch detailed place information
    details = gmaps.place(
        place_id=place_id,
        fields=[
            "name",
            "formatted_address",
            "geometry",
            "rating",
            "user_ratings_total",
            "price_level",
            "website",
            "opening_hours",
            "photo",
            "url"
        ]
    )
    
    result = details.get("result", {})
    
    # Extract photo reference (top 1) and build photo URL
    photo_reference = None
    google_photo_url = None
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if result.get("photos"):
        photo_reference = result["photos"][0].get("photo_reference")
        if photo_reference and api_key:
            google_photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo_reference}&key={api_key}"
    
    # Build maps data dictionary
    maps_data = {
        "place_id": place_id,
        "name": result.get("name", place_name),
        "formatted_address": result.get("formatted_address", ""),
        "lat": result.get("geometry", {}).get("location", {}).get("lat"),
        "lng": result.get("geometry", {}).get("location", {}).get("lng"),
        "rating": result.get("rating"),
        "user_ratings_total": result.get("user_ratings_total", 0),
        "price_level": result.get("price_level"),
        "website": result.get("website"),
        "opening_hours": result.get("opening_hours"),
        "photo_reference": photo_reference,
        "google_photo_url": google_photo_url,
        "google_maps_url": result.get("url", f"https://www.google.com/maps/place/?q=place_id:{place_id}")
    }
    
    logger.info(f"[Stage 1] Retrieved: {maps_data['name']} ({maps_data['rating']}⭐, {maps_data['user_ratings_total']} reviews)")
    
    return maps_data


# =============================================================================
# STAGE 2: SOFT DATA (Gemini 3.0 Flash)
# =============================================================================

def fetch_gemini_data(place_name: str, maps_data: dict, client: genai.Client) -> dict:
    """
    Stage 2: Fetch soft data from Gemini 3.0 Flash with Google Search grounding.
    
    Args:
        place_name: Name of the place
        maps_data: Hard data from Google Maps
        client: GenAI client instance
    
    Returns:
        Dictionary with AI-generated soft data
    """
    logger.info(f"[Stage 2] Querying Gemini for soft data on: {place_name}")
    
    # Build context from Maps data
    maps_context = json.dumps({
        "name": maps_data.get("name"),
        "address": maps_data.get("formatted_address"),
        "rating": maps_data.get("rating"),
        "reviews": maps_data.get("user_ratings_total"),
        "price_level": maps_data.get("price_level"),
    }, indent=2)
    
    system_prompt = f"""You are a Kodaikanal travel expert. Research '{place_name}'.
Use the official Google Maps data provided here as context: {maps_context}

Find and Return a strictly valid JSON object with:
- "avg_time_spent_minutes" (Int, e.g., 90)
- "peak_hours" (Array of ints [10, 11, 12] in 24h format)
- "tags" (Array of EXACTLY 7 descriptive tags, e.g., ["Mist", "Trekking", "Valley View"])
- "best_time_text" (String, e.g., "Early morning before 9 AM")
- "difficulty" (String: one of "Easy", "Moderate", or "Hard")
- "short_summary" (Max 20 words describing the place)
- "tips" (Array of EXACTLY 3 practical tips for visitors)
- "hero_image_url" (Find a public URL of a representative image if possible, else null)
- "source_links" (Array of URLs you used for this info)
- "itinerary_include" (Boolean: true if this is a tourist ATTRACTION/DESTINATION that belongs in an itinerary, false if it's a SERVICE like taxi/safari/transport, or a generic hotel/restaurant without scenic value. Cafes with views like Altaf's Cafe should be true.)

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks, just pure JSON."""

    try:
        # Configure the model with google_search tool for grounding
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=system_prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.7,
            )
        )
        
        # Extract response text
        response_text = response.text.strip()
        
        # Try to parse JSON from response
        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            # Extract JSON from code block
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            if json_match:
                response_text = json_match.group(1)
        
        gemini_data = json.loads(response_text)
        
        # Extract grounding sources if available
        sources = gemini_data.get("source_links", [])
        
        # Also check for grounding metadata in response
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                grounding = candidate.grounding_metadata
                if hasattr(grounding, 'grounding_chunks'):
                    for chunk in grounding.grounding_chunks:
                        if hasattr(chunk, 'web') and chunk.web:
                            if chunk.web.uri and chunk.web.uri not in sources:
                                sources.append(chunk.web.uri)
        
        gemini_data["source_links"] = sources
        
        logger.info(f"[Stage 2] Gemini data retrieved successfully with {len(sources)} sources")
        return gemini_data
        
    except json.JSONDecodeError as e:
        logger.error(f"[Stage 2] Failed to parse Gemini response as JSON: {e}")
        logger.error(f"[Stage 2] Raw response: {response_text[:500]}...")
        return get_default_gemini_data()
    except Exception as e:
        logger.error(f"[Stage 2] Gemini API error: {e}")
        return get_default_gemini_data()


def get_default_gemini_data() -> dict:
    """Return default values when Gemini fails."""
    return {
        "avg_time_spent_minutes": 60,
        "peak_hours": [10, 11, 12],
        "tags": ["Scenic", "Nature", "Tourism", "Kodaikanal", "Hill Station", "Photography", "Sightseeing"],
        "best_time_text": "Early morning or late afternoon",
        "difficulty": "Easy",
        "short_summary": "A popular tourist destination in Kodaikanal.",
        "tips": [
            "Carry water and snacks",
            "Wear comfortable shoes",
            "Check weather before visiting"
        ],
        "hero_image_url": None,
        "source_links": []
    }


# =============================================================================
# STAGE 3: CLUSTERING (Distance Matrix)
# =============================================================================

def calculate_cluster(lat: float, lng: float, gmaps: googlemaps.Client) -> dict:
    """
    Stage 3: Calculate cluster zone using Google Distance Matrix API.
    
    Args:
        lat: Place latitude
        lng: Place longitude
        gmaps: Google Maps client instance
    
    Returns:
        Dictionary with cluster_zone, nearest_cluster, and distance info
    """
    logger.info(f"[Stage 3] Calculating cluster for coordinates: ({lat}, {lng})")
    
    origin = f"{lat},{lng}"
    destinations = [f"{center[0]},{center[1]}" for center in CLUSTER_CENTERS.values()]
    
    try:
        # Call Distance Matrix API
        result = gmaps.distance_matrix(
            origins=[origin],
            destinations=destinations,
            mode="driving"
        )
        
        # Extract distances
        distances = {}
        elements = result.get("rows", [{}])[0].get("elements", [])
        
        for i, (name, _) in enumerate(CLUSTER_CENTERS.items()):
            if i < len(elements) and elements[i].get("status") == "OK":
                distance_meters = elements[i]["distance"]["value"]
                distance_km = distance_meters / 1000.0
                distances[name] = distance_km
                logger.debug(f"  Distance to {name}: {distance_km:.2f} km")
        
        if not distances:
            logger.warning("[Stage 3] No valid distances returned, defaulting to Outskirts")
            return {
                "cluster_zone": "Outskirts",
                "nearest_cluster": list(CLUSTER_CENTERS.keys())[0],
                "distance_km": None
            }
        
        # Find nearest cluster
        nearest_cluster = min(distances, key=distances.get)
        nearest_distance = distances[nearest_cluster]
        
        # Apply threshold rule
        if nearest_distance < CLUSTER_DISTANCE_THRESHOLD_KM:
            cluster_zone = nearest_cluster
            logger.info(f"[Stage 3] Assigned to cluster: {cluster_zone} ({nearest_distance:.2f} km)")
            return {
                "cluster_zone": cluster_zone,
                "nearest_cluster": None,
                "distance_km": nearest_distance
            }
        else:
            logger.info(f"[Stage 3] Assigned to Outskirts (nearest: {nearest_cluster} at {nearest_distance:.2f} km)")
            return {
                "cluster_zone": "Outskirts",
                "nearest_cluster": nearest_cluster,
                "distance_km": nearest_distance
            }
            
    except Exception as e:
        logger.error(f"[Stage 3] Distance Matrix API error: {e}")
        return {
            "cluster_zone": "Outskirts",
            "nearest_cluster": None,
            "distance_km": None
        }


def calculate_popularity_score(review_count: int) -> float:
    """Calculate popularity score from review count."""
    return (review_count / POPULARITY_NORMALIZATION) * 100


# =============================================================================
# OUTPUT FUNCTIONS
# =============================================================================

# Master JSON file path
MASTER_JSON_PATH = DATA_DIR / "kodaikanal_places.json"


def download_place_image(place_slug: str, photo_reference: str) -> Optional[str]:
    """
    Download a place image from Google Maps and save it locally.
    
    Args:
        place_slug: Slug ID of the place (used as filename)
        photo_reference: Google Places photo reference
    
    Returns:
        Relative path to saved image (e.g. 'images/bryant-park-kodaikanal.jpg'), or None on failure
    """
    import requests
    
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not api_key or not photo_reference:
        return None
    
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    
    image_path = IMAGES_DIR / f"{place_slug}.jpg"
    
    # Skip if already downloaded
    if image_path.exists() and image_path.stat().st_size > 0:
        logger.info(f"[Image] Already exists: {image_path.name}")
        return f"images/{place_slug}.jpg"
    
    google_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo_reference}&key={api_key}"
    
    try:
        response = requests.get(google_url, timeout=15)
        if response.status_code == 200 and 'image' in response.headers.get('Content-Type', ''):
            with open(image_path, 'wb') as f:
                f.write(response.content)
            logger.info(f"[Image] Saved: {image_path.name} ({len(response.content) // 1024}KB)")
            return f"images/{place_slug}.jpg"
        else:
            logger.warning(f"[Image] Failed to download for {place_slug}: HTTP {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"[Image] Error downloading for {place_slug}: {e}")
        return None


def load_master_json() -> dict:
    """Load the master JSON file, or create empty structure if not exists."""
    DATA_DIR.mkdir(exist_ok=True)
    
    if MASTER_JSON_PATH.exists():
        with open(MASTER_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    
    return {
        "places": [],
        "total_count": 0,
        "last_updated": None
    }


def update_popularity_ranks(places: list) -> list:
    """
    Update popularity_rank for all places based on popularity_score.
    Rank 1 = highest popularity_score.
    """
    # Sort by popularity_score descending
    sorted_places = sorted(
        places,
        key=lambda x: x.get("stats", {}).get("popularity_score", 0),
        reverse=True
    )
    
    # Assign ranks (1-indexed)
    for rank, place in enumerate(sorted_places, start=1):
        place["stats"]["popularity_rank"] = rank
    
    return sorted_places


def save_to_master_json(place_data: dict) -> Path:
    """
    Add or update a place in the master JSON file.
    Automatically recalculates popularity_rank for all places.
    
    Args:
        place_data: Complete place data object
    
    Returns:
        Path to the master JSON file
    """
    master = load_master_json()
    places = master.get("places", [])
    
    # Check if place already exists (by id or google_place_id)
    place_id = place_data.get("id")
    google_place_id = place_data.get("google_place_id")
    
    existing_index = None
    for i, p in enumerate(places):
        if p.get("id") == place_id or p.get("google_place_id") == google_place_id:
            existing_index = i
            break
    
    if existing_index is not None:
        # Update existing place
        logger.info(f"[Output] Updating existing place: {place_id}")
        places[existing_index] = place_data
    else:
        # Add new place
        logger.info(f"[Output] Adding new place: {place_id}")
        places.append(place_data)
    
    # Recalculate popularity ranks for all places
    places = update_popularity_ranks(places)
    
    # Update master structure
    master["places"] = places
    master["total_count"] = len(places)
    master["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    # Save to file
    with open(MASTER_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=2, ensure_ascii=False)
    
    logger.info(f"[Output] Saved to master JSON: {MASTER_JSON_PATH} ({len(places)} places)")
    
    return MASTER_JSON_PATH



def get_top_places(n: int = 10) -> list:
    """Get top N places by popularity rank."""
    master = load_master_json()
    places = master.get("places", [])
    
    # Places are already sorted by popularity_rank
    return places[:n]


def build_place_data(
    maps_data: dict,
    gemini_data: dict,
    cluster_data: dict
) -> dict:
    """
    Build the place data structure for a single place.
    
    Args:
        maps_data: Stage 1 data from Google Maps
        gemini_data: Stage 2 data from Gemini
        cluster_data: Stage 3 clustering data
    
    Returns:
        Complete place data object (without popularity_rank - that's assigned during save)
    """
    place_name = maps_data.get("name", "Unknown Place")
    slug = slugify(f"{place_name}-kodaikanal")
    
    review_count = maps_data.get("user_ratings_total", 0)
    popularity_score = calculate_popularity_score(review_count)
    
    # Build opening hours structure
    opening_hours_data = maps_data.get("opening_hours", {})
    opening_hours = {
        "weekday_text": opening_hours_data.get("weekday_text", []) if opening_hours_data else [],
        "periods": opening_hours_data.get("periods", []) if opening_hours_data else []
    }
    
    # Use Gemini's itinerary_include decision (defaults to True for tourist attractions)
    # Gemini determines if it's a service/transport (false) or tourist destination (true)
    itinerary_include = gemini_data.get("itinerary_include", True)
    
    place_data = {
        "id": slug,
        "google_place_id": maps_data.get("place_id"),
        "name": place_name,
        
        "location": {
            "lat": maps_data.get("lat"),
            "lng": maps_data.get("lng"),
            "address": maps_data.get("formatted_address", ""),
            "cluster_zone": cluster_data.get("cluster_zone"),
            "nearest_cluster": cluster_data.get("nearest_cluster"),
            "google_maps_link": maps_data.get("google_maps_url")
        },
        
        "stats": {
            "rating": maps_data.get("rating"),
            "review_count": review_count,
            "popularity_score": round(popularity_score, 2),
            "popularity_rank": None,  # Will be set by save_to_master_json
            "price_level": maps_data.get("price_level")
        },
        
        "logic": {
            "avg_time_spent_minutes": gemini_data.get("avg_time_spent_minutes", 60),
            "opening_hours": opening_hours,
            "peak_hours": gemini_data.get("peak_hours", []),
            "difficulty": gemini_data.get("difficulty", "Easy")
        },
        
        "content": {
            "short_summary": gemini_data.get("short_summary", ""),
            "tags": gemini_data.get("tags", [])[:7],  # Ensure max 7 tags
            "best_time_text": gemini_data.get("best_time_text", ""),
            "tips": gemini_data.get("tips", [])[:3],  # Ensure max 3 tips
            "hero_image_url": gemini_data.get("hero_image_url"),
            "photo_reference": maps_data.get("photo_reference"),
            "local_image": None  # Will be set after image download
        },
        
        "sources": gemini_data.get("source_links", []),
        
        "metadata": {
            "added_by": "system",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "itinerary_include": itinerary_include
        }
    }
    
    # Download and store image locally
    photo_ref = maps_data.get("photo_reference")
    if photo_ref:
        local_path = download_place_image(slug, photo_ref)
        if local_path:
            place_data["content"]["local_image"] = local_path
    
    return place_data


# =============================================================================
# MAIN PIPELINE
# =============================================================================

def fetch_place_data(place_name: str) -> dict:
    """
    Main pipeline function: Fetch complete data for a place.
    
    Args:
        place_name: Name of the place (e.g., "Dolphin's Nose")
    
    Returns:
        Complete place data object with distance_info for validation
    """
    logger.info(f"=" * 60)
    logger.info(f"Starting pipeline for: {place_name}")
    logger.info(f"=" * 60)
    
    # Initialize clients
    gmaps = get_maps_client()
    genai_client = get_genai_client()
    
    # Stage 1: Hard Data
    maps_data = fetch_maps_data(place_name, gmaps)
    
    # Check distance from Kodaikanal center
    lat = maps_data.get("lat")
    lng = maps_data.get("lng")
    distance_info = None
    
    if lat and lng:
        distance_info = check_distance_from_kodaikanal(lat, lng)
        if distance_info.get("warning"):
            logger.warning(f"[Distance Check] {distance_info['warning']}")
    
    # Stage 2: Soft Data
    gemini_data = fetch_gemini_data(place_name, maps_data, genai_client)
    
    # Stage 3: Clustering
    if lat and lng:
        cluster_data = calculate_cluster(lat, lng, gmaps)
    else:
        logger.warning("No coordinates available, skipping clustering")
        cluster_data = {"cluster_zone": "Unknown", "nearest_cluster": None, "distance_km": None}
    
    # Build place data
    place_data = build_place_data(maps_data, gemini_data, cluster_data)
    
    # Add distance info to the returned data
    if distance_info:
        place_data["distance_info"] = distance_info
    
    # Save to master JSON (automatically updates popularity_rank for all places)
    save_to_master_json(place_data)
    
    # Reload to get the updated popularity_rank
    master = load_master_json()
    for p in master["places"]:
        if p["id"] == place_data["id"]:
            # Preserve distance_info as it's not saved to JSON
            p["distance_info"] = distance_info
            place_data = p
            break
    
    logger.info(f"=" * 60)
    logger.info(f"Pipeline complete for: {place_name}")
    logger.info(f"=" * 60)
    
    return place_data


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

def main():
    """Command-line interface entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Kodaikanal Intelligence Pipeline - Fetch travel data for places"
    )
    parser.add_argument(
        "place_name",
        nargs="?",
        help="Name of the place to fetch data for (e.g., \"Dolphin's Nose\")"
    )
    parser.add_argument(
        "--top",
        type=int,
        metavar="N",
        help="Show top N places by popularity"
    )
    
    args = parser.parse_args()
    
    if args.top:
        # Show top N places
        places = get_top_places(args.top)
        print(f"\n{'='*60}")
        print(f"TOP {len(places)} PLACES BY POPULARITY")
        print(f"{'='*60}")
        for p in places:
            print(f"#{p['stats']['popularity_rank']}: {p['name']} - {p['stats']['rating']}⭐ ({p['stats']['review_count']} reviews)")
        print(f"{'='*60}\n")
        return
    
    if not args.place_name:
        parser.error("place_name is required unless using --top")
    
    try:
        result = fetch_place_data(args.place_name)
        
        # Print result summary
        print("\n" + "=" * 60)
        print("RESULT SUMMARY")
        print("=" * 60)
        print(f"Place: {result['name']}")
        print(f"ID: {result['id']}")
        print(f"Cluster: {result['location']['cluster_zone']}")
        print(f"Rating: {result['stats']['rating']}⭐ ({result['stats']['review_count']} reviews)")
        print(f"Popularity Score: {result['stats']['popularity_score']}")
        print(f"Popularity Rank: #{result['stats']['popularity_rank']}")
        print(f"Tags: {', '.join(result['content']['tags'])}")
        print("=" * 60)
        
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

