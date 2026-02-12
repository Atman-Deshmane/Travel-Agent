"""
Transparent Vector Scorer for Kodaikanal Itinerary Generation (V3 - Gemini ETL)
=================================================================================
Pure Reader scorer that loads pre-computed Gemini embeddings from disk.
Only makes a single API call per scoring request: embedding the user's query.

Architecture:
- Build time: scripts/sync_embeddings.py generates data/place_embeddings.json
- Run time:   This file reads the cache and embeds the user query via Gemini API

Features:
- Lightweight: No heavy ML models (no sentence-transformers, no torch)
- Self-healing: Auto-reloads places JSON when file changes
- Transparent scoring: Configurable popularity/similarity weights
- Debug output: Full score breakdown for each place
"""

import os
import json
import numpy as np
from typing import Dict, List, Any, Optional
from scipy.spatial.distance import cosine
from google import genai
from dotenv import load_dotenv

load_dotenv()
API_BASE_URL = os.getenv('API_BASE_URL', 'http://127.0.0.1:5001')


class ItineraryRanker:
    """
    Pure ranker that returns ALL valid places with transparent score breakdown.
    
    Scoring Formula:
    - Similarity (0-100): Cosine similarity mapped from [-1,1] to [0,100]
    - Popularity (0-100): 100 - ((rank - 1) * 2), capped at 0, Rank <= 3 forced to 100
    - Final: (Sim * sim_weight) + (Pop * pop_weight)
    """
    
    # User Difficulty Level -> Place Difficulties they can access
    DIFFICULTY_ACCESS_MAP = {
        'high': ['Easy', 'Moderate', 'Hard'],
        'medium': ['Easy', 'Moderate'],
        'low': ['Easy']
    }

    EMBEDDING_MODEL = "gemini-embedding-001"
    
    def __init__(self, places_path: str = 'data/kodaikanal_places.json'):
        """Initialize the ranker by loading places and pre-computed embeddings."""
        self.places_path = places_path
        self.embeddings_path = 'data/place_embeddings.json'
        
        # Configure Gemini client (for user query embedding only)
        api_key = (
            os.getenv("GEMINI_API_KEY") or 
            os.getenv("GEMINI_API_KEY_CAPSTONE_1") or 
            os.getenv("GEMINI_API_KEY_NextLeap")
        )
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        self.client = genai.Client(api_key=api_key)
        
        # In-memory cache
        self.places: List[Dict] = []
        self.embeddings: Dict[str, List[float]] = {}
        self.last_load_time: float = 0
        
        # Pre-load on init
        self._check_and_reload()
        print("✅ ItineraryRanker V3 initialized (Gemini ETL Mode - Pure Reader)")
    
    def _check_and_reload(self) -> bool:
        """Check if places JSON has changed and reload if necessary."""
        try:
            if not os.path.exists(self.places_path):
                print(f"⚠️ Places file not found: {self.places_path}")
                return False
            
            # Check file modification time
            file_mtime = os.path.getmtime(self.places_path)
            
            if file_mtime > self.last_load_time:
                print(f"🔄 Reloading places from {self.places_path}...")
                
                # Load places JSON
                with open(self.places_path, 'r') as f:
                    data = json.load(f)
                
                self.places = data.get('places', [])
                
                if not self.places:
                    print("⚠️ No places found in JSON")
                    return False
                
                # Load pre-computed embeddings
                if os.path.exists(self.embeddings_path):
                    with open(self.embeddings_path, 'r') as f:
                        self.embeddings = json.load(f)
                    print(f"📦 Loaded {len(self.embeddings)} pre-computed embeddings")
                else:
                    self.embeddings = {}
                    print("⚠️ No embeddings cache found. Run: python scripts/sync_embeddings.py")
                
                self.last_load_time = file_mtime
                
                # Report coverage
                place_ids = {p.get('id') for p in self.places if p.get('id')}
                cached_ids = set(self.embeddings.keys())
                missing = place_ids - cached_ids
                if missing:
                    print(f"  ⚠️ {len(missing)} places missing embeddings (will score as 0)")
                
                print(f"✅ Loaded {len(self.places)} places")
                return True
                
        except Exception as e:
            print(f"❌ Error loading places: {e}")
            return False

    def _clean_image_url(self, url):
        """Clean Googleusercontent URLs to remove specific formatting params."""
        if not url:
            return None
        if 'googleusercontent.com' in url and '=' in url:
            return url.split('=')[0] + '=w800'
        return url
    
    def _filter_by_difficulty(self, place: dict, user_difficulty: str) -> bool:
        """Check if user's difficulty level allows access to this place."""
        place_difficulty = place.get('logic', {}).get('difficulty', 'Easy')
        allowed_difficulties = self.DIFFICULTY_ACCESS_MAP.get(user_difficulty, ['Easy'])
        return place_difficulty in allowed_difficulties
    
    def _filter_by_duration(self, place: Dict, max_minutes: int = 180) -> bool:
        """Check if place can be visited within max time (default 3 hours)."""
        avg_time = place.get('logic', {}).get('avg_time_spent_minutes', 60)
        return avg_time <= max_minutes
    
    def _calculate_popularity_score(self, rank: int) -> float:
        """
        Calculate popularity score from rank.
        
        Formula: 100 - ((rank - 1) * 2)
        - Rank 1-3: forced to 100
        - Rank 50+: capped at 0
        """
        if rank <= 3:
            return 100.0
        
        score = 100 - ((rank - 1) * 2)
        return max(0.0, score)
    
    def _check_mobility_flag(self, place: dict, user_difficulty: str) -> Optional[str]:
        """Check if place difficulty exceeds user's comfort level. Returns flag or None."""
        place_difficulty = place.get('logic', {}).get('difficulty', 'Easy')
        
        comfort_map = {
            'low': ['Easy'],
            'medium': ['Easy', 'Moderate'],
            'high': ['Easy', 'Moderate', 'Hard']
        }
        
        allowed = comfort_map.get(user_difficulty, ['Easy', 'Moderate', 'Hard'])
        
        if place_difficulty not in allowed:
            return "High Physical Effort"
        return None

    def _embed_user_query(self, query: str) -> Optional[List[float]]:
        """Embed a user query string via Gemini API."""
        try:
            result = self.client.models.embed_content(
                model=self.EMBEDDING_MODEL,
                contents=query,
                config={"task_type": "RETRIEVAL_QUERY"}
            )
            return result.embeddings[0].values
        except Exception as e:
            print(f"❌ Error embedding user query: {e}")
            return None
    
    def score_places(
        self, 
        user_profile: Dict[str, Any], 
        weight: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Score ALL places with soft-gate filtering (flags, not deletions).
        
        Args:
            user_profile: Contains interests (list or str), difficulty (str)
            weight: Optional dict with 'popularity' and 'similarity' weights (default 0.5/0.5)
            
        Returns:
            Dict with 'places' (all scored), 'by_popularity', 'by_similarity' lists
        """
        # Ensure data is fresh
        self._check_and_reload()
        
        if not self.places:
            print("⚠️ No places data available")
            return {"places": [], "by_popularity": [], "by_similarity": []}
        
        # Extract user preferences
        interests = user_profile.get('interests', [])
        difficulty = user_profile.get('difficulty', 'medium')
        
        # Set default weights
        if weight is None:
            weight = {'popularity': 0.5, 'similarity': 0.5}
        pop_weight = weight.get('popularity', 0.5)
        sim_weight = weight.get('similarity', 0.5)
        
        # Build user query and embed it
        if isinstance(interests, list):
            interest_text = ' '.join(interests)
        else:
            interest_text = str(interests)
        
        tags_text = user_profile.get('tags', '')
        if isinstance(tags_text, list):
            tags_text = ' '.join(tags_text)
            
        query = f"{interest_text} {tags_text}".strip()
        
        if query:
            user_vector = self._embed_user_query(query)
        else:
            user_vector = None
        
        # ========== SCORE ALL PLACES (NO FILTERING) ==========
        scored_places = []
        
        for idx, place in enumerate(self.places):
            # Skip places marked as excluded from itinerary
            if place.get('metadata', {}).get('itinerary_include') is False:
                continue
            
            place_id = place.get('id')
            
            # === SIMILARITY SCORE (0-100) ===
            if user_vector is not None and place_id and place_id in self.embeddings:
                place_vector = self.embeddings[place_id]
                cos_sim = 1 - cosine(user_vector, place_vector)
                sim_score = ((cos_sim + 1) / 2) * 100  # Map [-1,1] -> [0,100]
            elif user_vector is not None:
                sim_score = 0.0
            else:
                sim_score = 50.0  # Neutral if no interests
            
            # === POPULARITY SCORE (0-100) ===
            pop_rank = place.get('stats', {}).get('popularity_rank', 50)
            pop_score = self._calculate_popularity_score(pop_rank)
            
            # === FINAL SCORE (weighted) ===
            final_score = (sim_score * sim_weight) + (pop_score * pop_weight)
            
            # === SOFT-GATE FLAGS ===
            flags = []
            mobility_flag = self._check_mobility_flag(place, difficulty)
            if mobility_flag:
                flags.append(mobility_flag)
                
            if place.get('location', {}).get('cluster_zone') == "Outskirts":
                flags.append("Located in Outskirts")
            
            scored_places.append({
                'id': place.get('id'),
                'name': place.get('name'),
                'cluster': place.get('location', {}).get('cluster_zone', ''),
                'nearest_cluster': place.get('location', {}).get('nearest_cluster'),
                'image_url': (
                    f"{API_BASE_URL}/api/photo/{place.get('content', {}).get('photo_reference')}"
                    if place.get('content', {}).get('photo_reference')
                    else self._clean_image_url(place.get('content', {}).get('hero_image_url'))
                    if place.get('content', {}).get('hero_image_url') and 
                       place.get('content', {}).get('hero_image_url', '').startswith('http') and
                       any(ext in place.get('content', {}).get('hero_image_url', '').lower() for ext in ['.jpg', '.jpeg', '.png', '.webp', 'googleusercontent', 'wikimedia'])
                    else ''
                ),
                'tags': place.get('content', {}).get('tags', []),
                'rating': place.get('stats', {}).get('rating'),
                'review_count': place.get('stats', {}).get('review_count', 0),
                'difficulty': place.get('logic', {}).get('difficulty', 'Easy'),
                'avg_time_minutes': place.get('logic', {}).get('avg_time_spent_minutes', 60),
                'scores': {
                    'pop': float(round(pop_score, 2)),
                    'sim': float(round(sim_score, 2))
                },
                'final_score': float(round(final_score, 2)),
                'popularity_rank': int(pop_rank),
                'flags': flags,
                'place_data': place
            })
        
        # Create sorted views
        by_popularity = sorted(scored_places, key=lambda x: x['scores']['pop'], reverse=True)
        by_similarity = sorted(scored_places, key=lambda x: x['scores']['sim'], reverse=True)
        by_final = sorted(scored_places, key=lambda x: x['final_score'], reverse=True)
        
        print(f"📊 Scored {len(scored_places)} places (Gemini ETL mode)")
        flagged_count = sum(1 for p in scored_places if p['flags'])
        if flagged_count:
            print(f"  ⚠️ {flagged_count} places flagged with warnings")
        
        return {
            "places": by_final,
            "by_popularity": by_popularity,
            "by_similarity": by_similarity
        }
    
    def rank_places(
        self, 
        user_profile: Dict[str, Any], 
        trip_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Legacy method - now calls score_places and returns places list.
        Kept for backward compatibility with existing code.
        """
        result = self.score_places(user_profile)
        return [
            {
                'place_data': p['place_data'],
                'debug': {
                    'sim_score': p['scores']['sim'],
                    'pop_score': p['scores']['pop'],
                    'final_score': p['final_score'],
                    'popularity_rank': p['popularity_rank']
                }
            }
            for p in result['places']
            if not p['flags']  # Legacy behavior: filter out flagged places
        ]


# Singleton instance
_ranker_instance: Optional[ItineraryRanker] = None


def get_ranker() -> ItineraryRanker:
    """Get or create the singleton ranker instance."""
    global _ranker_instance
    if _ranker_instance is None:
        _ranker_instance = ItineraryRanker()
    return _ranker_instance


if __name__ == '__main__':
    # Quick test
    ranker = ItineraryRanker()
    
    test_profile = {
        'interests': ['Nature', 'Trekking', 'History', 'Adventure', 'Spiritual', 'Relaxation', 'Cloud'],
        'mobility': 'high'
    }
    
    results = ranker.rank_places(test_profile)
    
    print("\n" + "="*80)
    print("TOP 10 RANKED PLACES (Debug Mode)")
    print("="*80)
    for i, item in enumerate(results[:10], 1):
        place = item['place_data']
        debug = item['debug']
        print(f"{i:2}. {place['name']:<30} | Sim: {debug['sim_score']:5.1f} | Pop: {debug['pop_score']:5.1f} | Final: {debug['final_score']:5.1f}")
