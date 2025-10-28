

import json
import os
import random
import base64
from datetime import datetime, timezone
from pathlib import Path


class DailyChallengeGenerator:
    def __init__(self):
        self.tags_data = None
        self.encryption_key = None
        
    def load_tags_data(self):
        """Load and parse tags_data.js"""
        # Get the path to the script file and find docs from there
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        tags_file = project_root / 'docs' / 'tags_data.js'
        
        if not tags_file.exists():
            raise FileNotFoundError(f"Could not find {tags_file}")
        
        with open(tags_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract JSON from: const GAME_DATA = {...};
        start = content.find('{')
        end = content.rfind('}') + 1
        
        if start == -1 or end == 0:
            raise ValueError("Could not parse GAME_DATA from tags_data.js")
        
        json_str = content[start:end]
        self.tags_data = json.loads(json_str)
        self.encryption_key = self.tags_data['key']
        
        print(f"[OK] Loaded {len(self.tags_data['tags'])} tags")
        
    def select_random_pairs(self, num_pairs=10):
    
        tags = self.tags_data['tags']
        used_ids = set()
        selected_pairs = []
        
        # Shuffle tags for randomness
        shuffled_tags = tags.copy()
        random.shuffle(shuffled_tags)
        
        attempts = 0
        max_attempts = len(shuffled_tags) * 2
        
        while len(selected_pairs) < num_pairs and attempts < max_attempts:
            attempts += 1
            
            if len(shuffled_tags) < 2:
                # Re-shuffle if we run out
                shuffled_tags = [t for t in tags if t['id'] not in used_ids]
                random.shuffle(shuffled_tags)
                continue
            
            # Get two random tags
            tag1 = shuffled_tags.pop()
            tag2 = shuffled_tags.pop()
            
            # Skip if already used
            if tag1['id'] in used_ids or tag2['id'] in used_ids:
                continue
            
            # Skip if counts are identical (boring)
            if tag1.get('encrypted_count') == tag2.get('encrypted_count'):
                continue
            
            # Add pair
            selected_pairs.append({
                'tag1': tag1,
                'tag2': tag2
            })
            
            used_ids.add(tag1['id'])
            used_ids.add(tag2['id'])
            
            print(f"  Selected pair {len(selected_pairs)}: {tag1['name']} vs {tag2['name']}")
        
        return selected_pairs
    
    def generate_daily_data(self):
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        print(f"\nGenerating challenge for {today}...")
        
        # Select pairs
        pairs = self.select_random_pairs(10)
        
        if len(pairs) < 10:
            raise Exception(f"Only generated {len(pairs)} pairs, need 10")
        
        # Create data structure
        daily_data = {
            'version': '1.0',
            'date': today,
            'key': self.encryption_key,
            'pairs': pairs
        }
        
        return daily_data
    
    def write_output(self, data):
        """Write to docs/daily_game_data.js"""
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        output_file = project_root / 'docs' / 'daily_game_data.js'
        
        # Format as JavaScript
        js_content = f"""// Generated daily challenge - DO NOT EDIT MANUALLY
// Generated on: {datetime.now(timezone.utc).isoformat()}
// Date: {data['date']}

const DAILY_GAME_DATA = {json.dumps(data, indent=2)};
"""
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        print(f"\n[OK] Generated daily challenge for {data['date']}")
        print(f"[OK] Wrote to: {output_file}")
        print(f"[OK] Total pairs: {len(data['pairs'])}")
        print(f"[OK] Total unique tags: {len(data['pairs']) * 2}")


def main():
    """Main execution"""
    print("=" * 60)
    print("Daily Challenge Generator")
    print("=" * 60)
    
    try:
        generator = DailyChallengeGenerator()
        generator.load_tags_data()
        daily_data = generator.generate_daily_data()
        generator.write_output(daily_data)
        
        print("=" * 60)
        print("SUCCESS: Daily challenge generated")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == '__main__':
    main()

