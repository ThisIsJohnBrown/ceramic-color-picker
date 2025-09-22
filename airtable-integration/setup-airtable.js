const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');
const colors = require('../colors.json');

// Try to load credentials from file, fallback to environment variables
let credentials;
try {
  credentials = require('./credentials.js');
} catch (error) {
  // Fallback to environment variables or defaults
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

// Function to upload image to Airtable
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
    
    // For now, skip image upload and just return null
    // Images can be added manually later
    console.log(`Skipping image upload for ${fileName} (will add manually later)`);
    return null;
    
  } catch (error) {
    console.error(`Error uploading image ${imagePath}:`, error.message);
    return null;
  }
}

// Function to create records for glazes
async function createGlazeRecords() {
  console.log('Creating glaze records...');
  
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
      console.log(`✓ Created glaze: ${glaze.name} (${glaze.id})`);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error creating glaze ${glaze.name}:`, error.message);
    }
  }
}

// Function to create records for underglazes
async function createUnderglazeRecords() {
  console.log('Creating underglaze records...');
  
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
      console.log(`✓ Created underglaze: ${underglaze.name} (${underglaze.id})`);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error creating underglaze ${underglaze.name}:`, error.message);
    }
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

// Function to create the table structure (run this first)
async function createTableStructure() {
  console.log('Creating table structure...');
  
  try {
    // This is a placeholder - you'll need to create the tables manually in Airtable
    // with the following fields:
    console.log(`
    Please create TWO tables in your Airtable base:

    📋 TABLE 1: "${GLAZES_TABLE_NAME}"
    Field Name          | Field Type
    --------------------|------------------
    ID                 | Single Line Text
    Name               | Single Line Text
    Color              | Single Line Text
    Image              | Attachment
    Color Category     | Single Select (Dark, Light, Orange/Red, Red/Pink, Green, Blue, Yellow, Purple, Neutral, Other)
    Created            | Date

    📋 TABLE 2: "${UNDERGLAZES_TABLE_NAME}"
    Field Name          | Field Type
    --------------------|------------------
    ID                 | Single Line Text
    Name               | Single Line Text
    Left Color         | Single Line Text
    Top Color          | Single Line Text
    Image              | Attachment
    Color Category     | Single Select (Dark, Light, Orange/Red, Red/Pink, Green, Blue, Yellow, Purple, Neutral, Other)
    Created            | Date
    `);
    
    console.log('After creating both table structures, run the script again to populate them.');
    
  } catch (error) {
    console.error('Error creating table structure:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Airtable setup for Ceramic Colors...\n');
  
  // Check if API key and base ID are set
  if (AIRTABLE_API_KEY === 'your_api_key_here' || AIRTABLE_BASE_ID === 'your_base_id_here') {
    console.log('❌ Please set your Airtable API key and Base ID first!');
    console.log('\n📝 To set up credentials:');
    console.log('1. Copy credentials.example to credentials.js:');
    console.log('   cp credentials.example credentials.js');
    console.log('2. Edit credentials.js with your actual values');
    console.log('3. Run the setup again: npm run setup');
    console.log('\n🔑 Get your credentials from:');
    console.log('   API Key: https://airtable.com/create/tokens');
    console.log('   Base ID: https://airtable.com/developers/web/api/introduction');
    return;
  }

  // Test API connection first
  console.log('🔍 Testing API connection...');
  try {
    const testTable1 = base(GLAZES_TABLE_NAME);
    const testTable2 = base(UNDERGLAZES_TABLE_NAME);
    await testTable1.select({ maxRecords: 1 }).firstPage();
    await testTable2.select({ maxRecords: 1 }).firstPage();
    console.log('✅ API connection successful!');
  } catch (error) {
    console.log('❌ API connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure your API token has "data.records:write" and "data.records:read" permissions');
    console.log('2. Make sure your Base ID is correct');
    console.log(`3. Make sure both tables "${GLAZES_TABLE_NAME}" and "${UNDERGLAZES_TABLE_NAME}" exist in your base`);
    return;
  }
  
  try {
    // First, show the table structure to create
    await createTableStructure();
    
    // Ask user if they want to continue
    console.log('\nPress Ctrl+C to exit, or wait 5 seconds to continue with data population...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Create glaze records
    await createGlazeRecords();
    
    // Create underglaze records
    await createUnderglazeRecords();
    
    console.log('\n🎉 All done! Your Airtable tables have been populated:');
    console.log(`   📋 ${GLAZES_TABLE_NAME}: 80 glaze records`);
    console.log(`   📋 ${UNDERGLAZES_TABLE_NAME}: 61 underglaze records`);
    
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
  createTableStructure,
  categorizeColor
};
