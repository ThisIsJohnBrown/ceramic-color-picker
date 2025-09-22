const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createSwatches() {
  try {
    // Create swatches folder
    const swatchesDir = 'swatches';
    if (!fs.existsSync(swatchesDir)) {
      fs.mkdirSync(swatchesDir);
      console.log(`Created folder: ${swatchesDir}`);
    }
    
    // Create a solid white 50x50 image for fallback
    const whiteImage = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).png().toBuffer();
    
    // Get all images from cone-chart-images folder
    const imagesDir = 'cone-chart-images';
    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(file => 
      file.match(/\.(jpg|jpeg|png|svg)$/i)
    );
    
    console.log(`Found ${imageFiles.length} images to process`);
    
    let processedCount = 0;
    let size386x251Count = 0;
    let size386x150Count = 0;
    let fallbackCount = 0;
    
    for (const file of imageFiles) {
      const inputPath = path.join(imagesDir, file);
      const outputPath = path.join(swatchesDir, file.replace(/\.[^/.]+$/, '.png'));
      
      try {
        // Get image metadata
        const metadata = await sharp(inputPath).metadata();
        const width = metadata.width;
        const height = metadata.height;
        
        console.log(`Processing ${file}: ${width}x${height}`);
        
        let swatchBuffer;
        
        if (width === 386 && height === 251) {
          // Crop from 105px left, 102px down, 113px by 108px
          swatchBuffer = await sharp(inputPath)
            .extract({ left: 48, top: 48, width: 113, height: 108 })
            .resize(50, 50) // Resize to standard swatch size
            .png()
            .toBuffer();
          size386x251Count++;
          console.log(`  ✓ Cropped from 386x251 (105,102 -> 113x108)`);
        } else if (width === 386 && height === 150) {
          // Crop from 60px left, 75px down, 110px by 105px
          // But 75 + 105 = 180, which exceeds height of 150
          // Adjust to fit within bounds: 60px left, 20px down, 110px by 130px (max possible)
          const cropTop = Math.max(0, 75 - (75 + 105 - height));
          const cropHeight = Math.min(105, height - cropTop);
          swatchBuffer = await sharp(inputPath)
            .extract({ left: 5, top: 22, width: 113, height: 108 })
            .resize(50, 50) // Resize to standard swatch size
            .png()
            .toBuffer();
          size386x150Count++;
          console.log(`  ✓ Cropped from 386x150 (60,${cropTop} -> 110x${cropHeight})`);
        } else {
          // Use solid white 50x50 image
          swatchBuffer = whiteImage;
          fallbackCount++;
          console.log(`  ⚠ Using fallback white image (${width}x${height})`);
        }
        
        // Save the swatch
        fs.writeFileSync(outputPath, swatchBuffer);
        processedCount++;
        
      } catch (error) {
        console.log(`  ✗ Error processing ${file}: ${error.message}`);
        // Use fallback for errors
        fs.writeFileSync(outputPath, whiteImage);
        fallbackCount++;
        processedCount++;
      }
    }
    
    console.log(`\nSwatch creation complete!`);
    console.log(`✓ Total processed: ${processedCount} swatches`);
    console.log(`✓ 386x251 images: ${size386x251Count} swatches`);
    console.log(`✓ 386x150 images: ${size386x150Count} swatches`);
    console.log(`⚠ Fallback white: ${fallbackCount} swatches`);
    console.log(`📁 Swatches saved to: ${swatchesDir}/`);
    
    // List created swatches
    const swatchFiles = fs.readdirSync(swatchesDir);
    console.log(`\nCreated swatches (${swatchFiles.length}):`);
    swatchFiles.forEach(file => {
      const stats = fs.statSync(path.join(swatchesDir, file));
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`  ${file} (${sizeKB}KB)`);
    });
    
  } catch (error) {
    console.error('Error creating swatches:', error);
  }
}

// Run the swatch creator
createSwatches();
