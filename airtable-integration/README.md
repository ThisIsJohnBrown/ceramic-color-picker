# Airtable Integration for Ceramic Colors

This folder contains everything needed to set up an Airtable table with your ceramic glazes and underglazes collection.

## Quick Start

1. **Install dependencies:**
   ```bash
   cd airtable-integration
   npm install
   ```

2. **Set up your Airtable credentials:**
   ```bash
   cp credentials.example credentials.js
   # Edit credentials.js with your actual API key and Base ID
   ```

3. **Run the setup:**
   ```bash
   npm run setup
   ```

## Files

- `setup-airtable.js` - Main script to populate Airtable
- `package.json` - Dependencies for this integration
- `AIRTABLE_SETUP.md` - Detailed setup instructions
- `README.md` - This file

## What It Does

The script will create an Airtable table with:
- **80 Glaze records** (SC-1 through SC-104)
- **61 Underglaze records** (UG-1 through UG-236)
- **All images** from the parent directory's image folders
- **Smart color categorization** for easy filtering

## Prerequisites

- Airtable account
- Node.js installed
- API credentials (see AIRTABLE_SETUP.md for details)

For detailed instructions, see [AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md).
