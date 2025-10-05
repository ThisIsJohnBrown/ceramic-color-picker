const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, 'matrix data import.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV content
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

// Extract glaze names (skip first empty column)
const glazeNames = headers.slice(1);

// Find the index of "True Teal" to limit the columns
const trueTealIndex = glazeNames.findIndex(name => name.trim() === 'True Teal');
const limitedGlazeNames = trueTealIndex !== -1 ? glazeNames.slice(0, trueTealIndex + 1) : glazeNames;

console.log('Found glazes up to True Teal:', limitedGlazeNames.length);
console.log('Glaze names:', limitedGlazeNames);

// Parse underglaze data
const underglazeData = [];
for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const underglazeName = row[0].trim();
    
    if (underglazeName) {
        const combinations = [];
        // Only process columns up to True Teal
        for (let j = 1; j <= limitedGlazeNames.length; j++) {
            if (row[j] && row[j].trim() === '1') {
                combinations.push(limitedGlazeNames[j - 1]);
            }
        }
        
        underglazeData.push({
            name: underglazeName,
            combinations: combinations
        });
    }
}

console.log(`\nParsed ${underglazeData.length} underglazes`);
console.log('Sample underglaze data:', underglazeData.slice(0, 3));

// Now we need to map these to the actual IDs in colors.json
async function mapToColorIds() {
    try {
        const colorsPath = path.join(__dirname, 'colors.json');
        const colorsData = JSON.parse(fs.readFileSync(colorsPath, 'utf8'));
        
        console.log('\nLoaded colors.json with:');
        console.log('- Underglazes:', colorsData.underglazes?.length || 0);
        console.log('- Glazes:', colorsData.glazes?.length || 0);
        
        // Create mapping from names to IDs
        const underglazeNameToId = {};
        const glazeNameToId = {};
        
        if (colorsData.underglazes) {
            colorsData.underglazes.forEach(ug => {
                underglazeNameToId[ug.name] = ug.id;
            });
        }
        
        if (colorsData.glazes) {
            colorsData.glazes.forEach(glaze => {
                glazeNameToId[glaze.name] = glaze.id;
            });
        }
        
        // The CSV has glaze names in rows and underglaze names in columns
        // This creates glaze-underglaze combinations for the matrix
        const csvGlazeNameToGlazeId = {};
        underglazeData.forEach(glaze => {
            const glazeId = glazeNameToId[glaze.name];
            if (glazeId) {
                csvGlazeNameToGlazeId[glaze.name] = glazeId;
            }
        });
        
        console.log('\nUnderglaze name mappings (first 5):');
        console.log(Object.entries(underglazeNameToId).slice(0, 5));
        
        console.log('\nGlaze name mappings (first 5):');
        console.log(Object.entries(glazeNameToId).slice(0, 5));
        
        // Create the toggle states
        const toggleStates = new Set();
        const enabledCombinations = new Set();
        const notFoundCombinations = new Set();
        
        // Process CSV data: glaze names in rows, underglaze names in columns
        // This creates glaze-underglaze combinations that should be enabled
        underglazeData.forEach(csvRow => {
            const glazeId = csvGlazeNameToGlazeId[csvRow.name];
            if (glazeId) {
                csvRow.combinations.forEach(underglazeName => {
                    const underglazeId = underglazeNameToId[underglazeName];
                    if (underglazeId) {
                        // This is a glaze-underglaze combination that should be enabled
                        // But the matrix stores it as underglaze-glaze, so we need to reverse the order
                        const combinationKey = `${underglazeId}-${glazeId}`;
                        enabledCombinations.add(combinationKey);
                        console.log(`✅ Found enabled combination: ${csvRow.name} (glaze) + ${underglazeName} (underglaze) -> ${combinationKey}`);
                    } else {
                        // If underglaze not found, don't toggle it off - keep it enabled
                        console.log(`⚠️ Underglaze not found: ${underglazeName} - keeping enabled`);
                        notFoundCombinations.add(`${csvRow.name} + ${underglazeName}`);
                    }
                });
            } else {
                console.log(`❌ CSV glaze not found in colors.json: ${csvRow.name}`);
            }
        });
        
        // For combinations NOT in the CSV (or marked as 0), we need to add them to disabled set
        // BUT only if both glaze and underglaze exist in BOTH colors.json AND the CSV
        if (colorsData.underglazes && colorsData.glazes) {
            colorsData.underglazes.forEach(underglaze => {
                colorsData.glazes.forEach(glaze => {
                    const cellKey = `${underglaze.id}-${glaze.id}`;
                    
                    // Check if this combination was marked as "1" in CSV
                    // CSV has glaze in rows, underglaze in columns
                    const csvGlaze = underglazeData.find(g => g.name === glaze.name);
                    const isEnabled = csvGlaze && csvGlaze.combinations.includes(underglaze.name);
                    
                    // Only disable if:
                    // 1. Both colors exist in the CSV (glaze in CSV rows, underglaze in CSV columns)
                    // 2. The combination is NOT marked as "1" in CSV
                    const glazeExistsInCsv = underglazeData.some(g => g.name === glaze.name);
                    const underglazeExistsInCsv = limitedGlazeNames.includes(underglaze.name);
                    
                    if (glazeExistsInCsv && underglazeExistsInCsv && !isEnabled) {
                        toggleStates.add(cellKey);
                        console.log(`❌ Disabling combination: ${glaze.name} + ${underglaze.name} (not marked as 1 in CSV)`);
                    } else if (!glazeExistsInCsv || !underglazeExistsInCsv) {
                        console.log(`⚠️ Keeping enabled (not in CSV): ${glaze.name} + ${underglaze.name}`);
                    }
                });
            });
        }
        
        console.log(`\nTotal disabled combinations: ${toggleStates.size}`);
        console.log(`Total enabled combinations: ${enabledCombinations.size}`);
        console.log(`Total not found combinations: ${notFoundCombinations.size}`);
        console.log('Sample disabled combinations:', Array.from(toggleStates).slice(0, 10));
        console.log('Not found combinations (kept enabled):', Array.from(notFoundCombinations).slice(0, 5));
        
        // Save the toggle states
        const toggleStatesData = {
            disabledCells: Array.from(toggleStates),
            lastUpdated: new Date().toISOString(),
            source: 'CSV reimport - only disable found combinations',
            totalCombinations: (colorsData.underglazes?.length || 0) * (colorsData.glazes?.length || 0),
            enabledCombinations: ((colorsData.underglazes?.length || 0) * (colorsData.glazes?.length || 0)) - toggleStates.size,
            disabledCombinations: toggleStates.size,
            notFoundCombinations: Array.from(notFoundCombinations)
        };
        
        const toggleStatesPath = path.join(__dirname, 'toggle-states.json');
        fs.writeFileSync(toggleStatesPath, JSON.stringify(toggleStatesData, null, 2));
        
        console.log(`\n✅ Toggle states saved to ${toggleStatesPath}`);
        console.log(`📊 Summary:`);
        console.log(`   - Total combinations: ${toggleStatesData.totalCombinations}`);
        console.log(`   - Enabled combinations: ${toggleStatesData.enabledCombinations}`);
        console.log(`   - Disabled combinations: ${toggleStatesData.disabledCombinations}`);
        console.log(`   - Not found combinations (kept enabled): ${notFoundCombinations.size}`);
        
        return toggleStatesData;
        
    } catch (error) {
        console.error('Error processing colors.json:', error);
        throw error;
    }
}

// Run the mapping
mapToColorIds().then(result => {
    console.log('\n🎉 CSV reimport completed successfully!');
    console.log('The matrix.html page will now load with the reimported toggle states from the CSV.');
    console.log('Note: Combinations not found in colors.json are kept enabled.');
}).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
