#!/usr/bin/env python3
"""
Script to extract Cone 06 underglaze data from HTML file and create CSV with image downloads.
"""

import re
import csv
import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import time

def extract_underglaze_data(html_file):
    """Extract Cone 06 underglaze data from HTML file."""
    
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    
    # Find all product divs
    products = soup.find_all('div', class_='mayco-product')
    
    cone06_data = []
    
    for product in products:
        # Check if this is a Cone 06 product by looking for the small em tag
        small_em = product.find('small')
        if small_em and small_em.find('em') and 'Cone 06' in small_em.get_text():
            
            # Extract image URL
            img_tag = product.find('img', class_='product-featured-image')
            if img_tag:
                image_url = img_tag.get('src')
                
                # Extract code and color name from the text content
                # The structure is: <br /> UG-XX <br /> Color Name <br />
                text_content = product.get_text()
                lines = [line.strip() for line in text_content.split('\n') if line.strip()]
                
                # Look for the pattern: UG-XX, Color Name, (Cone 06)
                for i, line in enumerate(lines):
                    if line.startswith('UG-') and i + 1 < len(lines):
                        code = line
                        color_name = lines[i + 1]
                        if i + 2 < len(lines) and 'Cone 06' in lines[i + 2]:
                            cone06_data.append({
                                'code': code,
                                'color_name': color_name,
                                'image_url': image_url
                            })
                            break
    
    return cone06_data

def download_image(url, filename, folder='underglaze_images'):
    """Download an image from URL to specified folder."""
    
    # Create folder if it doesn't exist
    os.makedirs(folder, exist_ok=True)
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        filepath = os.path.join(folder, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"Downloaded: {filename}")
        return True
        
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False

def create_csv(data, filename='underglazes_cone06.csv'):
    """Create CSV file with underglaze data."""
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['code', 'color_name', 'image_url', 'local_image_path']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for item in data:
            writer.writerow(item)

def main():
    """Main function to extract data and download images."""
    
    html_file = '/Users/john.brown/servicenow/underglazes.html'
    
    print("Extracting Cone 06 underglaze data...")
    cone06_data = extract_underglaze_data(html_file)
    
    print(f"Found {len(cone06_data)} Cone 06 underglazes")
    
    # Download images and update data with local paths
    print("Downloading images...")
    for i, item in enumerate(cone06_data):
        # Extract filename from URL
        parsed_url = urlparse(item['image_url'])
        filename = os.path.basename(parsed_url.path)
        
        # Add local image path to data
        item['local_image_path'] = f"underglaze_images/{filename}"
        
        # Download image
        success = download_image(item['image_url'], filename)
        if not success:
            item['local_image_path'] = "DOWNLOAD_FAILED"
        
        # Add small delay to be respectful to the server
        time.sleep(0.5)
        
        if (i + 1) % 10 == 0:
            print(f"Downloaded {i + 1}/{len(cone06_data)} images...")
    
    # Create CSV file
    print("Creating CSV file...")
    create_csv(cone06_data)
    
    print(f"CSV file created: underglazes_cone06.csv")
    print(f"Images downloaded to: underglaze_images/")
    
    # Print summary
    print("\nSummary:")
    for item in cone06_data:
        print(f"{item['code']}: {item['color_name']}")

if __name__ == "__main__":
    main()
