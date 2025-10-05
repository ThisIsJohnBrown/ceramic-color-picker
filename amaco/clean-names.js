const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function cleanProductNames() {
  try {
    // Read the current CSV file
    const csvContent = fs.readFileSync('amaco-velvet-underglazes-final.csv', 'utf8');
    const lines = csvContent.split('\n');
    
    const cleanedProducts = [];
    
    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(',');
      if (columns.length >= 3) {
        const id = columns[0];
        let name = columns[1];
        const imageUrl = columns[2];
        
        // Remove the ID from the name (e.g., "V-301 Ivory Beige Underglaze" -> "Ivory Beige Underglaze")
        if (name.startsWith(id + ' ')) {
          name = name.substring(id.length + 1);
        }
        
        cleanedProducts.push({
          id: id,
          name: name,
          imageUrl: imageUrl
        });
      }
    }
    
    // Write the cleaned data to a new CSV
    const csvWriter = createCsvWriter({
      path: 'amaco-velvet-underglazes-final.csv',
      header: [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Name' },
        { id: 'imageUrl', title: 'Image URL' }
      ]
    });
    
    await csvWriter.writeRecords(cleanedProducts);
    console.log(`Cleaned ${cleanedProducts.length} product names`);
    console.log('Updated CSV file: amaco-velvet-underglazes-final.csv');
    
    // Show first few examples
    console.log('\nFirst 5 cleaned products:');
    cleanedProducts.slice(0, 5).forEach(product => {
      console.log(`${product.id}: ${product.name}`);
    });
    
  } catch (error) {
    console.error('Error cleaning names:', error);
  }
}

cleanProductNames();


