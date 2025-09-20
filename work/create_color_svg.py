#!/usr/bin/env python3
"""
Script to create an SVG file with color swatches and hex codes from the underglaze data.
"""

import csv

def create_svg_page(csv_file='underglaze_colors.csv', output_file='underglaze_colors.svg'):
    """Create an SVG file with color swatches and hex codes."""
    
    # Read the CSV file
    color_data = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['left_color_hex'] and row['top_color_hex']:
                color_data.append({
                    'code': row['code'],
                    'color_name': row['color_name'],
                    'left_color_hex': row['left_color_hex'],
                    'top_color_hex': row['top_color_hex']
                })
    
    # SVG dimensions
    swatch_size = 60
    text_height = 20
    item_width = 200
    item_height = swatch_size * 2 + text_height * 3 + 20
    items_per_row = 6
    margin = 20
    
    # Calculate total dimensions
    total_width = items_per_row * item_width + (items_per_row + 1) * margin
    total_height = ((len(color_data) + items_per_row - 1) // items_per_row) * item_height + margin
    
    # Start SVG
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{total_width}" height="{total_height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title {{
        font-family: Arial, sans-serif;
        font-size: 24px;
        font-weight: bold;
        text-anchor: middle;
        fill: #333;
      }}
      .subtitle {{
        font-family: Arial, sans-serif;
        font-size: 14px;
        text-anchor: middle;
        fill: #666;
      }}
      .color-name {{
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        fill: #333;
      }}
      .color-code {{
        font-family: Arial, sans-serif;
        font-size: 12px;
        fill: #666;
      }}
      .hex-code {{
        font-family: 'Courier New', monospace;
        font-size: 11px;
        fill: #333;
      }}
      .position-label {{
        font-family: Arial, sans-serif;
        font-size: 10px;
        fill: #888;
        text-anchor: middle;
      }}
    </style>
  </defs>
  
  <!-- Title -->
  <text x="{total_width // 2}" y="30" class="title">Mayco Underglaze Colors - Cone 06</text>
  <text x="{total_width // 2}" y="50" class="subtitle">Color samples: 45% width/55% height and top middle positions</text>
  
  <!-- Color swatches -->
'''
    
    # Add each color item
    for i, item in enumerate(color_data):
        row = i // items_per_row
        col = i % items_per_row
        
        x = margin + col * (item_width + margin)
        y = 80 + row * item_height
        
        # Color name and code
        svg_content += f'''
  <!-- {item['color_name']} -->
  <text x="{x + 10}" y="{y + 15}" class="color-name">{item['color_name']}</text>
  <text x="{x + 10}" y="{y + 30}" class="color-code">{item['code']}</text>
  
  <!-- Left color swatch -->
  <rect x="{x + 10}" y="{y + 40}" width="{swatch_size}" height="{swatch_size}" fill="{item['left_color_hex']}" stroke="#ccc" stroke-width="1"/>
  <text x="{x + 10 + swatch_size // 2}" y="{y + 40 + swatch_size + 12}" class="position-label">L</text>
  <text x="{x + 10 + swatch_size + 10}" y="{y + 40 + 15}" class="hex-code">{item['left_color_hex']}</text>
  <text x="{x + 10 + swatch_size + 10}" y="{y + 40 + 30}" class="position-label">45% w, 55% h</text>
  
  <!-- Top color swatch -->
  <rect x="{x + 10}" y="{y + 40 + swatch_size + 20}" width="{swatch_size}" height="{swatch_size}" fill="{item['top_color_hex']}" stroke="#ccc" stroke-width="1"/>
  <text x="{x + 10 + swatch_size // 2}" y="{y + 40 + swatch_size + 20 + swatch_size + 12}" class="position-label">T</text>
  <text x="{x + 10 + swatch_size + 10}" y="{y + 40 + swatch_size + 20 + 15}" class="hex-code">{item['top_color_hex']}</text>
  <text x="{x + 10 + swatch_size + 10}" y="{y + 40 + swatch_size + 20 + 30}" class="position-label">Top middle</text>
'''
    
    # Close SVG
    svg_content += '</svg>'
    
    # Write to file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    
    print(f"SVG file created: {output_file}")
    print(f"Dimensions: {total_width} x {total_height} pixels")
    print(f"Contains {len(color_data)} underglaze colors")

def main():
    """Main function to create SVG file."""
    create_svg_page()

if __name__ == "__main__":
    main()
