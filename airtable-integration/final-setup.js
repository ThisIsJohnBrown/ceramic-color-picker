const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');
const colors = require('../colors.json');

// Load credentials
let credentials;
try {
  credentials = require('./credentials.js');
} catch (error) {
  credentials = {
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || 'your_api_key_here',
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || 'your_base_id_here'
  };
}

const AIRTABLE_API_KEY = credentials.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = credentials.AIRTABLE_BASE_ID;
const GLAZES_TABLE_NAME = 'Glazes';
const UNDERGLAZES_TABLE_NAME = 'Underglazes';

// Initialize Airtable
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// Function to create a public URL for an image (you'll need to host these somewhere)
function createImageUrl(imagePath) {
  // For now, we'll just note the local path
  // You can upload these to a cloud service and get public URLs
  const fileName = path.basename(imagePath);
  return `https://your-domain.com/images/${fileName}`; // Replace with your actual domain
}

// Function to categorize colors for easier filtering
function categorizeColor(hexColor) {
  const color = hexColor.toLowerCase();
  
  // Remove # if present
  const cleanColor = color.startsWith('#') ? color.slice(1) : color;
  
  // Convert to RGB
  const r = parseInt(cleanColor.slice(0, 2), 16);
  const g = parseInt(cleanColor.slice(2, 4), 16);
  const b = parseInt(cleanColor.slice(4, 6), 16);
  
  // Calculate brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Determine color family
  if (brightness < 50) return 'Dark';
  if (brightness > 200) return 'Light';
  
  // Color family based on dominant RGB values
  if (r > g && r > b) {
    if (g > b) return 'Orange/Red';
    return 'Red/Pink';
  } else if (g > r && g > b) {
    return 'Green';
  } else if (b > r && b > g) {
    return 'Blue';
  } else if (r > 150 && g > 150 && b < 100) {
    return 'Yellow';
  } else if (r > 100 && g < 100 && b > 100) {
    return 'Purple';
  } else if (r > 100 && g > 100 && b > 100) {
    return 'Neutral';
  }
  
  return 'Other';
}

