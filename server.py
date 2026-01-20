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
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Import our pipeline
from fetch_place_data import fetch_place_data, load_master_json, get_top_places

load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# Pass the Maps API key to the frontend
MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


@app.route('/')
def index():
    """Serve the main search page."""
    return render_template('index.html', maps_api_key=MAPS_API_KEY)


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
    """Get all saved dashboard data (users, trips)."""
    ensure_user_data_dir()
    data_file = os.path.join(USER_DATA_DIR, 'dashboard_state.json')
    
    if os.path.exists(data_file):
        try:
            with open(data_file, 'r') as f:
                return jsonify(json.load(f))
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"users": [], "trips": [], "currentUserId": None, "activeTripId": None})


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


if __name__ == '__main__':
    print("\n" + "="*60)
    print("Kodaikanal Intelligence Pipeline - Web Interface")
    print("="*60)
    print(f"API Key loaded: {'✅' if MAPS_API_KEY else '❌ Missing!'}")
    print("Starting server at http://localhost:5001")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5001)
