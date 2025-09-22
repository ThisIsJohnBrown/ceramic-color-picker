const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');
const http = require('http');
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

// Simple HTTP server to serve images
let imageServer;
const IMAGE_PORT = 8080;

function startImageServer() {
  return new Promise((resolve, reject) => {
    imageServer = http.createServer((req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      // Extract image path from URL
      const imagePath = req.url.substring(1); // Remove leading slash
      const fullPath = path.resolve(__dirname, '..', imagePath);
      
      // Check if file exists and is within our image directories
      if (!fs.existsSync(fullPath) || 
          (!fullPath.includes('glaze_images') && !fullPath.includes('underglaze_images'))) {
        res.writeHead(404);
        res.end('Image not found');
        return;
      }
      
      // Read and serve the image
      fs.readFile(fullPath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error reading image');
          return;
        }
        
        // Set appropriate content type
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    
    imageServer.listen(IMAGE_PORT, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`📡 Image server started on http://localhost:${IMAGE_PORT}`);
        resolve();
      }
    });
  });
}

function stopImageServer() {
  if (imageServer) {
    imageServer.close();
    console.log('📡 Image server stopped');
  }
}

// Function to create attachment object for Airtable
function createAttachment(imagePath) {
  try {
    const fullPath = path.resolve(__dirname, '..', imagePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.warn(`Image not found: ${imagePath}`);
      return null;
    }

    const fileName = path.basename(imagePath);
    
    // Create a proper attachment object for Airtable using localhost URL
    return {
      url: `http://localhost:${IMAGE_PORT}/${imagePath}`,
      filename: fileName
    };
    
  } catch (error) {
    console.error(`Error creating attachment for ${imagePath}:`, error.message);
    return null;
  }
}

// Function to categorize colors
function categorizeColor(hexColor) {
  const color = hexColor.toLowerCase();
  const cleanColor = color.startsWith('#') ? color.slice(1) : color;
  
  const r = parseInt(cleanColor.slice(0, 2), 16);
  const g = parseInt(cleanColor.slice(2, 4), 16);
  const b = parseInt(cleanColor.slice(4, 6), 16);
  
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  if (brightness < 50) return 'Dark';
  if (brightness > 200) return 'Light';
  
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

// Function to create glaze records with HTTP image uploads (LIMITED TO 3)
async function createGlazeRecordsWithImages() {
  console.log('Creating 3 glaze records with HTTP image uploads...');
  
  let successCount = 0;
  let errorCount = 0;
  
  // Only process first 3 glazes for testing
  const testGlazes = colors.glazes.slice(0, 3);
  
  for (const glaze of testGlazes) {
    try {
      console.log(`Processing glaze: ${glaze.name}...`);
      
      // Create the attachment object
      const attachment = createAttachment(glaze.image);
      
      // Prepare the record data
      const recordData = {
        'Glaze Name': glaze.name,
        'Color': glaze.color,
        'Notes': `ID: ${glaze.id} | Category: ${categorizeColor(glaze.color)}`
      };
      
      // Add the image attachment if successful
      if (attachment) {
        recordData['Sample Photos'] = [attachment];
        console.log(`✓ Image attachment prepared for: ${glaze.name}`);
      } else {
        console.log(`⚠️  Image attachment failed for: ${glaze.name}`);
      }
      
      // Create the record
      const record = await base(GLAZES_TABLE_NAME).create(recordData);
      console.log(`✓ Created glaze record: ${glaze.name} (${glaze.id})`);
      
      successCount++;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error creating glaze ${glaze.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Glaze records: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Function to create underglaze records with HTTP image uploads (LIMITED TO 3)
async function createUnderglazeRecordsWithImages() {
  console.log('Creating 3 underglaze records with HTTP image uploads...');
  
  let successCount = 0;
  let errorCount = 0;
  
  // Only process first 3 underglazes for testing
  const testUnderglazes = colors.underglazes.slice(0, 3);
  
  for (const underglaze of testUnderglazes) {
    try {
      console.log(`Processing underglaze: ${underglaze.name}...`);
      
      // Create the attachment object
      const attachment = createAttachment(underglaze.image);
      
      // Prepare the record data
      const recordData = {
        'Underglaze Name': underglaze.name,
        'Color': underglaze.left,
        'Notes': `ID: ${underglaze.id} | Left: ${underglaze.left} | Top: ${underglaze.top} | Category: ${categorizeColor(underglaze.left)}`
      };
      
      // Add the image attachment if successful
      if (attachment) {
        recordData['Photo'] = [attachment];
        console.log(`✓ Image attachment prepared for: ${underglaze.name}`);
      } else {
        console.log(`⚠️  Image attachment failed for: ${underglaze.name}`);
      }
      
      // Create the record
      const record = await base(UNDERGLAZES_TABLE_NAME).create(recordData);
      console.log(`✓ Created underglaze record: ${underglaze.name} (${underglaze.id})`);
      
      successCount++;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error creating underglaze ${underglaze.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Underglaze records: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Main function
async function main() {
  console.log('🌐 Testing HTTP image upload to Airtable...\n');
  
  // Check if API key and base ID are set
  if (AIRTABLE_API_KEY === 'your_api_key_here' || AIRTABLE_BASE_ID === 'your_base_id_here') {
    console.log('❌ Please set your Airtable API key and Base ID first!');
    console.log('Edit credentials.js with your actual values');
    return;
  }
  
  try {
    // Start image server
    await startImageServer();
    
    // Test API connection
    console.log('🔍 Testing API connection...');
    const testTable = base(GLAZES_TABLE_NAME);
    await testTable.select({ maxRecords: 1 }).firstPage();
    console.log('✅ API connection successful!\n');
    
    // Create 3 glaze records with HTTP image uploads
    const glazeResults = await createGlazeRecordsWithImages();
    
    // Create 3 underglaze records with HTTP image uploads
    const underglazeResults = await createUnderglazeRecordsWithImages();
    
    // Final summary
    const totalSuccess = glazeResults.successCount + underglazeResults.successCount;
    const totalErrors = glazeResults.errorCount + underglazeResults.errorCount;
    
    console.log('\n🎉 HTTP image upload test complete!');
    console.log(`📊 Total: ${totalSuccess} records created, ${totalErrors} errors`);
    console.log(`   📋 Glazes: ${glazeResults.successCount} records`);
    console.log(`   📋 Underglazes: ${underglazeResults.successCount} records`);
    
    if (totalSuccess === 6) {
      console.log('\n✅ Image upload test successful!');
      console.log('Check your Airtable base to see if the images were actually uploaded.');
      console.log('Note: Images are served from localhost - they will only work while this server is running.');
    } else {
      console.log('\n⚠️  Some records failed. Check the error messages above.');
    }
    
  } catch (error) {
    console.error('Error during HTTP image upload test:', error.message);
  } finally {
    // Stop the image server
    stopImageServer();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  stopImageServer();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createGlazeRecordsWithImages,
  createUnderglazeRecordsWithImages,
  createAttachment,
  categorizeColor
};
