
# Bulk Image Upload Instructions for Airtable

## Method 1: Using Airtable's Attachment Field (Recommended)

### For Glazes Table:
1. **Go to your Airtable base**
2. **Select the Glazes table**
3. **Click on the "Sample Photos" field header**
4. **Choose "Add attachment" or "Upload files"**
5. **Select multiple images from the glaze_images folder**
6. **Airtable will create new records for each image**
7. **Use the CSV mapping file to match images to existing records**

### For Underglazes Table:
1. **Select the Underglazes table**
2. **Click on the "Photo" field header**
3. **Choose "Add attachment" or "Upload files"**
4. **Select multiple images from the underglaze_images folder**
5. **Match images to existing records using the CSV file**

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
