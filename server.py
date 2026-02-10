"""
Kodaikanal Pipeline - Web Server
================================
Flask server that provides:
1. Frontend with Google Places Autocomplete
2. API endpoint to run the pipeline
3. API endpoint to view stored places
"""

import os
import sys
import json
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Import our pipeline
from fetch_place_data import fetch_place_data, load_master_json, get_top_places, get_maps_client, KODAIKANAL_CENTER

# Import the vector scorer (lazy load to avoid startup delay if not used)
ranker = None
def get_ranker():
    global ranker
    if ranker is None:
        from scorer import ItineraryRanker
        ranker = ItineraryRanker()
    return ranker


# Import the scheduler (lazy load)
scheduler = None
def get_scheduler():
    global scheduler
    if scheduler is None:
        from scheduler import ItineraryScheduler
        scheduler = ItineraryScheduler()
    return scheduler

load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173", 
            "https://100cr.cloud",
            "https://www.100cr.cloud"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Pass the Maps API key to the frontend
MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


@app.route('/')
def index():
    """Serve the main search page."""
    return render_template('index.html', maps_api_key=MAPS_API_KEY)


@app.route('/api/warmup', methods=['GET'])
def warmup():
    """Initialize the ranker model in background."""
    try:
        get_ranker()
        return jsonify({"success": True, "message": "Model warmed up"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/routes')
def cluster_routes():
    """Serve the cluster routes visualization."""
    return render_template('cluster_routes.html')


@app.route('/data/cluster_routes.json')
def get_cluster_routes_json():
    """Serve the cluster routes JSON data."""
    try:
        with open('data/cluster_routes.json', 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "cluster_routes.json not found"}), 404


@app.route('/core-route')
def core_route():
    """Serve the core route (golden loop) visualization."""
    return render_template('core_route.html')


@app.route('/data/core_route.json')
def get_core_route_json():
    """Serve the core route JSON data."""
    try:
        with open('data/core_route.json', 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "core_route.json not found. Run: python build_core_route.py"}), 404


@app.route('/api/places', methods=['GET'])
def get_places():
    """Get all stored places."""
    master = load_master_json()
    return jsonify(master)


@app.route('/api/places/top/<int:n>', methods=['GET'])
def get_top_n_places(n):
    """Get top N places by popularity."""
    places = get_top_places(n)
    return jsonify({"places": places, "count": len(places)})


