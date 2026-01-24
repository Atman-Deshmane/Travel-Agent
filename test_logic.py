#!/usr/bin/env python3
"""
Transparent Scorer Test Script (Truth Serum)
=============================================
CLI script to verify the scoring math and see WHY places are ranked the way they are.

Usage:
    python test_logic.py
"""

from scorer import ItineraryRanker
from tabulate import tabulate


def main():
    """Run the ranker with a test profile and display formatted results."""
    
    # Initialize ranker
    print("=" * 80)
    print("🧪 TRANSPARENT SCORER TEST - Truth Serum Mode")
    print("=" * 80)
    
    ranker = ItineraryRanker()
    
    # Hardcoded test profile
    test_profile = {
        'interests': ['Nature', 'Trekking', 'History', 'Adventure', 'Spiritual', 'Relaxation', 'Cloud'],
        'difficulty': 'high'
    }
    
    print(f"\n👤 USER PROFILE:")
    print(f"   Interests:  {', '.join(test_profile['interests'])}")
    print(f"   Difficulty: {test_profile['difficulty']}")
    
    # Run ranker
    print("\n⚙️  Running transparent ranker...")
    results = ranker.rank_places(test_profile)
    
    # Format as table
    print(f"\n📊 RANKING RESULTS ({len(results)} places)")
    print("=" * 80)
    print("\n📌 SCORING FORMULA: Final = (Similarity × 0.6) + (Popularity × 0.4)")
    print("   - Similarity: Cosine similarity with user interests × 100")
    print("   - Popularity: 100 - ((rank - 1) × 2), Rank ≤ 3 = 100")
    print()
    
    # Build table data
    table_data = []
    for rank, item in enumerate(results, 1):
        place = item['place_data']
        debug = item['debug']
        
        table_data.append([
            rank,
            place['name'][:28],  # Truncate long names
            place.get('logic', {}).get('difficulty', 'Easy'),
            f"{debug['sim_score']:.1f}",
            f"{debug['pop_score']:.1f}",
            f"{debug['final_score']:.1f}"
        ])
    
    # Print table
    headers = ['Rank', 'Place Name', 'Difficulty', 'Sim (60%)', 'Pop (40%)', 'FINAL']
    print(tabulate(table_data, headers=headers, tablefmt='grid'))
    
    # Show top 5 breakdown
    print("\n" + "=" * 80)
    print("🔍 DETAILED BREAKDOWN - TOP 5")
    print("=" * 80)
    
    for rank, item in enumerate(results[:5], 1):
        place = item['place_data']
        debug = item['debug']
        content = place.get('content', {})
        
        print(f"\n#{rank} {place['name']}")
        print(f"   📍 Cluster: {place.get('location', {}).get('cluster_zone', 'Unknown')}")
        print(f"   🏔️  Difficulty: {place.get('logic', {}).get('difficulty', 'Easy')}")
        print(f"   📊 Popularity Rank: {debug['popularity_rank']}")
        print(f"   🏷️  Tags: {', '.join(content.get('tags', [])[:5])}")
        print(f"   ─────────────────────────────────")
        print(f"   Similarity Score: {debug['sim_score']:.1f} × 0.6 = {debug['sim_score'] * 0.6:.1f}")
        print(f"   Popularity Score: {debug['pop_score']:.1f} × 0.4 = {debug['pop_score'] * 0.4:.1f}")
        print(f"   FINAL SCORE:      {debug['final_score']:.1f}")
    
    # Show summary stats
    print("\n" + "=" * 80)
    print("📈 SUMMARY STATISTICS")
    print("=" * 80)
    
    sim_scores = [item['debug']['sim_score'] for item in results]
    pop_scores = [item['debug']['pop_score'] for item in results]
    final_scores = [item['debug']['final_score'] for item in results]
    
    print(f"\n   Similarity: min={min(sim_scores):.1f}, max={max(sim_scores):.1f}, avg={sum(sim_scores)/len(sim_scores):.1f}")
    print(f"   Popularity: min={min(pop_scores):.1f}, max={max(pop_scores):.1f}, avg={sum(pop_scores)/len(pop_scores):.1f}")
    print(f"   Final:      min={min(final_scores):.1f}, max={max(final_scores):.1f}, avg={sum(final_scores)/len(final_scores):.1f}")
    
    print(f"\n✅ Test complete. {len(results)} places ranked transparently.\n")
    
    return results


if __name__ == '__main__':
    main()
