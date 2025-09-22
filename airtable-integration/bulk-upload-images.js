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

// Function to create a CSV file with image mappings
function createImageMappingCSV() {
  console.log('📝 Creating image mapping CSV files...');
  
  // Create glaze mapping
  const glazeMappings = colors.glazes.map(glaze => {
    const imagePath = path.resolve(__dirname, '..', glaze.image);
    const fileName = path.basename(glaze.image);
    const fileExists = fs.existsSync(imagePath);
    
    return {
      'Glaze Name': glaze.name,
      'ID': glaze.id,
      'Image File': fileName,
      'Image Path': glaze.image,
      'File Exists': fileExists ? 'Yes' : 'No',
      'File Size (KB)': fileExists ? Math.round(fs.statSync(imagePath).size / 1024) : 'N/A'
    };
  });
  
  // Create underglaze mapping
  const underglazeMappings = colors.underglazes.map(underglaze => {
    const imagePath = path.resolve(__dirname, '..', underglaze.image);
    const fileName = path.basename(underglaze.image);
    const fileExists = fs.existsSync(imagePath);
    
    return {
      'Underglaze Name': underglaze.name,
      'ID': underglaze.id,
      'Image File': fileName,
      'Image Path': underglaze.image,
      'File Exists': fileExists ? 'Yes' : 'No',
      'File Size (KB)': fileExists ? Math.round(fs.statSync(imagePath).size / 1024) : 'N/A'
    };
  });
  
  // Write glaze CSV
  const glazeCSV = [
    'Glaze Name,ID,Image File,Image Path,File Exists,File Size (KB)',
    ...glazeMappings.map(row => 
      `"${row['Glaze Name']}","${row.ID}","${row['Image File']}","${row['Image Path']}","${row['File Exists']}","${row['File Size (KB)']}"`
    )
  ].join('\n');
  
  fs.writeFileSync('glaze-image-mapping.csv', glazeCSV);
  console.log('✅ Created glaze-image-mapping.csv');
  
  // Write underglaze CSV
  const underglazeCSV = [
    'Underglaze Name,ID,Image File,Image Path,File Exists,File Size (KB)',
    ...underglazeMappings.map(row => 
      `"${row['Underglaze Name']}","${row.ID}","${row['Image File']}","${row['Image Path']}","${row['File Exists']}","${row['File Size (KB)']}"`
    )
  ].join('\n');
  
  fs.writeFileSync('underglaze-image-mapping.csv', underglazeCSV);
  console.log('✅ Created underglaze-image-mapping.csv');
  
  return { glazeMappings, underglazeMappings };
}

// Function to create a bulk upload script for Airtable
function createBulkUploadScript() {
  console.log('📝 Creating bulk upload instructions...');
  
  const instructions = `
# Bulk Image Upload Instructions for Airtable

## Method 1: Using Airtable's Bulk Upload Feature

1. **Go to your Airtable base**
2. **Select the Glazes table**
3. **Click the "..." menu → "Import data"**
4. **Choose "Upload files"**
5. **Select all images from the glaze_images folder**
6. **Map the files to the "Sample Photos" field**
7. **Repeat for Underglazes table with underglaze_images folder**

## Method 2: Using Airtable's API with a File Upload Service

Since direct image upload via API is complex, here are the steps:

1. **Upload images to a cloud service** (Google Drive, Dropbox, etc.)
2. **Get public URLs for each image**
3. **Use the CSV files created** to map images to records
4. **Update records with image URLs**

## Method 3: Manual Upload (Recommended for small collections)

1. **Open each record in Airtable**
2. **Click on the Photo/Sample Photos field**
3. **Upload the corresponding image** from the mapping files

## Image Mapping Files Created:

- **glaze-image-mapping.csv** - Maps glaze names to image files
- **underglaze-image-mapping.csv** - Maps underglaze names to image files

These files show:
- Record name
- Image file name
- Whether the file exists
- File size

## Next Steps:

1. Check the CSV files to verify all images exist
2. Use your preferred method to upload images
3. Match images to records using the mapping files

## File Locations:

- Glaze images: ../glaze_images/
- Underglaze images: ../underglaze_images/
`;

  fs.writeFileSync('BULK_UPLOAD_INSTRUCTIONS.md', instructions);
  console.log('✅ Created BULK_UPLOAD_INSTRUCTIONS.md');
}

// Function to verify all images exist
function verifyImages() {
  console.log('🔍 Verifying image files...');
  
  let missingImages = [];
  let totalImages = 0;
  
  // Check glaze images
  for (const glaze of colors.glazes) {
    totalImages++;
    const imagePath = path.resolve(__dirname, '..', glaze.image);
    if (!fs.existsSync(imagePath)) {
      missingImages.push(`Glaze: ${glaze.name} - ${glaze.image}`);
    }
  }
  
  // Check underglaze images
  for (const underglaze of colors.underglazes) {
    totalImages++;
    const imagePath = path.resolve(__dirname, '..', underglaze.image);
    if (!fs.existsSync(imagePath)) {
      missingImages.push(`Underglaze: ${underglaze.name} - ${underglaze.image}`);
    }
  }
  
  console.log(`📊 Image verification complete:`);
  console.log(`   Total images: ${totalImages}`);
  console.log(`   Found: ${totalImages - missingImages.length}`);
  console.log(`   Missing: ${missingImages.length}`);
  
  if (missingImages.length > 0) {
    console.log('\n❌ Missing images:');
    missingImages.forEach(img => console.log(`   - ${img}`));
  } else {
    console.log('\n✅ All images found!');
  }
  
  return missingImages.length === 0;
}

// Main function
async function main() {
  console.log('🚀 Starting bulk image upload preparation...\n');
  
  // Check if API key and base ID are set
  if (AIRTABLE_API_KEY === 'your_api_key_here' || AIRTABLE_BASE_ID === 'your_base_id_here') {
    console.log('❌ Please set your Airtable API key and Base ID first!');
    console.log('Edit credentials.js with your actual values');
    return;
  }
  
  try {
    // Verify images exist
    const allImagesExist = verifyImages();
    
    if (!allImagesExist) {
      console.log('\n⚠️  Some images are missing. Please check the list above.');
    }
    
    // Create mapping files
    const mappings = createImageMappingCSV();
    
    // Create instructions
    createBulkUploadScript();
    
    console.log('\n🎉 Preparation complete!');
    console.log('\n📁 Files created:');
    console.log('   - glaze-image-mapping.csv');
    console.log('   - underglaze-image-mapping.csv');
    console.log('   - BULK_UPLOAD_INSTRUCTIONS.md');
    
    console.log('\n💡 Next steps:');
    console.log('1. Review the CSV files to see image mappings');
    console.log('2. Follow the instructions in BULK_UPLOAD_INSTRUCTIONS.md');
    console.log('3. Upload images using your preferred method');
    
  } catch (error) {
    console.error('Error during preparation:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createImageMappingCSV,
  createBulkUploadScript,
  verifyImages
};