@app.route('/api/places/autocomplete', methods=['GET'])
def places_autocomplete():
    """
    Autocomplete endpoint combining local DB + Google Maps.
    Returns suggestions with in_database flag.
    
    Query params:
        q: Search query (min 2 chars)
    
    Returns:
        {
            "suggestions": [
                {"id": "...", "name": "...", "cluster": "...", "in_database": true, "place_id": "..."},
                {"name": "...", "place_id": "...", "in_database": false}
            ]
        }
    """
    query = request.args.get('q', '').strip()
    
    if len(query) < 2:
        return jsonify({"suggestions": []})
    
    try:
        # 1. Search local database
        master = load_master_json()
        local_matches = [
            {
                "id": p.get("id"),
                "name": p.get("name"),
                "cluster": p.get("location", {}).get("cluster_zone", ""),
                "in_database": True,
                "place_id": p.get("google_place_id")
            }
            for p in master.get("places", [])
            if query.lower() in p.get("name", "").lower()
        ][:5]  # Cap at 5
        
        # Get place_ids already in database to filter Google results
        local_place_ids = {p.get("place_id") for p in local_matches if p.get("place_id")}
        all_db_place_ids = {p.get("google_place_id") for p in master.get("places", []) if p.get("google_place_id")}
        
        # 2. Query Google Maps Autocomplete
        gmaps = get_maps_client()
        autocomplete = gmaps.places_autocomplete(
            input_text=f"{query} Kodaikanal",
            location=KODAIKANAL_CENTER,
            radius=50000,
            types="establishment"
        )
        
        # 3. Filter out places already in DB
        google_suggestions = []
        for pred in autocomplete[:5]:
            place_id = pred.get("place_id")
            if place_id and place_id not in all_db_place_ids:
                # Clean up the description (remove ", India" etc)
                description = pred.get("description", "")
                # Remove common suffixes
                for suffix in [", India", ", Tamil Nadu, India", ", Kodaikanal, Tamil Nadu, India"]:
                    description = description.replace(suffix, "")
                
                google_suggestions.append({
                    "name": description,
                    "place_id": place_id,
                    "in_database": False
                })
        
        return jsonify({
            "suggestions": local_matches + google_suggestions
        })
        
    except Exception as e:
        print(f"Error in autocomplete: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"suggestions": [], "error": str(e)}), 500


# ===== EQUALIZER API (Scoring) =====

@app.route('/api/fetch-scored-places', methods=['POST'])
def fetch_scored_places():
    """
    Score all places with soft-gate filtering.
    Returns three sorted lists: by_popularity, by_similarity, and places (by final score).
    
    Request body:
    {
        "user_profile": {"interests": [...], "difficulty": "medium"},
        "weight": {"popularity": 0.4, "similarity": 0.6}
    }
    """
    try:
        data = request.get_json()
        
        user_profile = data.get('user_profile', {})
        weight = data.get('weight', {'popularity': 0.4, 'similarity': 0.6})
        
        # Validate
        if not user_profile.get('interests'):
            user_profile['interests'] = ['Nature', 'Sightseeing']  # Default interests
        
        # Get scorer
        scorer = get_ranker()
        result = scorer.score_places(user_profile, weight)
        
        return jsonify({
            "success": True,
            "places": result['places'],
            "by_popularity": result['by_popularity'],
            "by_similarity": result['by_similarity'],
            "user_profile": user_profile,
            "weight": weight
        })
        
    except Exception as e:
        print(f"Error in fetch-scored-places: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ===== TETRIS API (Scheduler) =====

@app.route('/api/build-itinerary', methods=['POST'])
def build_itinerary():
    """
    Build day-wise itinerary from selected places.
    
    Request body:
    {
        "selected_place_ids": ["pine-forest-kodaikanal", ...],
        "user_config": {
            "num_days": 3,
            "pace": "medium",
            "hotel_cluster": "Town Center"
        }
    }
    """
    try:
        data = request.get_json()
        
        selected_place_ids = data.get('selected_place_ids', [])
        user_config = data.get('user_config', {})
        
        # Validate
        if not selected_place_ids:
            return jsonify({"success": False, "error": "No places selected"}), 400
        
        # Set defaults
        user_config.setdefault('num_days', 3)
        user_config.setdefault('pace', 'medium')
        user_config.setdefault('hotel_cluster', 'Town Center')
        
        # Get scheduler
        itinerary_scheduler = get_scheduler()
        result = itinerary_scheduler.build_itinerary(selected_place_ids, user_config)
        
        return jsonify({
            "success": True,
            "days": result['days'],
            "user_config": user_config
        })
        
    except Exception as e:
        print(f"Error in build-itinerary: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/save-itinerary', methods=['POST'])
def save_itinerary():
    """
    Save itinerary to user's folder.
    
    Request body:
    {
        "user_name": "Atman",
        "trip_name": "Mar 21 - Mar 22",
        "itinerary": { days: [...], user_config: {...} }
    }
    """
    try:
        data = request.get_json()
        
        user_name = data.get('user_name', 'Guest')
        trip_name = data.get('trip_name', 'Trip')
        itinerary = data.get('itinerary', {})
        
        # Create filename from trip name
        safe_name = trip_name.replace(' ', '_').replace('/', '-')
        filename = f"{safe_name}_itinerary.json"
        
        # Ensure user folder exists
        user_folder = f"user_data/{user_name}"
        os.makedirs(user_folder, exist_ok=True)
        
        # Save itinerary
        filepath = f"{user_folder}/{filename}"
        with open(filepath, 'w') as f:
            json.dump({
                "trip_name": trip_name,
                "saved_at": datetime.now().isoformat(),
                "itinerary": itinerary
            }, f, indent=2)
        
        print(f"✅ Saved itinerary to {filepath}")
        
        return jsonify({
            "success": True,
            "filepath": filepath,
            "message": f"Itinerary saved to {filename}"
        })
        
    except Exception as e:
        print(f"Error saving itinerary: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/rebuild-forest-route', methods=['POST'])
def rebuild_forest_route():
    """
    Rebuild the Forest Circuit route using Google Maps API.
    Call this when new places are added to Forest Circuit cluster.
    """
    try:
        itinerary_scheduler = get_scheduler()
        new_route = itinerary_scheduler.rebuild_forest_route()
        
        return jsonify({
            "success": True,
            "message": "Forest Circuit route rebuilt",
            "route": new_route
        })
        
    except Exception as e:
        print(f"Error rebuilding Forest route: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/fetch', methods=['POST'])
def fetch_place():
    """Run the pipeline for a place."""
    data = request.get_json()
    place_name = data.get('place_name')
    
    if not place_name:
        return jsonify({"error": "place_name is required"}), 400
    
    try:
        result = fetch_place_data(place_name)
        return jsonify({
            "success": True,
            "place": result,
            "message": f"Successfully fetched data for {result['name']}"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/photo/<photo_reference>')
def get_photo(photo_reference):
    """Proxy Google Places photos to avoid CORS/referrer issues."""
    import requests
    from flask import Response
    
    if not MAPS_API_KEY:
        return jsonify({"error": "API key not configured"}), 500
    
    # Build Google Places Photo URL
    google_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo_reference}&key={MAPS_API_KEY}"
    
    try:
        # Fetch the image from Google
        response = requests.get(google_url, stream=True, timeout=10)
        
        if response.status_code == 200:
            # Stream the image back to the client
            return Response(
                response.iter_content(chunk_size=1024),
                content_type=response.headers.get('Content-Type', 'image/jpeg'),
                headers={
                    'Cache-Control': 'public, max-age=86400'  # Cache for 24 hours
                }
            )
        else:
            return jsonify({"error": "Failed to fetch photo"}), response.status_code
    except Exception as e:
        print(f"Error fetching photo {photo_reference}: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ===== USER DATA PERSISTENCE ENDPOINTS =====

import json
import re

USER_DATA_DIR = os.path.join(os.path.dirname(__file__), 'user_data')

def ensure_user_data_dir():
    """Ensure the user_data directory exists."""
    if not os.path.exists(USER_DATA_DIR):
        os.makedirs(USER_DATA_DIR)

def sanitize_filename(name):
    """Sanitize a string to be safe for use as a filename."""
    # Replace slashes and other unsafe characters
    safe = re.sub(r'[<>:"/\\|?*]', '-', name)
    return safe.strip()

@app.route('/api/dashboard/data', methods=['GET'])
def get_dashboard_data():
    """Get all saved dashboard data (users, trips) by scanning folders."""
    ensure_user_data_dir()
    
    users = []
    trips = []
    
    try:
        # Iterate over all items in user_data directory
        for user_folder in os.listdir(USER_DATA_DIR):
            user_path = os.path.join(USER_DATA_DIR, user_folder)
            
            # Check if it's a directory
            if os.path.isdir(user_path):
                # 1. Look for User Profile: {UserFolder}.json
                profile_path = os.path.join(user_path, f"{user_folder}.json")
                if os.path.exists(profile_path):
                    try:
                        with open(profile_path, 'r') as f:
                            user_data = json.load(f)
                            users.append(user_data)
                    except Exception as e:
                        print(f"Error reading profile {profile_path}: {e}")
                
                # 2. Look for Trips: All other .json files
                for file in os.listdir(user_path):
                    if file.endswith('.json') and file != f"{user_folder}.json":
                        trip_path = os.path.join(user_path, file)
                        try:
                            with open(trip_path, 'r') as f:
                                trip_data = json.load(f)
                                trips.append(trip_data)
                        except Exception as e:
                            print(f"Error reading trip {trip_path}: {e}")
                            
        return jsonify({
            "users": users, 
            "trips": trips, 
            # Default to first user if exists
            "currentUserId": users[0]['user_id'] if users else None, 
            "activeTripId": None
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dashboard/data', methods=['POST'])
def save_dashboard_data():
    """Save all dashboard data (users, trips) to a file."""
    ensure_user_data_dir()
    data_file = os.path.join(USER_DATA_DIR, 'dashboard_state.json')
    
    try:
        data = request.get_json()
        with open(data_file, 'w') as f:
            json.dump(data, f, indent=2)
        return jsonify({"success": True, "message": "Dashboard data saved"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/user/<user_name>/profile', methods=['POST'])
def save_user_profile(user_name):
    """Save a user profile to a file. Folder and file named after user."""
    ensure_user_data_dir()
    
    try:
        data = request.get_json()
        safe_name = sanitize_filename(user_name)
        user_dir = os.path.join(USER_DATA_DIR, safe_name)
        if not os.path.exists(user_dir):
            os.makedirs(user_dir)
        
        # Profile file named after user: Atman.json
        profile_file = os.path.join(user_dir, f'{safe_name}.json')
        with open(profile_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        return jsonify({"success": True, "message": f"Profile saved for user {user_name}", "path": profile_file})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/user/<user_name>/trip', methods=['POST'])
def save_trip(user_name):
    """Save a trip to a file. File named after trip name (date range)."""
    ensure_user_data_dir()
    
    try:
        data = request.get_json()
        safe_user = sanitize_filename(user_name)
        user_dir = os.path.join(USER_DATA_DIR, safe_user)
        if not os.path.exists(user_dir):
            os.makedirs(user_dir)
        
        # Trip file named after trip name (which is the date range): "Jan 25-27, 2026.json"
        trip_name = data.get('name', 'New Trip')
        safe_trip_name = sanitize_filename(trip_name)
        trip_file = os.path.join(user_dir, f'{safe_trip_name}.json')
        
        # Delete old trip file if name changed (optional cleanup)
        old_name = data.get('old_name')
        if old_name and old_name != trip_name:
            old_safe_name = sanitize_filename(old_name)
            old_file = os.path.join(user_dir, f'{old_safe_name}.json')
            if os.path.exists(old_file):
                os.remove(old_file)
        
        with open(trip_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        return jsonify({"success": True, "message": f"Trip saved: {trip_name}", "path": trip_file})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ===== ITINERARY GENERATION ENDPOINT =====

@app.route('/api/generate-itinerary', methods=['POST'])
def generate_itinerary():
    """Generate a ranked itinerary based on user profile and trip context."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        user_profile = data.get('user_profile', {})
        trip_context = data.get('trip_context', {})
        
        # Validate required fields
        if not user_profile:
            return jsonify({"error": "user_profile is required"}), 400
        
        # Get the ranker and generate rankings
        itinerary_ranker = get_ranker()
        ranked_places = itinerary_ranker.rank_places(user_profile, trip_context)
        
        return jsonify({
            "success": True,
            "places": ranked_places,
            "count": len(ranked_places),
            "filters_applied": {
                "mobility": user_profile.get('mobility', 'medium'),
                "interests": user_profile.get('interests', [])
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/rank-places', methods=['POST'])
def rank_places():
    """
    Transparent ranking endpoint (V2).
    Returns ALL filtered places with detailed score breakdown.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        user_profile = data.get('user_profile', {})
        trip_context = data.get('trip_context', {})
        
        # Get the ranker and generate rankings
        itinerary_ranker = get_ranker()
        ranked_places = itinerary_ranker.rank_places(user_profile, trip_context)
        
        # Format response with debug info visible
        response_places = []
        for item in ranked_places:
            place = item['place_data']
            debug = item['debug']
            response_places.append({
                'id': place.get('id'),
                'name': place.get('name'),
                'cluster': place.get('location', {}).get('cluster_zone', ''),
                'difficulty': place.get('logic', {}).get('difficulty', 'Easy'),
                'popularity_rank': debug['popularity_rank'],
                'scores': {
                    'similarity': debug['sim_score'],
                    'popularity': debug['pop_score'],
                    'final': debug['final_score']
                },
                'tags': place.get('content', {}).get('tags', [])
            })
        
        return jsonify({
            "success": True,
            "places": response_places,
            "count": len(response_places),
            "user_interests": user_profile.get('interests', []),
            "user_difficulty": user_profile.get('difficulty', 'medium')
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ===== AI CHAT MODE ENDPOINTS =====

# Session management for AI chat
import uuid
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(24).hex())

# Lazy load AI engine instances (per session)
_ai_engine_instances = {}

def get_ai_engine(session_id: str):
    """Get or create AI engine for a session."""
    if session_id not in _ai_engine_instances:
        from services.trip_llm_engine import TripLLMEngine
        _ai_engine_instances[session_id] = TripLLMEngine()
    return _ai_engine_instances[session_id]


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """
    Handle AI chat messages.
    
    Request JSON:
        {"message": "user message", "session_id": "optional session id"}
    
    Response JSON:
        {"status": "success", "response": "...", "ui_component": {...}}
    """
    try:
        from flask import session
        
        data = request.get_json()
        
        if not data or "message" not in data:
            return jsonify({
                "status": "error",
                "response": "No message provided"
            }), 400
        
        user_message = data["message"].strip()
        
        if not user_message:
            return jsonify({
                "status": "error",
                "response": "Empty message"
            }), 400
        
        # Get or create session ID
        session_id = data.get("session_id")
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Get engine for this session
        engine = get_ai_engine(session_id)
        
        # Get response from LLM
        result = engine.chat(user_message)
        
        return jsonify({
            "status": "success",
            "response": result.get("text", ""),
            "ui_component": result.get("ui_hint"),
            "session_id": session_id,
            "session_state": engine.get_session_state()
        })
        
    except ValueError as e:
        return jsonify({
            "status": "error",
            "response": f"Configuration error: {str(e)}"
        }), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "response": "I apologize, but I encountered an error. Please try again."
        }), 500


@app.route('/api/ai/voice', methods=['POST'])
def ai_voice():
    """
    Handle voice messages from the frontend.
    
    Request: multipart/form-data with 'audio' file
    
    Response JSON:
        {
            "user_text": "transcribed user speech",
            "agent_text": "agent response",
            "audio_base64": "base64 encoded audio or null",
            "ui_component": {...}
        }
    """
    try:
        # Check for audio file
        if 'audio' not in request.files:
            return jsonify({
                "status": "error",
                "message": "No audio file provided"
            }), 400
        
        audio_file = request.files['audio']
        session_id = request.form.get('session_id', str(uuid.uuid4()))
        
        # Import voice service
        from services import groq_voice
        
        print("🎤 Receiving voice input...")
        
        # Step 1: Transcribe audio (STT)
        print("🔊 Transcribing audio with Whisper...")
        user_text = groq_voice.transcribe_audio(audio_file)
        print(f"✅ Transcribed: '{user_text[:50]}...'")
        
        # Step 2: Get engine for this session
        engine = get_ai_engine(session_id)
        
        # Step 3: Process with LLM
        print("🧠 Processing with AI...")
        result = engine.chat(user_text)
        agent_text = result.get("text", "")
        ui_component = result.get("ui_hint")
        print("✅ AI response generated")
        
        # Step 4: Generate speech (TTS) - graceful failure
        print("🔊 Generating speech with Orpheus TTS...")
        audio_bytes = groq_voice.generate_audio(agent_text)
        
        audio_base64 = None
        if audio_bytes:
            audio_base64 = groq_voice.audio_to_base64(audio_bytes)
            print("✅ Audio generated successfully")
        else:
            print("⚠️ TTS unavailable, text-only response")
        
        return jsonify({
            "status": "success",
            "user_text": user_text,
            "agent_text": agent_text,
            "ui_component": ui_component,
            "audio_base64": audio_base64,
            "session_id": session_id,
            "session_state": engine.get_session_state()
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": f"Voice processing error: {str(e)}"
        }), 500


@app.route('/api/ai/reset', methods=['POST'])
def ai_reset():
    """Reset the AI conversation."""
    try:
        data = request.get_json() or {}
        session_id = data.get("session_id")
        
        if session_id and session_id in _ai_engine_instances:
            del _ai_engine_instances[session_id]
        
        return jsonify({
            "status": "success",
            "message": "Conversation reset"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/api/ai/state', methods=['GET'])
def ai_state():
    """Get the current session state."""
    try:
        session_id = request.args.get("session_id")
        
        if not session_id or session_id not in _ai_engine_instances:
            return jsonify({
                "status": "success",
                "session_state": None,
                "message": "No active session"
            })
        
        engine = _ai_engine_instances[session_id]
        return jsonify({
            "status": "success",
            "session_state": engine.get_session_state()
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("Kodaikanal Intelligence Pipeline - Web Interface")
    print("="*60)
    print(f"API Key loaded: {'✅' if MAPS_API_KEY else '❌ Missing!'}")
    print(f"Gemini API: {'✅' if os.getenv('GEMINI_API_KEY') else '❌ Missing!'}")
    print(f"Groq API: {'✅' if os.getenv('GROQ_API_KEY') else '⚠️ Missing (voice disabled)'}")
    print("Starting server at http://localhost:5001")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5001)
