#!/usr/bin/env python3
"""
Script to create a compact SVG file with color swatches and hex codes from the underglaze data.
"""

import csv

def create_compact_svg(csv_file='underglaze_colors.csv', output_file='underglaze_colors_compact.svg'):
    """Create a compact SVG file with color swatches and hex codes."""
    
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
    
    # SVG dimensions - more compact
    swatch_size = 40
    text_height = 15
    item_width = 150
    item_height = swatch_size * 2 + text_height * 2 + 15
    items_per_row = 8
    margin = 15
    
    # Calculate total dimensions
    total_width = items_per_row * item_width + (items_per_row + 1) * margin
    total_height = ((len(color_data) + items_per_row - 1) // items_per_row) * item_height + margin + 60
    
    # Start SVG
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{total_width}" height="{total_height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title {{
        font-family: Arial, sans-serif;
        font-size: 20px;
        font-weight: bold;
        text-anchor: middle;
        fill: #333;
      }}
      .subtitle {{
        font-family: Arial, sans-serif;
        font-size: 12px;
        text-anchor: middle;
        fill: #666;
      }}
      .color-name {{
        font-family: Arial, sans-serif;
        font-size: 11px;
        font-weight: bold;
        fill: #333;
      }}
      .color-code {{
        font-family: Arial, sans-serif;
        font-size: 9px;
        fill: #666;
      }}
      .hex-code {{
        font-family: 'Courier New', monospace;
        font-size: 8px;
        fill: #333;
      }}
    </style>
  </defs>
  
  <!-- Title -->
  <text x="{total_width // 2}" y="25" class="title">Mayco Underglaze Colors - Cone 06</text>
  <text x="{total_width // 2}" y="40" class="subtitle">L: 45% w/55% h | T: Top middle</text>
  
  <!-- Color swatches -->
'''
    
    # Add each color item
    for i, item in enumerate(color_data):
        row = i // items_per_row
        col = i % items_per_row
        
        x = margin + col * (item_width + margin)
        y = 60 + row * item_height
        
        # Color name and code
        svg_content += f'''
  <!-- {item['color_name']} -->
  <text x="{x + 5}" y="{y + 10}" class="color-name">{item['color_name']}</text>
  <text x="{x + 5}" y="{y + 20}" class="color-code">{item['code']}</text>
  
  <!-- Left color swatch -->
  <rect x="{x + 5}" y="{y + 25}" width="{swatch_size}" height="{swatch_size}" fill="{item['left_color_hex']}" stroke="#ccc" stroke-width="0.5"/>
  <text x="{x + 5 + swatch_size + 5}" y="{y + 25 + 12}" class="hex-code">{item['left_color_hex']}</text>
  
  <!-- Top color swatch -->
  <rect x="{x + 5}" y="{y + 25 + swatch_size + 5}" width="{swatch_size}" height="{swatch_size}" fill="{item['top_color_hex']}" stroke="#ccc" stroke-width="0.5"/>
  <text x="{x + 5 + swatch_size + 5}" y="{y + 25 + swatch_size + 5 + 12}" class="hex-code">{item['top_color_hex']}</text>
'''
    
    # Close SVG
    svg_content += '</svg>'
    
    # Write to file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    
    print(f"Compact SVG file created: {output_file}")
    print(f"Dimensions: {total_width} x {total_height} pixels")
    print(f"Contains {len(color_data)} underglaze colors")

def main():
    """Main function to create compact SVG file."""
    create_compact_svg()

if __name__ == "__main__":
    main()
