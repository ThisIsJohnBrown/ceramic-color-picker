#!/usr/bin/env python3
"""
Script to create a JSON file combining glazes and underglazes color data.
"""

import csv
import json

def create_colors_json():
    """Create a JSON file with combined glazes and underglazes color data."""
    
    # Read glazes data
    glazes = []
    with open('glaze_colors.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # For glazes, use the left color as the main color
            glazes.append({
                "id": row['code'],
                "name": row['color_name'],
                "color": row['left_color_hex']
            })
    
    # Read underglazes data
    underglazes = []
    with open('underglaze_colors.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            underglazes.append({
                "id": row['code'],
                "name": row['color_name'],
                "left": row['left_color_hex'],
                "top": row['top_color_hex']
            })
    
    # Create the combined data structure
    colors_data = {
        "glazes": glazes,
        "underglazes": underglazes
    }
    
    # Write to JSON file
    with open('colors.json', 'w', encoding='utf-8') as f:
        json.dump(colors_data, f, indent=2, ensure_ascii=False)
    
    print(f"Created colors.json with {len(glazes)} glazes and {len(underglazes)} underglazes")
    print(f"Total colors: {len(glazes) + len(underglazes)}")

if __name__ == "__main__":
    create_colors_json()

