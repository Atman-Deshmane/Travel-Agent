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


if __name__ == '__main__':
    print("\n" + "="*60)
    print("Kodaikanal Intelligence Pipeline - Web Interface")
    print("="*60)
    print(f"API Key loaded: {'✅' if MAPS_API_KEY else '❌ Missing!'}")
    print("Starting server at http://localhost:5000")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5000)
