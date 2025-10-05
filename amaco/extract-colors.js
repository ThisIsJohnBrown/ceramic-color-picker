const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function extractColorsFromSwatches() {
  try {
    // Read the current colors.json file
    const colorsPath = '/Users/johnbrown/Environments/ceramic-color-picker/colors.json';
    const colorsData = JSON.parse(fs.readFileSync(colorsPath, 'utf8'));
    
    // Get all swatch files
    const swatchesDir = 'swatches';
    const swatchFiles = fs.readdirSync(swatchesDir).filter(file => file.endsWith('.png'));
    
    console.log(`Found ${swatchFiles.length} swatch files to process`);
    
    const newUnderglazes = [];
    
    for (const file of swatchFiles) {
      const swatchPath = path.join(swatchesDir, file);
      const productId = file.replace('-Underglaze.png', '').replace('.png', '');
      
      // Extract product name from filename
      let productName = file.replace('.png', '');
      // Convert V-XXX-Product-Name format to just Product Name
      productName = productName.replace(/^V-\d+-/, '');
      // Convert dashes to spaces and capitalize
      productName = productName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      console.log(`Processing ${productId}: ${productName}`);
      
      try {
        // Get image metadata
        const metadata = await sharp(swatchPath).metadata();
        const width = metadata.width;
        const height = metadata.height;
        
        // Calculate sampling positions
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const leftX = Math.floor(centerX - (width * 0.25)); // 25% to the left
        const rightX = Math.floor(centerX + (width * 0.25)); // 25% to the right
        
        // Ensure coordinates are within bounds
        const leftSampleX = Math.max(0, Math.min(leftX, width - 1));
        const rightSampleX = Math.max(0, Math.min(rightX, width - 1));
        
        console.log(`  Image size: ${width}x${height}`);
        console.log(`  Sampling at: left(${leftSampleX},${centerY}), right(${rightSampleX},${centerY})`);
        
        // Extract color samples
        const leftColor = await extractColorAt(swatchPath, leftSampleX, centerY);
        const rightColor = await extractColorAt(swatchPath, rightSampleX, centerY);
        
        console.log(`  Left (unglazed): ${leftColor}`);
        console.log(`  Right (glazed): ${rightColor}`);
        
        // Create underglaze entry
        const underglazeEntry = {
          id: productId,
          brand: "Amaco Velvet Underglaze",
          name: productName,
          left: leftColor,    // unglazed
          top: rightColor,    // glazed (mapped from right)
          image: `amaco/swatches/${file}`
        };
        
        newUnderglazes.push(underglazeEntry);
        
      } catch (error) {
        console.log(`  ✗ Error processing ${file}: ${error.message}`);
      }
    }
    
    console.log(`\nExtracted ${newUnderglazes.length} underglaze entries`);
    
    // Add new underglazes to the existing array
    colorsData.underglazes = colorsData.underglazes.concat(newUnderglazes);
    
    // Write updated colors.json
    fs.writeFileSync(colorsPath, JSON.stringify(colorsData, null, 2));
    console.log(`\nUpdated colors.json with ${newUnderglazes.length} new underglazes`);
    
    // Show summary
    console.log('\nNew underglazes added:');
    newUnderglazes.forEach(ug => {
      console.log(`  ${ug.id}: ${ug.name} (${ug.left} / ${ug.top})`);
    });
    
  } catch (error) {
    console.error('Error extracting colors:', error);
  }
}

async function extractColorAt(imagePath, x, y) {
  try {
    // Get a small region around the specified point and blur it
    const { data, info } = await sharp(imagePath)
      .extract({ 
        left: Math.max(0, x - 2), 
        top: Math.max(0, y - 2), 
        width: 5, 
        height: 5 
      })
      .blur(1) // Slight blur for averaging
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Calculate average color
    let r = 0, g = 0, b = 0;
    const pixelCount = info.width * info.height;
    
    for (let i = 0; i < data.length; i += info.channels) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    
    r = Math.round(r / pixelCount);
    g = Math.round(g / pixelCount);
    b = Math.round(b / pixelCount);
    
    // Convert to hex
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return hex;
    
  } catch (error) {
    console.log(`    Error extracting color at (${x},${y}): ${error.message}`);
    return '#ffffff'; // Fallback to white
  }
}

// Run the color extractor
extractColorsFromSwatches();


