#!/usr/bin/env python3
"""
Script to extract Cone 06 glazes from glazes.html and create a CSV file.
"""

import csv
import os
import re
import requests
from bs4 import BeautifulSoup

def extract_glazes_from_html(html_file):
    """Extract all Cone 06 glazes from the HTML file."""
    
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    
    glazes = []
    
    # Find all mayco-product divs
    product_divs = soup.find_all('div', class_='mayco-product')
    
    for div in product_divs:
        # Check if this is a Cone 06 product by looking for the text
        text_content = div.get_text()
        if 'Cone 06' in text_content:
            
            # Extract image URL
            img_tag = div.find('img', class_='product-featured-image')
            if img_tag:
                image_url = img_tag.get('src')
                
                # Extract code and color name from the text content
                lines = [line.strip() for line in text_content.split('\n') if line.strip()]
                
                # Find the code (usually starts with SC-)
                code = None
                color_name = None
                
                for i, line in enumerate(lines):
                    if line.startswith('SC-') and not line.startswith('SC-16_cone6'):
                        code = line
                        # The next non-empty line should be the color name
                        if i + 1 < len(lines) and lines[i + 1] and not lines[i + 1].startswith('('):
                            color_name = lines[i + 1]
                        break
                
                if code and color_name and image_url:
                    glazes.append({
                        'code': code,
                        'color_name': color_name,
                        'image_url': image_url
                    })
                    print(f"Found glaze: {code} - {color_name}")
    
    return glazes

def download_image(url, local_path):
    """Download an image from URL to local path."""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        with open(local_path, 'wb') as f:
            f.write(response.content)
        
        return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False

def main():
    """Main function to extract glazes and create CSV."""
    
    print("Extracting Cone 06 glazes from glazes.html...")
    glazes = extract_glazes_from_html('glazes.html')
    
    print(f"Found {len(glazes)} Cone 06 glazes")
    
    # Create glazes directory
    os.makedirs('glaze_images', exist_ok=True)
    
    # Download images and create CSV
    csv_data = []
    
    for i, glaze in enumerate(glazes):
        print(f"Processing {i+1}/{len(glazes)}: {glaze['code']} - {glaze['color_name']}")
        
        # Create local image path
        image_filename = f"{glaze['code'].lower().replace('-', '_')}_cone06.jpg"
        local_image_path = f"glaze_images/{image_filename}"
        
        # Download image
        if download_image(glaze['image_url'], local_image_path):
            csv_data.append({
                'code': glaze['code'],
                'color_name': glaze['color_name'],
                'image_url': glaze['image_url'],
                'local_image_path': local_image_path
            })
        else:
            csv_data.append({
                'code': glaze['code'],
                'color_name': glaze['color_name'],
                'image_url': glaze['image_url'],
                'local_image_path': 'DOWNLOAD_FAILED'
            })
    
    # Write CSV file
    with open('glazes_cone06.csv', 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['code', 'color_name', 'image_url', 'local_image_path']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for row in csv_data:
            writer.writerow(row)
    
    print(f"CSV file created: glazes_cone06.csv")
    print(f"Downloaded {sum(1 for row in csv_data if row['local_image_path'] != 'DOWNLOAD_FAILED')} images successfully")

if __name__ == "__main__":
    main()
