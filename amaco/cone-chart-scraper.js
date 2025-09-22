const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function scrapeAmacoConeCharts() {
  const products = [];
  const seenProducts = new Set();
  let currentPage = 1;
  let hasNextPage = true;
  let maxPages = 10; // Safety limit
  
  console.log('Starting to scrape AMACO Velvet Underglazes for cone chart images...');
  
  // Set up axios with proper headers
  const axiosInstance = axios.create({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    },
    timeout: 30000
  });
  
  // First, collect all product links from all pages
  const productLinks = [];
  
  while (hasNextPage && currentPage <= maxPages) {
    console.log(`Collecting product links from page ${currentPage}...`);
    
    const url = `https://shop.amaco.com/glazes-underglazes/underglazes/v-velvet-underglaze/?page=${currentPage}`;
    console.log(`Fetching: ${url}`);
    
    try {
      const response = await axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      
      // Look for product links - use h3 a selector which works well
      const links = $('h3 a');
      console.log(`Found ${links.length} product links on page ${currentPage}`);
      
      links.each((index, element) => {
        const href = $(element).attr('href');
        if (href && !href.includes('javascript:') && !productLinks.includes(href)) {
          // Convert relative URLs to absolute
          const fullUrl = href.startsWith('http') ? href : `https://shop.amaco.com${href}`;
          productLinks.push(fullUrl);
        }
      });
      
      // Check for pagination - look for page numbers
      const pageNumbers = $('.pagination a, .pager a, [class*="page"] a');
      let maxPageNum = 0;
      pageNumbers.each((index, element) => {
        const text = $(element).text().trim();
        const pageNum = parseInt(text);
        if (!isNaN(pageNum) && pageNum > maxPageNum) {
          maxPageNum = pageNum;
        }
      });
      
      console.log(`Found page numbers up to: ${maxPageNum}`);
      
      if (maxPageNum <= currentPage) {
        hasNextPage = false;
        console.log('No more pages found');
      } else {
        currentPage++;
        console.log(`Moving to page ${currentPage}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`Error fetching page ${currentPage}:`, error.message);
      hasNextPage = false;
    }
  }
  
  console.log(`Found ${productLinks.length} total product links`);
  
  // Now visit each product page to get cone chart images
  for (let i = 0; i < productLinks.length; i++) {
    const productUrl = productLinks[i];
    console.log(`Processing product ${i + 1}/${productLinks.length}: ${productUrl}`);
    
    try {
      const response = await axiosInstance.get(productUrl);
      const $ = cheerio.load(response.data);
      
      // Extract product information
      let name = '';
      let id = '';
      
      // Try to get product name from various selectors
      const nameSelectors = [
        'h1.product-name',
        'h1.product-title',
        '.product-name h1',
        '.product-title h1',
        'h1',
        '.product-info h1'
      ];
      
      for (const selector of nameSelectors) {
        const nameEl = $(selector).first();
        if (nameEl.length && nameEl.text().trim()) {
          name = nameEl.text().trim();
          break;
        }
      }
      
      if (!name) {
        console.log(`No name found for ${productUrl}, skipping...`);
        continue;
      }
      
      // Extract ID from name
      const idMatch = name.match(/V-\d+/);
      if (idMatch) {
        id = idMatch[0];
        // Remove ID from name
        name = name.replace(/^V-\d+\s*/, '');
      } else {
        id = `product-${i}`;
      }
      
      // Look for cone chart image
      let coneChartUrl = '';
      
      // Try different approaches to find cone chart
      const coneChartSelectors = [
        'img[alt*="cone"]',
        'img[alt*="Cone"]',
        'img[alt*="chart"]',
        'img[alt*="Chart"]',
        'img[src*="cone"]',
        'img[src*="chart"]',
        '.cone-chart img',
        '.chart img',
        '[class*="cone"] img',
        '[class*="chart"] img'
      ];
      
      for (const selector of coneChartSelectors) {
        const imgEl = $(selector).first();
        if (imgEl.length) {
          coneChartUrl = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy');
          if (coneChartUrl) {
            // Convert relative URLs to absolute
            if (coneChartUrl.startsWith('//')) {
              coneChartUrl = 'https:' + coneChartUrl;
            } else if (coneChartUrl.startsWith('/')) {
              coneChartUrl = 'https://shop.amaco.com' + coneChartUrl;
            }
            console.log(`Found cone chart for ${id}: ${coneChartUrl}`);
            break;
          }
        }
      }
      
      // If no cone chart found with selectors, try looking for text containing "cone chart"
      if (!coneChartUrl) {
        const textElements = $('*:contains("cone chart"), *:contains("Cone Chart"), *:contains("cone"), *:contains("Cone")');
        textElements.each((index, element) => {
          const $el = $(element);
          if ($el.text().toLowerCase().includes('cone chart') || $el.text().toLowerCase().includes('cone')) {
            const nearbyImg = $el.find('img').first();
            if (nearbyImg.length) {
              coneChartUrl = nearbyImg.attr('src') || nearbyImg.attr('data-src') || nearbyImg.attr('data-lazy');
              if (coneChartUrl) {
                if (coneChartUrl.startsWith('//')) {
                  coneChartUrl = 'https:' + coneChartUrl;
                } else if (coneChartUrl.startsWith('/')) {
                  coneChartUrl = 'https://shop.amaco.com' + coneChartUrl;
                }
                console.log(`Found cone chart via text search for ${id}: ${coneChartUrl}`);
                return false; // Break out of each loop
              }
            }
          }
        });
      }
      
      const key = `${id}-${name}`;
      if (!seenProducts.has(key)) {
        seenProducts.add(key);
        products.push({
          id: id,
          name: name,
          coneChartUrl: coneChartUrl || ''
        });
      }
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error processing ${productUrl}:`, error.message);
    }
  }
  
  console.log(`Total unique products processed: ${products.length}`);
  
  // Write to CSV
  const csvWriter = createCsvWriter({
    path: 'amaco-velvet-underglazes-cone-charts.csv',
    header: [
      { id: 'id', title: 'ID' },
      { id: 'name', title: 'Name' },
      { id: 'coneChartUrl', title: 'Cone Chart URL' }
    ]
  });
  
  await csvWriter.writeRecords(products);
  console.log('CSV file created: amaco-velvet-underglazes-cone-charts.csv');
  
  // Log all products for verification
  console.log('\nAll products with cone chart URLs:');
  products.forEach((product, index) => {
    console.log(`${index + 1}. ${product.id}: ${product.name} - ${product.coneChartUrl ? 'Found' : 'Not found'}`);
  });
}

// Run the scraper
scrapeAmacoConeCharts().catch(console.error);
