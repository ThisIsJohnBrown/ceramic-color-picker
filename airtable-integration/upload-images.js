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
    
    // Create a temporary file URL for Airtable
    // For now, we'll skip the actual upload and just return a placeholder
    // The images will need to be uploaded manually or via a different method
    console.log(`📷 Would upload: ${fileName} (${Math.round(fileBuffer.length / 1024)}KB)`);
    
    // Return null for now - images will need manual upload
    return null;
    
  } catch (error) {
    console.error(`Error processing image ${imagePath}:`, error.message);
    return null;
  }
}

// Function to find record by name
async function findRecordByName(tableName, nameField, name) {
  try {
    const table = base(tableName);
    const records = await table.select({
      filterByFormula: `{${nameField}} = "${name}"`,
      maxRecords: 1
    }).firstPage();
    
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    console.error(`Error finding record ${name} in ${tableName}:`, error.message);
    return null;
  }
}

// Function to update record with image
async function updateRecordWithImage(record, imageField, imageAttachment) {
  try {
    if (!imageAttachment) return false;
    
    await record.updateFields({
      [imageField]: [imageAttachment]
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating record ${record.id}:`, error.message);
    return false;
  }
}

// Function to upload glaze images
async function uploadGlazeImages() {
  console.log('🖼️  Uploading glaze images...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const glaze of colors.glazes) {
    try {
      // Find the record by name
      const record = await findRecordByName(GLAZES_TABLE_NAME, 'Glaze Name', glaze.name);
      
      if (!record) {
        console.warn(`⚠️  Record not found for glaze: ${glaze.name}`);
        errorCount++;
        continue;
      }
      
      // Upload the image
      const imageAttachment = await uploadImage(glaze.image);
      
      if (imageAttachment) {
        // Update the record with the image
        const updated = await updateRecordWithImage(record, 'Sample Photos', imageAttachment);
        
        if (updated) {
          console.log(`✓ Uploaded image for: ${glaze.name}`);
          successCount++;
        } else {
          console.error(`✗ Failed to update record for: ${glaze.name}`);
          errorCount++;
        }
      } else {
        console.warn(`⚠️  No image uploaded for: ${glaze.name}`);
        errorCount++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Error processing glaze ${glaze.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Glaze images summary: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Function to upload underglaze images
async function uploadUnderglazeImages() {
  console.log('🖼️  Uploading underglaze images...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const underglaze of colors.underglazes) {
    try {
      // Find the record by name
      const record = await findRecordByName(UNDERGLAZES_TABLE_NAME, 'Underglaze Name', underglaze.name);
      
      if (!record) {
        console.warn(`⚠️  Record not found for underglaze: ${underglaze.name}`);
        errorCount++;
        continue;
      }
      
      // Upload the image
      const imageAttachment = await uploadImage(underglaze.image);
      
      if (imageAttachment) {
        // Update the record with the image
        const updated = await updateRecordWithImage(record, 'Photo', imageAttachment);
        
        if (updated) {
          console.log(`✓ Uploaded image for: ${underglaze.name}`);
          successCount++;
        } else {
          console.error(`✗ Failed to update record for: ${underglaze.name}`);
          errorCount++;
        }
      } else {
        console.warn(`⚠️  No image uploaded for: ${underglaze.name}`);
        errorCount++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Error processing underglaze ${underglaze.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Underglaze images summary: ${successCount} successful, ${errorCount} errors`);
  return { successCount, errorCount };
}

// Main function
async function main() {
  console.log('🚀 Starting image upload to Airtable...\n');
  
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
    
    // Upload glaze images
    const glazeResults = await uploadGlazeImages();
    
    // Upload underglaze images
    const underglazeResults = await uploadUnderglazeImages();
    
    // Final summary
    const totalSuccess = glazeResults.successCount + underglazeResults.successCount;
    const totalErrors = glazeResults.errorCount + underglazeResults.errorCount;
    
    console.log('\n🎉 Image upload complete!');
    console.log(`📊 Total: ${totalSuccess} successful, ${totalErrors} errors`);
    
    if (totalErrors > 0) {
      console.log('\n💡 Tips for fixing errors:');
      console.log('- Check that image files exist in the correct directories');
      console.log('- Verify that records exist in Airtable with matching names');
      console.log('- Check API permissions for attachment uploads');
    }
    
  } catch (error) {
    console.error('Error during image upload:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  uploadGlazeImages,
  uploadUnderglazeImages,
  uploadImage
};
