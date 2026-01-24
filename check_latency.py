import time
import os
from dotenv import load_dotenv

load_dotenv()

print("Starting latency check...")
start = time.time()

try:
    from scorer import ItineraryRanker
    print(f"Import took {time.time()-start:.2f}s")
    
    t0 = time.time()
    ranker = ItineraryRanker()
    print(f"Model Instantiation took {time.time()-t0:.2f}s")
    
    t1 = time.time()
    res = ranker.score_places({'interests': ['nature'], 'difficulty': 'medium'})
    print(f"Scoring took {time.time()-t1:.2f}s")
    print(f"Total time: {time.time()-start:.2f}s")
except Exception as e:
    print(f"Error: {e}")
