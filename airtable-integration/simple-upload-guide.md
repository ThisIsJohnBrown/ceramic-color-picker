# Simple Image Upload Guide for Airtable

## The Easiest Method: Manual Upload with CSV Reference

Since Airtable doesn't have a simple bulk upload feature for existing records, here's the most reliable approach:

### Step 1: Open the CSV Files
- Open `glaze-image-mapping.csv` in Excel/Google Sheets
- Open `underglaze-image-mapping.csv` in Excel/Google Sheets
- These show exactly which image file goes with which record

### Step 2: Upload Images One by One

#### For Glazes:
1. **Go to your Airtable Glazes table**
2. **Find the record** (e.g., "Cotton Tail")
3. **Click on the "Sample Photos" field** (it will show a camera icon or "+" button)
4. **Click "Upload" or "Add attachment"**
5. **Select the corresponding image file** from the CSV (e.g., "sc_16_cone06.jpg")
6. **Repeat for all 80 glazes**

#### For Underglazes:
1. **Go to your Airtable Underglazes table**
2. **Find the record** (e.g., "China White")
3. **Click on the "Photo" field**
4. **Click "Upload" or "Add attachment"**
5. **Select the corresponding image file** from the CSV (e.g., "ug-51_cone06.jpg")
6. **Repeat for all 61 underglazes**

### Step 3: Use the CSV as Your Reference

The CSV files show:
- **Record Name** → **Image File Name**
- **File Size** (to verify you have the right file)
- **File Exists** (to confirm the file is available)

### Pro Tips:
- **Sort the CSV by "Record Name"** to make it easier to find records
- **Open the image folder** alongside Airtable for easy access
- **Upload in batches** (e.g., 10-20 at a time) to avoid getting overwhelmed
- **Use Ctrl+F** in Airtable to quickly find specific records

### Alternative: Use Airtable's Grid View
1. **Switch to Grid view** in your table
2. **Click on the attachment field** for each record
3. **Drag and drop** the image file directly onto the field
4. **This is often faster** than clicking through menus

## File Locations:
- **Glaze images**: `../glaze_images/` (80 files)
- **Underglaze images**: `../underglaze_images/` (61 files)

## Time Estimate:
- **~2-3 minutes per image** = 4-6 hours total
- **Can be done in sessions** (e.g., 20 images per day)
- **Much faster than recreating everything**

This method is 100% reliable and gives you full control over the process!
