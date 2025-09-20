#!/usr/bin/env python3
"""
Script to extract average colors from glaze images and create an HTML color swatch page with original images.
"""

import csv
import os
from PIL import Image, ImageFilter
import colorsys

def rgb_to_hex(rgb):
    """Convert RGB tuple to hex color string."""
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"

def get_average_color_at_position(image, x, y, blur_radius=10):
    """Get average color at a specific position with blur applied."""
    # Apply blur to get more average color
    blurred = image.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    
    # Get the pixel color at the specified position
    pixel = blurred.getpixel((x, y))
    
    # Handle different image modes
    if len(pixel) == 4:  # RGBA
        r, g, b, a = pixel
        # Convert to RGB if alpha is present
        if a < 255:
            # Blend with white background
            alpha = a / 255.0
            r = int(r * alpha + 255 * (1 - alpha))
            g = int(g * alpha + 255 * (1 - alpha))
            b = int(b * alpha + 255 * (1 - alpha))
        return (r, g, b)
    elif len(pixel) == 3:  # RGB
        return pixel
    else:  # Grayscale
        return (pixel, pixel, pixel)

def extract_colors_from_image(image_path, inset=20):
    """Extract two colors from an image at specified positions."""
    try:
        # Open the image
        image = Image.open(image_path)
        
        # Get image dimensions
        width, height = image.size
        
        # Calculate positions
        # Left position: 45% width, 55% height (center - 5% width, center + 5% height)
        left_x = int(width * 0.45)
        left_y = int(height * 0.55)
        
        # Top position: 50% width, 20px inset from top
        top_x = width // 2
        top_y = inset
        
        # Ensure positions are within image bounds
        left_x = max(0, min(left_x, width - 1))
        top_x = max(0, min(top_x, width - 1))
        left_y = max(0, min(left_y, height - 1))
        top_y = max(0, min(top_y, height - 1))
        
        # Get colors
        left_color = get_average_color_at_position(image, left_x, left_y)
        top_color = get_average_color_at_position(image, top_x, top_y)
        
        return left_color, top_color
        
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None, None

def create_html_page(color_data, output_file='glaze_colors.html'):
    """Create an HTML page with color swatches and original images."""
    
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mayco Glaze Colors - Cone 06</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .color-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 25px;
            margin-top: 20px;
        }
        .color-item {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            background-color: white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
        }
        .color-header {
            margin-bottom: 15px;
        }
        .color-name {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 5px;
            color: #333;
        }
        .color-code {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
        }
        .image-and-colors {
            display: flex;
            gap: 15px;
            align-items: flex-start;
        }
        .original-image {
            flex: 1;
            max-width: 150px;
        }
        .original-image img {
            width: 100%;
            height: auto;
            border-radius: 5px;
            border: 2px solid #eee;
        }
        .color-swatches {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .color-swatch-row {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .color-swatch {
            width: 50px;
            height: 50px;
            border: 2px solid #ccc;
            border-radius: 5px;
            position: relative;
            cursor: pointer;
            flex-shrink: 0;
        }
        .color-swatch:hover {
            border-color: #999;
            transform: scale(1.05);
            transition: all 0.2s;
        }
        .color-info {
            font-size: 12px;
            color: #666;
            flex: 1;
        }
        .hex-code {
            font-family: monospace;
            background-color: #f0f0f0;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 11px;
        }
        .position-label {
            font-size: 10px;
            color: #888;
            margin-top: 2px;
            text-align: center;
        }
        .image-caption {
            font-size: 11px;
            color: #888;
            text-align: center;
            margin-top: 5px;
        }
        .description {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Mayco Glaze Colors - Cone 06</h1>
        <p class="description">
            Color samples extracted from glaze images (45% width/55% height and top middle positions)
        </p>
        <div class="color-grid">
"""
    
    for item in color_data:
        if item['left_color'] and item['top_color']:
            left_hex = rgb_to_hex(item['left_color'])
            top_hex = rgb_to_hex(item['top_color'])
            
            # Get the image filename for display
            image_filename = os.path.basename(item['image_path'])
            
            html_content += f"""
            <div class="color-item">
                <div class="color-header">
                    <div class="color-name">{item['color_name']}</div>
                    <div class="color-code">{item['code']}</div>
                </div>
                <div class="image-and-colors">
                    <div class="original-image">
                        <img src="{item['image_path']}" alt="{item['color_name']} glaze sample" />
                        <div class="image-caption">Original Sample</div>
                    </div>
                    <div class="color-swatches">
                        <div class="color-swatch-row">
                            <div class="color-swatch" style="background-color: {left_hex};" title="{left_hex}">
                                <div class="position-label">L</div>
                            </div>
                            <div class="color-info">
                                <div><span class="hex-code">{left_hex}</span></div>
                                <div style="font-size: 10px; color: #999;">45% width, 55% height</div>
                            </div>
                        </div>
                        <div class="color-swatch-row">
                            <div class="color-swatch" style="background-color: {top_hex};" title="{top_hex}">
                                <div class="position-label">T</div>
                            </div>
                            <div class="color-info">
                                <div><span class="hex-code">{top_hex}</span></div>
                                <div style="font-size: 10px; color: #999;">Top position</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            """
    
    html_content += """
        </div>
    </div>
</body>
</html>
"""
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

def main():
    """Main function to extract colors and create HTML page."""
    
    # Read the CSV file to get the glaze data
    color_data = []
    
    with open('glazes_cone06.csv', 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if row['local_image_path'] and row['local_image_path'] != 'DOWNLOAD_FAILED':
                color_data.append({
                    'code': row['code'],
                    'color_name': row['color_name'],
                    'image_path': row['local_image_path'],
                    'left_color': None,
                    'top_color': None
                })
    
    print(f"Processing {len(color_data)} glaze images...")
    
    # Extract colors from each image
    for i, item in enumerate(color_data):
        print(f"Processing {i+1}/{len(color_data)}: {item['code']} - {item['color_name']}")
        
        left_color, top_color = extract_colors_from_image(item['image_path'])
        item['left_color'] = left_color
        item['top_color'] = top_color
        
        if left_color and top_color:
            left_hex = rgb_to_hex(left_color)
            top_hex = rgb_to_hex(top_color)
            print(f"  Left color: {left_hex}, Top color: {top_hex}")
        else:
            print(f"  Failed to extract colors")
    
    # Create HTML page
    print("Creating HTML color swatch page with original images...")
    create_html_page(color_data)
    
    print("HTML page created: glaze_colors.html")
    
    # Also create a CSV with the color data
    with open('glaze_colors.csv', 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['code', 'color_name', 'left_color_hex', 'top_color_hex', 'left_color_rgb', 'top_color_rgb']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for item in color_data:
            if item['left_color'] and item['top_color']:
                writer.writerow({
                    'code': item['code'],
                    'color_name': item['color_name'],
                    'left_color_hex': rgb_to_hex(item['left_color']),
                    'top_color_hex': rgb_to_hex(item['top_color']),
                    'left_color_rgb': f"({item['left_color'][0]}, {item['left_color'][1]}, {item['left_color'][2]})",
                    'top_color_rgb': f"({item['top_color'][0]}, {item['top_color'][1]}, {item['top_color'][2]})"
                })
    
    print("Color data CSV created: glaze_colors.csv")

if __name__ == "__main__":
    main()

