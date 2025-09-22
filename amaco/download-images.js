const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function downloadConeChartImages() {
  try {
    // Read the CSV file
    const csvContent = fs.readFileSync('amaco-velvet-underglazes-cone-charts.csv', 'utf8');
    const lines = csvContent.split('\n');
    
    // Create images folder
    const imagesDir = 'cone-chart-images';
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
      console.log(`Created folder: ${imagesDir}`);
    }
    
    // Set up axios with proper headers
    const axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: 30000,
      responseType: 'stream'
    });
    
    const products = [];
    
    // Parse CSV (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(',');
      if (columns.length >= 3) {
        const id = columns[0];
        const name = columns[1];
        const imageUrl = columns[2];
        
        if (imageUrl && imageUrl.trim()) {
          products.push({ id, name, imageUrl: imageUrl.trim() });
        }
      }
    }
    
    console.log(`Found ${products.length} products with cone chart URLs`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Download each image
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`Downloading ${i + 1}/${products.length}: ${product.id} - ${product.name}`);
      
      try {
        // Create safe filename
        const safeName = product.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
        const fileExtension = path.extname(product.imageUrl.split('?')[0]) || '.jpg';
        const filename = `${product.id}-${safeName}${fileExtension}`;
        const filepath = path.join(imagesDir, filename);
        
        // Skip if file already exists
        if (fs.existsSync(filepath)) {
          console.log(`  ✓ Already exists: ${filename}`);
          successCount++;
          continue;
        }
        
        // Download the image
        const response = await axiosInstance.get(product.imageUrl);
        
        // Write to file
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        console.log(`  ✓ Downloaded: ${filename}`);
        successCount++;
        
        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`  ✗ Error downloading ${product.id}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\nDownload complete!`);
    console.log(`✓ Successfully downloaded: ${successCount} images`);
    console.log(`✗ Errors: ${errorCount} images`);
    console.log(`📁 Images saved to: ${imagesDir}/`);
    
    // List downloaded files
    const files = fs.readdirSync(imagesDir);
    console.log(`\nDownloaded files (${files.length}):`);
    files.forEach(file => {
      const stats = fs.statSync(path.join(imagesDir, file));
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`  ${file} (${sizeKB}KB)`);
    });
    
  } catch (error) {
    console.error('Error downloading images:', error);
  }
}

// Run the downloader
downloadConeChartImages();