// Function to create glaze records with image references
async function createGlazeRecords() {
  console.log('Creating glaze records with image references...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const glaze of colors.glazes) {
    try {
      // Check if image exists
      const imagePath = path.resolve(__dirname, '..', glaze.image);
      const imageExists = fs.existsSync(imagePath);
      const fileName = path.basename(glaze.image);
      
      // Prepare the record data
      const recordData = {
        'Glaze Name': glaze.name,
        'Color': glaze.color,
        'Notes': `ID: ${glaze.id} | Category: ${categorizeColor(glaze.color)} | Image: ${fileName} | Image Exists: ${imageExists ? 'Yes' : 'No'}`
      };
      
      // Add image URL if you have one
      if (imageExists) {
        recordData['Sample Photos'] = [{
          url: createImageUrl(glaze.image),
          filename: fileName
        }];
      }
      
      // Create the record
      const record = await base(GLAZES_TABLE_NAME).create(recordData);
      console.log(`✓ Created glaze: ${glaze.name} (${glaze.id}) - Image: ${fileName}`);
      
      successCount++;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error creating glaze ${glaze.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Glaze records: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Function to create underglaze records with image references
async function createUnderglazeRecords() {
  console.log('Creating underglaze records with image references...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const underglaze of colors.underglazes) {
    try {
      // Check if image exists
      const imagePath = path.resolve(__dirname, '..', underglaze.image);
      const imageExists = fs.existsSync(imagePath);
      const fileName = path.basename(underglaze.image);
      
      // Prepare the record data
      const recordData = {
        'Underglaze Name': underglaze.name,
        'Color': underglaze.left, // Using left color as primary
        'Notes': `ID: ${underglaze.id} | Left: ${underglaze.left} | Top: ${underglaze.top} | Category: ${categorizeColor(underglaze.left)} | Image: ${fileName} | Image Exists: ${imageExists ? 'Yes' : 'No'}`
      };
      
      // Add image URL if you have one
      if (imageExists) {
        recordData['Photo'] = [{
          url: createImageUrl(underglaze.image),
          filename: fileName
        }];
      }
      
      // Create the record
      const record = await base(UNDERGLAZES_TABLE_NAME).create(recordData);
      console.log(`✓ Created underglaze: ${underglaze.name} (${underglaze.id}) - Image: ${fileName}`);
      
      successCount++;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error creating underglaze ${underglaze.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Underglaze records: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Function to create image upload instructions
function createImageUploadInstructions() {
  const instructions = `
# Image Upload Instructions

## Current Status
✅ All records created with image references
📁 Image files are ready in your local directories
🔄 Images need to be uploaded to a cloud service

## Next Steps

### Option 1: Upload to Cloud Service (Recommended)
1. Upload all images to Google Drive, Dropbox, or similar
2. Get public URLs for each image
3. Update the createImageUrl() function with your domain
4. Re-run the script to add image URLs

### Option 2: Manual Upload to Airtable
1. Go to each record in Airtable
2. Click on the Photo/Sample Photos field
3. Upload the corresponding image file
4. Use the Notes field to see which image file goes with each record

### Option 3: Use Airtable's Import Feature
1. Go to your Airtable base
2. Click "Add a table" → "Import a spreadsheet"
3. Use the CSV files created earlier
4. Map the image files to the attachment fields

## File Locations
- Glaze images: ../glaze_images/ (80 files)
- Underglaze images: ../underglaze_images/ (61 files)

## Image Mapping
Each record's Notes field shows:
- Record ID
- Color information
- Image filename
- Whether the image file exists locally
`;

  fs.writeFileSync('IMAGE_UPLOAD_INSTRUCTIONS.md', instructions);
  console.log('✅ Created IMAGE_UPLOAD_INSTRUCTIONS.md');
}

// Main function
async function main() {
  console.log('🚀 Starting final Airtable setup with image references...\n');
  
  // Check if API key and base ID are set
  if (AIRTABLE_API_KEY === 'your_api_key_here' || AIRTABLE_BASE_ID === 'your_base_id_here') {
    console.log('❌ Please set your Airtable API key and Base ID first!');
    console.log('Edit credentials.js with your actual values');
    return;
  }
  
  try {
    // Test API connection
    console.log('🔍 Testing API connection...');
    const testTable = base(GLAZES_TABLE_NAME);
    await testTable.select({ maxRecords: 1 }).firstPage();
    console.log('✅ API connection successful!\n');
    
    // Create glaze records with image references
    const glazeResults = await createGlazeRecords();
    
    // Create underglaze records with image references
    const underglazeResults = await createUnderglazeRecords();
    
    // Create image upload instructions
    createImageUploadInstructions();
    
    // Final summary
    const totalSuccess = glazeResults.successCount + underglazeResults.successCount;
    const totalErrors = glazeResults.errorCount + underglazeResults.errorCount;
    
    console.log('\n🎉 Final setup complete!');
    console.log(`📊 Total: ${totalSuccess} records created, ${totalErrors} errors`);
    console.log(`   📋 Glazes: ${glazeResults.successCount} records`);
    console.log(`   📋 Underglazes: ${underglazeResults.successCount} records`);
    
    console.log('\n📁 Files created:');
    console.log('   - IMAGE_UPLOAD_INSTRUCTIONS.md');
    console.log('   - glaze-image-mapping.csv (from previous run)');
    console.log('   - underglaze-image-mapping.csv (from previous run)');
    
    console.log('\n💡 Next steps:');
    console.log('1. Read IMAGE_UPLOAD_INSTRUCTIONS.md for image upload options');
    console.log('2. Choose your preferred method to add images');
    console.log('3. Your Airtable base is ready with all the data!');
    
  } catch (error) {
    console.error('Error during setup:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createGlazeRecords,
  createUnderglazeRecords,
  createImageUrl,
  categorizeColor
};
