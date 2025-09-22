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

// Function to upload image to Airtable using the correct API
async function uploadImage(imagePath) {
  try {
    const fullPath = path.resolve(__dirname, '..', imagePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.warn(`Image not found: ${imagePath}`);
      return null;
    }

    // Read the file
    const fileBuffer = fs.readFileSync(fullPath);
    const fileName = path.basename(imagePath);
    
    // Create attachment using the correct Airtable API
    const attachment = await base.attachment.create({
      url: `data:image/jpeg;base64,${fileBuffer.toString('base64')}`,
      filename: fileName
    });
    
    return attachment;
  } catch (error) {
    console.error(`Error uploading image ${imagePath}:`, error.message);
    return null;
  }
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

// Function to create glaze records with images
async function createGlazeRecords() {
  console.log('Creating glaze records with images...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const glaze of colors.glazes) {
    try {
      // Upload the image
      const imageAttachment = await uploadImage(glaze.image);
      
      // Prepare the record data
      const recordData = {
        'Glaze Name': glaze.name,
        'Color': glaze.color,
        'Sample Photos': imageAttachment ? [imageAttachment] : [],
        'Notes': `ID: ${glaze.id} | Category: ${categorizeColor(glaze.color)}`
      };
      
      // Create the record
      const record = await base(GLAZES_TABLE_NAME).create(recordData);
      console.log(`✓ Created glaze: ${glaze.name} (${glaze.id}) ${imageAttachment ? 'with image' : 'without image'}`);
      
      successCount++;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`Error creating glaze ${glaze.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Glaze records: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Function to create underglaze records with images
async function createUnderglazeRecords() {
  console.log('Creating underglaze records with images...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const underglaze of colors.underglazes) {
    try {
      // Upload the image
      const imageAttachment = await uploadImage(underglaze.image);
      
      // Prepare the record data
      const recordData = {
        'Underglaze Name': underglaze.name,
        'Color': underglaze.left, // Using left color as primary
        'Photo': imageAttachment ? [imageAttachment] : [],
        'Notes': `ID: ${underglaze.id} | Left: ${underglaze.left} | Top: ${underglaze.top} | Category: ${categorizeColor(underglaze.left)}`
      };
      
      // Create the record
      const record = await base(UNDERGLAZES_TABLE_NAME).create(recordData);
      console.log(`✓ Created underglaze: ${underglaze.name} (${underglaze.id}) ${imageAttachment ? 'with image' : 'without image'}`);
      
      successCount++;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`Error creating underglaze ${underglaze.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Underglaze records: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Function to clear existing records (optional)
async function clearExistingRecords() {
  console.log('🧹 Clearing existing records...');
  
  try {
    // Clear glazes
    const glazeRecords = await base(GLAZES_TABLE_NAME).select().all();
    if (glazeRecords.length > 0) {
      const glazeIds = glazeRecords.map(record => record.id);
      await base(GLAZES_TABLE_NAME).destroy(glazeIds);
      console.log(`✓ Cleared ${glazeRecords.length} glaze records`);
    }
    
    // Clear underglazes
    const underglazeRecords = await base(UNDERGLAZES_TABLE_NAME).select().all();
    if (underglazeRecords.length > 0) {
      const underglazeIds = underglazeRecords.map(record => record.id);
      await base(UNDERGLAZES_TABLE_NAME).destroy(underglazeIds);
      console.log(`✓ Cleared ${underglazeRecords.length} underglaze records`);
    }
    
  } catch (error) {
    console.error('Error clearing records:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting complete Airtable setup with images...\n');
  
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
    
    // Ask if user wants to clear existing records
    console.log('⚠️  This will create new records. If you have existing records, they will be duplicated.');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Clear existing records
    await clearExistingRecords();
    
    // Create glaze records with images
    const glazeResults = await createGlazeRecords();
    
    // Create underglaze records with images
    const underglazeResults = await createUnderglazeRecords();
    
    // Final summary
    const totalSuccess = glazeResults.successCount + underglazeResults.successCount;
    const totalErrors = glazeResults.errorCount + underglazeResults.errorCount;
    
    console.log('\n🎉 Complete setup finished!');
    console.log(`📊 Total: ${totalSuccess} records created, ${totalErrors} errors`);
    console.log(`   📋 Glazes: ${glazeResults.successCount} records`);
    console.log(`   📋 Underglazes: ${underglazeResults.successCount} records`);
    
    if (totalErrors > 0) {
      console.log('\n💡 Some records failed to create. Check the error messages above.');
    }
    
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
  uploadImage,
  categorizeColor
};
