const Airtable = require('airtable');
const credentials = require('./credentials.js');

const base = new Airtable({ apiKey: credentials.AIRTABLE_API_KEY }).base(credentials.AIRTABLE_BASE_ID);

async function testFields() {
  try {
    console.log('Testing Glazes table fields...');
    const glazesTable = base('Glazes');
    const records = await glazesTable.select({ maxRecords: 1 }).firstPage();
    
    if (records.length > 0) {
      console.log('Available fields in Glazes table:');
      console.log(Object.keys(records[0].fields));
    } else {
      console.log('No records found, but table exists');
    }
    
    console.log('\nTesting Underglazes table fields...');
    const underglazesTable = base('Underglazes');
    const underglazeRecords = await underglazesTable.select({ maxRecords: 1 }).firstPage();
    
    if (underglazeRecords.length > 0) {
      console.log('Available fields in Underglazes table:');
      console.log(Object.keys(underglazeRecords[0].fields));
    } else {
      console.log('No records found, but table exists');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFields();
