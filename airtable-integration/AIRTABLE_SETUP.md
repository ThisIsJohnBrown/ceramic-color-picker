# Airtable Setup Guide for Ceramic Colors

This guide will help you set up an Airtable table with all your ceramic glazes and underglazes, including their images.

## Prerequisites

1. An Airtable account (free tier is fine)
2. Node.js installed on your system
3. Your ceramic color data (already available in `colors.json`)

## Step 1: Install Dependencies

First, install the required dependencies:

```bash
npm install
```

## Step 2: Set Up Airtable

### 2.1 Create a New Airtable Base

1. Go to [Airtable.com](https://airtable.com) and sign in
2. Click "Add a base" → "Start from scratch"
3. Name your base "Ceramic Colors" (or whatever you prefer)

### 2.2 Create the Table Structure

In your new base, create a table with the following fields:

| Field Name | Field Type | Options/Notes |
|------------|------------|---------------|
| Type | Single Select | Options: Glaze, Underglaze |
| ID | Single Line Text | - |
| Name | Single Line Text | - |
| Color | Single Line Text | For glazes only |
| Left Color | Single Line Text | For underglazes only |
| Top Color | Single Line Text | For underglazes only |
| Image | Attachment | - |
| Color Category | Single Select | Options: Dark, Light, Orange/Red, Red/Pink, Green, Blue, Yellow, Purple, Neutral, Other |
| Created | Date | - |

### 2.3 Get Your API Credentials

1. Go to [Airtable Developer Hub](https://airtable.com/create/tokens)
2. Create a new personal access token
3. Give it a name like "Ceramic Colors Setup"
4. Grant it "data.records:write" and "data.records:read" permissions
5. Copy the token (starts with `pat...`)

### 2.4 Get Your Base ID

1. Go to [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)
2. Find your base in the list
3. Copy the Base ID (starts with `app...`)

## Step 3: Configure the Script

### Option A: Using Environment Variables (Recommended)

Create a `.env` file in your project root:

```bash
AIRTABLE_API_KEY=pat_your_token_here
AIRTABLE_BASE_ID=app_your_base_id_here
```

### Option B: Edit the Script Directly

Edit `setup-airtable.js` and replace these lines:
```javascript
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'your_api_key_here';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'your_base_id_here';
```

With your actual credentials:
```javascript
const AIRTABLE_API_KEY = 'pat_your_actual_token';
const AIRTABLE_BASE_ID = 'app_your_actual_base_id';
```

## Step 4: Run the Setup Script

```bash
node setup-airtable.js
```

The script will:
1. Show you the table structure to create (if you haven't already)
2. Wait 5 seconds for you to create it
3. Upload all glaze records with images
4. Upload all underglaze records with images
5. Show progress as it goes

## What You'll Get

Your Airtable table will contain:

- **80 Glaze records** with:
  - ID (e.g., SC-16)
  - Name (e.g., "Cotton Tail")
  - Color (hex code)
  - Image (the actual ceramic sample photo)
  - Color category (auto-categorized)

- **61 Underglaze records** with:
  - ID (e.g., UG-51)
  - Name (e.g., "China White")
  - Left Color and Top Color (hex codes)
  - Image (the actual ceramic sample photo)
  - Color category (auto-categorized)

## Troubleshooting

### Rate Limiting
If you get rate limit errors, the script includes delays between requests. If you still hit limits, you can increase the delay in the script (line with `setTimeout(resolve, 200)`).

### Image Upload Issues
If some images fail to upload, check that:
- The image files exist in the correct directories
- The file paths in `colors.json` match the actual files
- The images are in JPEG format

### API Errors
- Double-check your API key and Base ID
- Ensure your API token has the correct permissions
- Make sure the table name matches exactly (case-sensitive)

## Next Steps

Once your data is in Airtable, you can:

1. **Create Views**: Filter by type, color category, or other criteria
2. **Add More Fields**: Add notes, firing temperature, availability, etc.
3. **Create Forms**: Let others add new colors
4. **Set Up Automations**: Get notified when new colors are added
5. **Export Data**: Download as CSV or integrate with other tools

## Data Overview

Your collection includes:
- **Glazes**: 80 different colors from SC-1 to SC-104
- **Underglazes**: 61 different colors from UG-1 to UG-236
- **Total Images**: 141 high-quality ceramic sample photos
- **Color Range**: Full spectrum from whites and neutrals to vibrant colors

The script automatically categorizes colors into families (Dark, Light, Orange/Red, etc.) to make filtering easier in Airtable.
