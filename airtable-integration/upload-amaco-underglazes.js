const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');
const https = require('https');
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
const UNDERGLAZES_TABLE_NAME = 'Underglazes';

// Initialize Airtable
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// Function to upload attachment directly to Airtable
async function uploadAttachmentToAirtable(imagePath, recordId, fieldId) {
  return new Promise((resolve, reject) => {
    try {
      const fullPath = path.resolve(__dirname, '..', imagePath);
      
      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        reject(new Error(`Image not found: ${imagePath}`));
        return;
      }

      const fileName = path.basename(imagePath);
      const fileExtension = path.extname(fileName).toLowerCase();
      
      // Determine content type
      let contentType = 'image/jpeg';
      if (fileExtension === '.png') {
        contentType = 'image/png';
      } else if (fileExtension === '.gif') {
        contentType = 'image/gif';
      }

      // Read the file
      const fileData = fs.readFileSync(fullPath);
      
      // Create the upload URL with record ID and field ID
      const uploadUrl = `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/${fieldId}/uploadAttachment`;
      
      // Prepare the payload
      const payload = {
        contentType: contentType,
        file: fileData.toString('base64'),
        filename: fileName
      };

      // Prepare the request options
      const options = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      };

      // Make the request
      const req = https.request(uploadUrl, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.fields) {
              // Success! Find the first attachment field in the response
              const fieldKeys = Object.keys(response.fields);
              const attachmentField = fieldKeys.find(key => 
                response.fields[key] && 
                Array.isArray(response.fields[key]) && 
                response.fields[key][0] && 
                response.fields[key][0].url
              );
              
              if (attachmentField && response.fields[attachmentField][0]) {
                const attachment = response.fields[attachmentField][0];
                resolve({
                  url: attachment.url,
                  filename: attachment.filename
                });
              } else {
                reject(new Error(`No attachment found in response: ${data}`));
              }
            } else if (response.url) {
              // Alternative success format
              resolve({
                url: response.url,
                filename: fileName
              });
            } else {
              reject(new Error(`Upload failed: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      // Write the JSON payload
      req.write(JSON.stringify(payload));
      req.end();

    } catch (error) {
      reject(error);
    }
  });
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

// Function to create Amaco Velvet Underglaze records with images
async function createAmacoUnderglazeRecordsWithImages() {
  // Filter for Amaco Velvet Underglaze entries
  const amacoUnderglazes = colors.underglazes.filter(underglaze => 
    underglaze.brand === 'Amaco Velvet Underglaze'
  );
  
  console.log(`Creating ${amacoUnderglazes.length} Amaco Velvet Underglaze records with images...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < amacoUnderglazes.length; i++) {
    const underglaze = amacoUnderglazes[i];
    try {
      console.log(`Processing underglaze ${i + 1}/${amacoUnderglazes.length}: ${underglaze.name}...`);
      
      // First create the record without the image
      const recordData = {
        'Underglaze Name': underglaze.name,
        'Brand': underglaze.brand
      };
      
      // Create the record
      const record = await base(UNDERGLAZES_TABLE_NAME).create(recordData);
      console.log(`✓ Created underglaze record: ${underglaze.name} (${underglaze.id})`);
      
      // Now upload the image to the created record
      try {
        const attachment = await uploadAttachmentToAirtable(underglaze.image, record.id, 'Color Chip');
        
        // Update the record with the image
        await base(UNDERGLAZES_TABLE_NAME).update(record.id, {
          'Color Chip': [attachment]
        });
        
        console.log(`✓ Image uploaded for: ${underglaze.name}`);
      } catch (imageError) {
        console.log(`⚠️  Image upload failed for ${underglaze.name}: ${imageError.message}`);
      }
      
      successCount++;
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error creating underglaze ${underglaze.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Amaco Velvet Underglaze records: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Main function
async function main() {
  console.log('🎨 Uploading new Amaco Velvet Underglaze colors to Airtable...\n');
  
  // Check if API key and base ID are set
  if (AIRTABLE_API_KEY === 'your_api_key_here' || AIRTABLE_BASE_ID === 'your_base_id_here') {
    console.log('❌ Please set your Airtable API key and Base ID first!');
    console.log('Edit credentials.js with your actual values');
    return;
  }
  
  try {
    // Test API connection
    console.log('🔍 Testing API connection...');
    const testTable = base(UNDERGLAZES_TABLE_NAME);
    await testTable.select({ maxRecords: 1 }).firstPage();
    console.log('✅ API connection successful!\n');
    
    // Create Amaco Velvet Underglaze records with images
    const results = await createAmacoUnderglazeRecordsWithImages();
    
    // Final summary
    console.log('\n🎉 Amaco Velvet Underglaze upload complete!');
    console.log(`📊 Total: ${results.successCount} records created, ${results.errorCount} errors`);
    
    if (results.successCount > 0) {
      console.log('\n✅ Upload successful!');
      console.log('Check your Airtable base to see the new Amaco Velvet Underglaze records with images.');
    } else {
      console.log('\n⚠️  No records were created. Check the error messages above.');
    }
    
  } catch (error) {
    console.error('Error during Amaco upload:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createAmacoUnderglazeRecordsWithImages,
  uploadAttachmentToAirtable,
  categorizeColor
};
