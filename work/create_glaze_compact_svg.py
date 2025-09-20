#!/usr/bin/env python3
"""
Script to create a compact SVG color swatch for glazes.
"""

import csv

def create_compact_svg(csv_file, output_file='glaze_colors_compact.svg'):
    """Create a compact SVG with color swatches."""
    
    # Read the CSV file
    color_data = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            color_data.append(row)
    
    # SVG dimensions
    swatch_size = 20
    swatches_per_row = 20
    margin = 10
    text_height = 15
    
    # Calculate total dimensions
    total_width = swatches_per_row * swatch_size + (swatches_per_row - 1) * 2 + margin * 2
    total_height = ((len(color_data) + swatches_per_row - 1) // swatches_per_row) * (swatch_size + text_height + 2) + margin * 2
    
    # Start SVG
    svg_content = f'''<svg width="{total_width}" height="{total_height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="{total_width}" height="{total_height}" fill="white" stroke="black" stroke-width="1"/>
    <text x="{total_width//2}" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold">Mayco Glaze Colors - Cone 06</text>
'''
    
    # Add color swatches
    for i, item in enumerate(color_data):
        row = i // swatches_per_row
        col = i % swatches_per_row
        
        x = margin + col * (swatch_size + 2)
        y = margin + 30 + row * (swatch_size + text_height + 2)
        
        # Use the left color (45% width, 55% height position)
        color = item['left_color_hex']
        
        svg_content += f'''    <rect x="{x}" y="{y}" width="{swatch_size}" height="{swatch_size}" fill="{color}" stroke="black" stroke-width="0.5"/>
    <text x="{x + swatch_size//2}" y="{y + swatch_size + text_height}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8">{item['code']}</text>
'''
    
    svg_content += '</svg>'
    
    # Write to file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    
    print(f"Compact SVG created: {output_file}")

if __name__ == "__main__":
    create_compact_svg('glaze_colors.csv')

