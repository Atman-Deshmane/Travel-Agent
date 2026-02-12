"""
Trip Planning LLM Engine
=========================
Gemini AI integration with function calling for conversational trip planning.
Guides users through: dates → preferences → place selection → itinerary generation.
"""

import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from google import genai
from google.genai import types

# System prompt for the trip planning assistant
def get_system_prompt():
    current_date = datetime.now().strftime("%B %d, %Y")
    return f"""You are Koda, a friendly and knowledgeable Kodaikanal Trip Planning Assistant. Today is {current_date}.

Your role is to help users plan their perfect trip to Kodaikanal, a beautiful hill station in Tamil Nadu, India.

## YOUR PERSONALITY
- Warm, enthusiastic, and helpful
- Share brief interesting facts about places when relevant
- Keep responses concise but engaging
- Use emojis sparingly to add warmth (1-2 per message max)

## IMPORTANT: The user has already seen an initial greeting asking for their name.
- The first thing you receive from the user will typically be their name or a greeting with their name.
- If they provide their name, IMMEDIATELY call `save_trip_context` with their name, then proceed to ask about dates.
- If they don't provide a name, politely ask for it before proceeding.

## CONVERSATION FLOW (Follow this order)

### STEP 1: COLLECT NAME
- The user's first message may contain their name (e.g., "I'm Atman" or just "Atman")
- Call `save_trip_context` with their name (user_name field)
- Acknowledge their name warmly and move to dates

### STEP 2: DATES
- Ask for their trip dates (when are they visiting?)
- Once dates are provided, call `save_trip_context` with the dates

### STEP 3: GROUP & LOGISTICS
- Ask about their travel group (solo, couple, family with kids/elders, friends)
- Ask about their pace preference (relaxed/chill, moderate/balanced, or packed/adventure)
- Ask about their MOBILITY level: Are they comfortable with treks and high-physical-effort activities? (high mobility = okay with treks, medium = moderate walks, low = prefer easy access spots)
- Call `save_trip_context` to update with group, pace, and mobility_level info

### STEP 4: INTERESTS
- Ask what kind of experiences they're looking for
- Suggest categories: Nature/Viewpoints, Peaceful spots, Adventure/Trekking, Cafes/Food, Religious sites, Photography spots
- Once they share interests, call `save_trip_context` with interests

### STEP 5: FETCH RECOMMENDATIONS
- After collecting preferences, call `fetch_ranked_places` to get personalized recommendations
- Present the top 10-15 places conversationally, grouped by category
- Explain briefly why each is recommended for them
- Ask which ones they'd like to include

### STEP 6: BUILD ITINERARY
- Once user confirms their selections (or says "all" / "these are good"), call `build_itinerary`
- Present the day-wise itinerary in a friendly, narrative format
- Highlight the flow of each day, travel times, and lunch breaks
- Ask if they want to make any changes

### STEP 7: SAVE & WRAP UP
- If user is happy, call `save_itinerary` to persist
- Provide a summary and wish them a great trip!

## IMPORTANT RULES
1. ALWAYS use tools to save data - never assume data is saved without calling the tool
2. ALWAYS save the user's name first - this is required to create their data folder
3. Be conversational - don't dump all questions at once
4. If user provides multiple pieces of info at once, process them all
5. Handle changes gracefully - user can go back and modify earlier choices
6. If user seems unsure, offer suggestions based on common preferences
7. For dates, accept natural language ("next weekend", "March 21-22") and convert to ISO format

## HANDLING EDGE CASES
- If user doesn't provide a name, gently ask for it (we need it to save their trip)
- If user hasn't decided on dates yet, gently encourage them but offer to continue if they want general info
- If user wants to skip preferences, use sensible defaults (medium pace, nature + sightseeing interests)
- If no places match their filters, suggest broadening criteria

Remember: You're not just collecting data - you're crafting a memorable experience!
"""


