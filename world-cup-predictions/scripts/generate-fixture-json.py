import requests
import json
import time

def generate_wc_files():
    API_KEY = "123"
    LEAGUE_ID = "4429"
    SEASON = "2026"
    
    # Storage for both formats
    lookup_list = []
    structured_list = []
    seen_ids = set()

    print(f"Fetching World Cup data from TheSportsDB (League {LEAGUE_ID})...")

    # We loop through rounds to bypass the 15-result limit of the free key
    for round_num in range(1, 5):
        url = f"https://www.thesportsdb.com/api/v1/json/{API_KEY}/eventsround.php?id={LEAGUE_ID}&r={round_num}&s={SEASON}"
        
        try:
            response = requests.get(url)
            data = response.json()
            
            if data and data.get("events"):
                new_matches = 0
                for event in data["events"]:
                    event_id = event.get("idEvent")
                    
                    if event_id not in seen_ids:
                        # 1. Format for fixtures_lookup.json
                        lookup_list.append({
                            "fixtureId": event_id,
                            "column": f"{event.get('strHomeTeam')} vs {event.get('strAwayTeam')}"
                        })

                        # 2. Format for fixtures.json
                        # Normalizing the team names for IDs (e.g., "South Korea" -> "south-korea")
                        home_name = event.get('strHomeTeam')
                        away_name = event.get('strAwayTeam')
                        
                        structured_list.append({
                            "id": event_id,
                            "home": {
                                "id": home_name.lower().replace(" ", "-"),
                                "name": home_name
                            },
                            "away": {
                                "id": away_name.lower().replace(" ", "-"),
                                "name": away_name
                            },
                            "kickoff": f"{event.get('dateEvent')}T{event.get('strTime')}",
                            "status": "SCHEDULED" if not event.get('strStatus') else event.get('strStatus').upper()
                        })
                        
                        seen_ids.add(event_id)
                        new_matches += 1
                
                print(f"  Round {round_num}: Found {new_matches} matches.")
            
            # Respect rate limit for free key
            time.sleep(1.2)

        except Exception as e:
            print(f"  Error fetching round {round_num}: {e}")

    # Save fixtures_lookup.json
    with open('fixtures_lookup.json', 'w', encoding='utf-8') as f:
        json.dump(lookup_list, f, indent=2)

    # Save fixtures.json
    with open('fixtures.json', 'w', encoding='utf-8') as f:
        json.dump(structured_list, f, indent=2)

    print(f"\nDone! Saved {len(seen_ids)} total fixtures to both files.")

if __name__ == "__main__":
    generate_wc_files()