class TripLLMEngine:
    """
    LLM Engine that manages conversation with Gemini and handles function calling
    for trip planning.
    """

    def __init__(self):
        """Initialize the Gemini client and model."""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key.startswith("your_"):
            # Try alternate key names
            api_key = os.getenv("GEMINI_API_KEY_CAPSTONE_1")
        if not api_key or api_key.startswith("your_"):
            api_key = os.getenv("GEMINI_API_KEY_NextLeap")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set. Please set GEMINI_API_KEY or GEMINI_API_KEY_CAPSTONE_1 in .env")

        self.client = genai.Client(api_key=api_key)
        self.model_id = "gemini-3-flash-preview"

        # Build function declarations
        self.tools = [types.Tool(function_declarations=self._build_function_declarations())]

        # Conversation history
        self.conversation_history: List[types.Content] = []
        
        # Session state for tracking progress
        self.session_state = {
            "user_name": None,
            "trip_id": None,
            "dates": {"from": None, "to": None},
            "group_type": None,
            "pace": None,
            "interests": [],
            "selected_place_ids": [],
            "itinerary": None
        }

    def _build_function_declarations(self) -> List[types.FunctionDeclaration]:
        """Build all function declarations for the LLM."""
        
        save_trip_context = types.FunctionDeclaration(
            name="save_trip_context",
            description="Save or update trip context including dates, group type, pace, and interests. Call this whenever user provides new trip information.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "user_name": types.Schema(
                        type=types.Type.STRING,
                        description="User's name (optional, defaults to 'Guest')"
                    ),
                    "date_from": types.Schema(
                        type=types.Type.STRING,
                        description="Trip start date in YYYY-MM-DD format"
                    ),
                    "date_to": types.Schema(
                        type=types.Type.STRING,
                        description="Trip end date in YYYY-MM-DD format"
                    ),
                    "group_type": types.Schema(
                        type=types.Type.STRING,
                        description="Type of travel group: 'solo', 'couple', 'family', or 'friends'"
                    ),
                    "has_kids": types.Schema(
                        type=types.Type.BOOLEAN,
                        description="Whether the group includes children"
                    ),
                    "has_elders": types.Schema(
                        type=types.Type.BOOLEAN,
                        description="Whether the group includes elderly members"
                    ),
                    "pace": types.Schema(
                        type=types.Type.STRING,
                        description="Trip pace: 'chill' (slow, 3 places/day), 'balanced' (medium, 5 places/day), or 'packed' (fast, 8 places/day)"
                    ),
                    "mobility_level": types.Schema(
                        type=types.Type.STRING,
                        description="Physical mobility level: 'high' (comfortable with treks/hikes), 'medium' (moderate walks ok), 'low' (prefer easy access spots)"
                    ),
                    "interests": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description="List of interests like 'Nature', 'Viewpoints', 'Cafes', 'Adventure', 'Peace', 'Photography', 'Religious'"
                    )
                },
                required=[]
            )
        )

        fetch_ranked_places = types.FunctionDeclaration(
            name="fetch_ranked_places",
            description="Fetch and rank places based on user's interests and preferences. Returns personalized list of recommended places.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "interests": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description="User's interests for similarity scoring"
                    ),
                    "difficulty": types.Schema(
                        type=types.Type.STRING,
                        description="Mobility level: 'high', 'medium', or 'low' (based on elders/kids in group)"
                    ),
                    "limit": types.Schema(
                        type=types.Type.INTEGER,
                        description="Maximum number of places to return (default 15)"
                    )
                },
                required=[]
            )
        )

        select_places = types.FunctionDeclaration(
            name="select_places",
            description="Mark places as selected for the itinerary. Call when user confirms which places they want to visit.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "place_ids": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description="List of place IDs to include in itinerary"
                    ),
                    "action": types.Schema(
                        type=types.Type.STRING,
                        description="'add' to add places, 'remove' to remove, 'set' to replace all"
                    )
                },
                required=["place_ids"]
            )
        )

        build_itinerary = types.FunctionDeclaration(
            name="build_itinerary",
            description="Generate a day-wise itinerary from selected places. Uses the Tetris scheduling engine.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "place_ids": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description="List of place IDs to schedule (if not provided, uses previously selected places)"
                    )
                },
                required=[]
            )
        )

        save_itinerary = types.FunctionDeclaration(
            name="save_itinerary",
            description="Save the final itinerary to the user's folder for persistence.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "confirm": types.Schema(
                        type=types.Type.BOOLEAN,
                        description="Confirmation flag to save"
                    )
                },
                required=[]
            )
        )

        return [
            save_trip_context,
            fetch_ranked_places,
            select_places,
            build_itinerary,
            save_itinerary
        ]

    def _execute_function(self, function_name: str, function_args: Dict[str, Any]) -> Any:
        """
        Execute a function based on its name and arguments.
        """
        print(f"🔧 Executing function: {function_name} with args: {function_args}")

        if function_name == "save_trip_context":
            return self._save_trip_context(**function_args)
        elif function_name == "fetch_ranked_places":
            return self._fetch_ranked_places(**function_args)
        elif function_name == "select_places":
            return self._select_places(**function_args)
        elif function_name == "build_itinerary":
            return self._build_itinerary(**function_args)
        elif function_name == "save_itinerary":
            return self._save_itinerary(**function_args)
        else:
            return {"error": f"Unknown function: {function_name}"}

    def _save_trip_context(self, **kwargs) -> Dict[str, Any]:
        """Save trip context to session state and disk."""
        # Update session state
        if kwargs.get("user_name"):
            self.session_state["user_name"] = kwargs["user_name"]
        if kwargs.get("date_from"):
            self.session_state["dates"]["from"] = kwargs["date_from"]
        if kwargs.get("date_to"):
            self.session_state["dates"]["to"] = kwargs["date_to"]
        if kwargs.get("group_type"):
            self.session_state["group_type"] = kwargs["group_type"]
        if kwargs.get("has_elders"):
            self.session_state["has_elders"] = kwargs["has_elders"]
        if kwargs.get("has_kids"):
            self.session_state["has_kids"] = kwargs["has_kids"]
        if kwargs.get("pace"):
            self.session_state["pace"] = kwargs["pace"]
        if kwargs.get("mobility_level"):
            self.session_state["mobility_level"] = kwargs["mobility_level"]
        if kwargs.get("interests"):
            self.session_state["interests"] = kwargs["interests"]
        
        # Calculate num_days if dates are set
        num_days = None
        if self.session_state["dates"]["from"] and self.session_state["dates"]["to"]:
            try:
                from_date = datetime.fromisoformat(self.session_state["dates"]["from"])
                to_date = datetime.fromisoformat(self.session_state["dates"]["to"])
                num_days = (to_date - from_date).days + 1
            except:
                pass
        
        # Persist to disk if we have a user name
        user_name = self.session_state.get("user_name")
        if user_name:
            try:
                import re
                # Sanitize folder name
                safe_name = re.sub(r'[<>:"/\\|?*]', '-', user_name).strip()
                user_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'user_data', safe_name)
                os.makedirs(user_dir, exist_ok=True)
                
                # Build user profile JSON
                profile_data = {
                    "user_id": f"ai-{safe_name.lower()}",
                    "name": user_name,
                    "avatar_color": f"hsl({hash(user_name) % 360}, 70%, 60%)",
                    "generated_at": datetime.now().isoformat(),
                    "defaults": {
                        "interests": {"value": self.session_state.get("interests", []), "required": True},
                        "pace": {"value": self.session_state.get("pace", "balanced"), "required": False},
                        "mobility": {"value": "low" if self.session_state.get("has_elders") else "medium", "required": False}
                    }
                }
                
                # Save profile
                profile_path = os.path.join(user_dir, f"{safe_name}.json")
                with open(profile_path, 'w') as f:
                    import json
                    json.dump(profile_data, f, indent=2)
                print(f"✅ Saved user profile to {profile_path}")
                
            except Exception as e:
                print(f"⚠️ Failed to persist user profile: {e}")

        return {
            "status": "success",
            "message": f"Trip context saved{' for ' + user_name if user_name else ''}",
            "current_state": {
                "user_name": self.session_state.get("user_name"),
                "dates": self.session_state["dates"],
                "num_days": num_days,
                "group_type": self.session_state["group_type"],
                "pace": self.session_state["pace"],
                "interests": self.session_state["interests"]
            }
        }

    def _fetch_ranked_places(self, **kwargs) -> Dict[str, Any]:
        """Fetch ranked places directly from the scorer module with pace-based limits."""
        interests = kwargs.get("interests") or self.session_state.get("interests") or ["Nature", "Sightseeing"]
        difficulty = kwargs.get("difficulty", "medium")
        
        # Calculate limit based on pace and num_days
        pace = self.session_state.get("pace", "balanced")
        num_days = 2  # default
        if self.session_state["dates"]["from"] and self.session_state["dates"]["to"]:
            try:
                from_date = datetime.fromisoformat(self.session_state["dates"]["from"])
                to_date = datetime.fromisoformat(self.session_state["dates"]["to"])
                num_days = max(1, (to_date - from_date).days + 1)
            except:
                pass
        
        # Pace-based places per day: chill=3, balanced=5, packed=8
        pace_to_ppd = {"chill": 3, "slow": 3, "balanced": 5, "medium": 5, "packed": 8, "fast": 8}
        places_per_day = pace_to_ppd.get(pace, 5)
        limit = places_per_day * num_days
        
        # Map difficulty based on mobility_level or group composition
        mobility_level = self.session_state.get("mobility_level")
        if mobility_level:
            difficulty = mobility_level  # high, medium, low maps directly
        elif self.session_state.get("has_elders"):
            difficulty = "low"
        elif self.session_state.get("has_kids"):
            difficulty = "medium"
        
        try:
            # Import scorer directly for reliability
            import sys
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from scorer import get_ranker
            
            ranker = get_ranker()
            
            # Use default 40-60 weights for chat mode
            result = ranker.score_places(
                user_profile={"interests": interests, "difficulty": difficulty},
                weight={"popularity": 0.4, "similarity": 0.6}
            )
            
            # Filter out Outskirts and flagged places, then take top N
            all_places = result.get("places", [])
            filtered_places = [
                p for p in all_places 
                if p.get("cluster") != "Outskirts" and not p.get("flags")
            ][:limit]
            
            # Store for later use
            self.session_state["available_places"] = filtered_places
            
            # AUTO-SELECT top places (pre-select appropriate count for the trip)
            auto_select_ids = [p.get("id") for p in filtered_places]
            self.session_state["selected_place_ids"] = auto_select_ids
            
            # Format for LLM consumption - scorer already returns clean data
            formatted_places = []
            for i, p in enumerate(filtered_places):
                formatted_places.append({
                    "rank": i + 1,
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "cluster": p.get("cluster", "Unknown"),
                    "tags": p.get("tags", [])[:3],
                    "rating": p.get("rating"),
                    "difficulty": p.get("difficulty", "Easy"),
                    "avg_time_minutes": p.get("avg_time_minutes", 60),
                    "final_score": p.get("final_score", 0)
                })
            
            print(f"✅ Fetched {len(formatted_places)} ranked places (pace={pace}, {places_per_day}/day × {num_days} days)")
            
            return {
                "status": "success",
                "places": formatted_places,
                "count": len(formatted_places),
                "auto_selected": len(auto_select_ids),
                "message": f"Found {len(formatted_places)} places for your {num_days}-day {pace} trip. All {len(auto_select_ids)} places are pre-selected."
            }
                
        except Exception as e:
            print(f"❌ Error fetching places from scorer: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    def _select_places(self, **kwargs) -> Dict[str, Any]:
        """Update selected places list."""
        place_ids = kwargs.get("place_ids", [])
        action = kwargs.get("action", "set")
        
        if action == "add":
            self.session_state["selected_place_ids"].extend(place_ids)
        elif action == "remove":
            self.session_state["selected_place_ids"] = [
                p for p in self.session_state["selected_place_ids"] 
                if p not in place_ids
            ]
        else:  # set
            self.session_state["selected_place_ids"] = place_ids
        
        # Deduplicate
        self.session_state["selected_place_ids"] = list(set(self.session_state["selected_place_ids"]))
        
        return {
            "status": "success",
            "selected_count": len(self.session_state["selected_place_ids"]),
            "selected_place_ids": self.session_state["selected_place_ids"]
        }

    def _build_itinerary(self, **kwargs) -> Dict[str, Any]:
        """Build itinerary directly using the scheduler module."""
        place_ids = kwargs.get("place_ids") or self.session_state.get("selected_place_ids", [])
        
        if not place_ids:
            return {"status": "error", "message": "No places selected. Please select places first."}
        
        # Calculate num_days
        num_days = 2  # default
        if self.session_state["dates"]["from"] and self.session_state["dates"]["to"]:
            try:
                from_date = datetime.fromisoformat(self.session_state["dates"]["from"])
                to_date = datetime.fromisoformat(self.session_state["dates"]["to"])
                num_days = (to_date - from_date).days + 1
            except:
                pass
        
        # Map pace
        pace_map = {"chill": "slow", "balanced": "medium", "packed": "fast"}
        pace = pace_map.get(self.session_state.get("pace", "balanced"), "medium")
        
        try:
            # Import scheduler directly for reliability
            import sys
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from scheduler import get_scheduler
            
            scheduler = get_scheduler()
            
            user_config = {
                "num_days": num_days,
                "pace": pace,
                "hotel_cluster": "Town Center"
            }
            
            result = scheduler.build_itinerary(place_ids, user_config)
            self.session_state["itinerary"] = result
            
            # Format for LLM consumption
            days_summary = []
            for day in result.get("days", []):
                places_names = [p["name"] for p in day.get("places", [])]
                days_summary.append({
                    "day": day["day"],
                    "cluster": day["cluster"],
                    "places": places_names,
                    "place_count": len(places_names),
                    "start_time": day.get("start_time"),
                    "end_time": day.get("end_time"),
                    "total_drive_min": day.get("total_drive_min", 0)
                })
            
            print(f"✅ Built {len(days_summary)}-day itinerary via scheduler")
            
            return {
                "status": "success",
                "days": days_summary,
                "total_days": len(days_summary),
                "message": f"Created {len(days_summary)}-day itinerary with {len(place_ids)} places"
            }
                
        except Exception as e:
            print(f"❌ Error building itinerary: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    def _save_itinerary(self, **kwargs) -> Dict[str, Any]:
        """Save itinerary to disk."""
        import requests
        
        if not self.session_state.get("itinerary"):
            return {"status": "error", "message": "No itinerary to save"}
        
        user_name = self.session_state.get("user_name", "Guest")
        
        # Create trip name from dates
        trip_name = "Trip"
        if self.session_state["dates"]["from"] and self.session_state["dates"]["to"]:
            try:
                from_date = datetime.fromisoformat(self.session_state["dates"]["from"])
                to_date = datetime.fromisoformat(self.session_state["dates"]["to"])
                trip_name = f"{from_date.strftime('%b %d')} - {to_date.strftime('%b %d')}"
            except:
                pass
        
        try:
            port = os.getenv('PORT', '5001')
            response = requests.post(
                f"http://127.0.0.1:{port}/api/save-itinerary",
                json={
                    "user_name": user_name,
                    "trip_name": trip_name,
                    "itinerary": self.session_state["itinerary"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "success",
                    "message": f"Itinerary saved! File: {data.get('filepath', 'saved')}",
                    "filepath": data.get("filepath")
                }
            else:
                return {"status": "error", "message": "Failed to save itinerary"}
                
        except Exception as e:
            print(f"❌ Error saving itinerary: {e}")
            return {"status": "error", "message": str(e)}

    def _get_ui_hint(self, function_name: str, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generate UI hint based on function call result."""
        if function_name == "save_trip_context":
            state = result.get("current_state", {})
            
            # Progressive disclosure of widgets:
            # 1. After user name -> show date picker
            if state.get("user_name") and not state.get("dates", {}).get("from"):
                return {"type": "date_picker"}
            
            # 2. After dates -> show pace selector  
            if state.get("dates", {}).get("from") and not state.get("pace"):
                return {"type": "pace_selector"}
            
            # 3. After pace -> show interest selector
            if state.get("pace") and not state.get("interests"):
                return {"type": "interest_selector"}
            
            return None
            
        elif function_name == "fetch_ranked_places":
            if result.get("status") == "success":
                return {
                    "type": "place_carousel",
                    "data": {
                        "places": result.get("places", []),
                        "selected_ids": self.session_state.get("selected_place_ids", [])
                    }
                }
            return None
            
        elif function_name == "build_itinerary":
            if result.get("status") == "success":
                return {
                    "type": "itinerary_view",
                    "data": self.session_state.get("itinerary", {})
                }
            return None
            
        return None

    def chat(self, user_message: str) -> Dict[str, Any]:
        """
        Process a user message and return the assistant's response.
        Handles function calling loop automatically.
        """
        # Add user message to history
        self.conversation_history.append(
            types.Content(
                role="user",
                parts=[types.Part(text=user_message)]
            )
        )

        # Generate config with system instruction, tools, and optimized thinking
        config = types.GenerateContentConfig(
            system_instruction=get_system_prompt(),
            tools=self.tools,
            thinking_config=types.ThinkingConfig(thinking_level="low")
        )

        # Maximum iterations for function calling loop
        max_iterations = 10
        iteration = 0
        ui_hint = None

        while iteration < max_iterations:
            iteration += 1

            # Call the model
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=self.conversation_history,
                config=config
            )

            # Check if we have a response
            if not response.candidates or not response.candidates[0].content.parts:
                return {
                    "text": "I apologize, but I couldn't generate a response. Please try again.",
                    "ui_hint": None
                }

            response_parts = response.candidates[0].content.parts

            # Check for function calls
            function_calls = [part for part in response_parts if part.function_call]

            if function_calls:
                # Add assistant's function call to history
                self.conversation_history.append(
                    types.Content(
                        role="model",
                        parts=response_parts
                    )
                )

                # Execute each function and collect results
                function_responses = []
                for part in function_calls:
                    fc = part.function_call
                    result = self._execute_function(fc.name, dict(fc.args))

                    # Capture UI Hints from Tool Calls
                    hint = self._get_ui_hint(fc.name, result)
                    if hint:
                        ui_hint = hint

                    function_responses.append(
                        types.Part(
                            function_response=types.FunctionResponse(
                                name=fc.name,
                                response={"result": result}
                            )
                        )
                    )

                # Add function results to history
                self.conversation_history.append(
                    types.Content(
                        role="user",
                        parts=function_responses
                    )
                )
            else:
                # No function calls - we have the final response
                text_parts = [part.text for part in response_parts if part.text]
                final_response = " ".join(text_parts) if text_parts else "I'm here to help you plan your Kodaikanal trip!"

                # Add assistant response to history
                self.conversation_history.append(
                    types.Content(
                        role="model",
                        parts=[types.Part(text=final_response)]
                    )
                )

                return {"text": final_response, "ui_hint": ui_hint}

        return {
            "text": "I apologize, but I'm having trouble processing your request. Please try again.",
            "ui_hint": None
        }

    def reset_conversation(self):
        """Reset the conversation history and session state."""
        self.conversation_history = []
        self.session_state = {
            "user_name": None,
            "trip_id": None,
            "dates": {"from": None, "to": None},
            "group_type": None,
            "pace": None,
            "interests": [],
            "selected_place_ids": [],
            "itinerary": None
        }

    def get_session_state(self) -> Dict[str, Any]:
        """Get current session state."""
        return self.session_state.copy()


# Engine instance management
_engine_instances: Dict[str, TripLLMEngine] = {}


def get_engine(session_id: str) -> TripLLMEngine:
    """Get or create engine for a session."""
    if session_id not in _engine_instances:
        _engine_instances[session_id] = TripLLMEngine()
    return _engine_instances[session_id]


def reset_engine(session_id: str):
    """Reset engine for a session."""
    if session_id in _engine_instances:
        del _engine_instances[session_id]
