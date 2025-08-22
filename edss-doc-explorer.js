#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

class EDSSDocExplorer {
  constructor() {
    this.docUrls = {
      latest: "http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/",
      trunk: "http://dh.lan:777/docs/EDSS/trunk/documentation/v4/",
      latestZip: "http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/get_doc.php?t=zip"
    };
  }

  async fetchDocumentation(version = "latest") {
    const url = version === "trunk" ? this.docUrls.trunk : this.docUrls.latest;
    
    console.log(`Fetching ${version} documentation from: ${url}`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log(`Successfully fetched ${html.length} characters of documentation`);
      
      // Save to file for analysis
      const filename = `edss-docs-${version}.html`;
      writeFileSync(filename, html);
      console.log(`Saved documentation to: ${filename}`);
      
      // Extract API information
      this.analyzeDocumentation(html, version);
      
      return html;
    } catch (error) {
      console.error(`Error fetching documentation: ${error.message}`);
      return null;
    }
  }

  async downloadZip(outputPath = './edss-docs.zip') {
    console.log(`Downloading ZIP documentation to: ${outputPath}`);
    
    try {
      const response = await fetch(this.docUrls.latestZip);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const fileStream = createWriteStream(outputPath);
      await pipeline(response.body, fileStream);
      
      console.log(`Successfully downloaded ZIP to: ${outputPath}`);
      
      const stats = await import('fs').then(fs => fs.promises.stat(outputPath));
      console.log(`File size: ${Math.round(stats.size / 1024)} KB`);
      
    } catch (error) {
      console.error(`Error downloading ZIP: ${error.message}`);
    }
  }

  analyzeDocumentation(html, version) {
    console.log(`\nAnalyzing ${version} documentation...`);
    
    // Look for API endpoints
    const apiEndpoints = [];
    
    // Common patterns for API documentation
    const patterns = [
      /\/api\/v?\d*\/[\w\/\-\{\}]+/gi,
      /endpoint[:\s]+(\/[\w\/\-\{\}]+)/gi,
      /url[:\s]+(\/api\/[\w\/\-\{\}]+)/gi,
      /(GET|POST|PUT|DELETE|PATCH)\s+(\/[\w\/\-\{\}]+)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        apiEndpoints.push(...matches);
      }
    });
    
    // Look for common medical/EDSS terms
    const edssTerms = [
      'patient', 'assessment', 'score', 'disability', 'neurological',
      'examination', 'visit', 'appointment', 'study', 'clinical'
    ];
    
    const foundTerms = edssTerms.filter(term => 
      html.toLowerCase().includes(term)
    );
    
    console.log(`\n=== Analysis Results for ${version.toUpperCase()} ===`);
    console.log(`Found ${apiEndpoints.length} potential API endpoints:`);
    [...new Set(apiEndpoints)].slice(0, 10).forEach(endpoint => {
      console.log(`  - ${endpoint}`);
    });
    
    if (foundTerms.length > 0) {
      console.log(`\nFound EDSS-related terms: ${foundTerms.join(', ')}`);
    }
    
    // Look for authentication information
    const authKeywords = ['authentication', 'token', 'api key', 'bearer', 'authorization'];
    const hasAuth = authKeywords.some(keyword => 
      html.toLowerCase().includes(keyword)
    );
    
    if (hasAuth) {
      console.log(`\nAuthentication: Likely required (found auth-related keywords)`);
    } else {
      console.log(`\nAuthentication: Not clearly documented`);
    }
    
    // Save analysis to file
    const analysisFile = `edss-analysis-${version}.json`;
    const analysis = {
      version,
      timestamp: new Date().toISOString(),
      endpoints: [...new Set(apiEndpoints)],
      edssTerms: foundTerms,
      hasAuthentication: hasAuth,
      documentLength: html.length
    };
    
    writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    console.log(`\nSaved analysis to: ${analysisFile}`);
  }

  async compareVersions() {
    console.log("Comparing latest and trunk versions...\n");
    
    const latestHtml = await this.fetchDocumentation("latest");
    const trunkHtml = await this.fetchDocumentation("trunk");
    
    if (latestHtml && trunkHtml) {
      const lengthDiff = Math.abs(latestHtml.length - trunkHtml.length);
      console.log(`\nVersion comparison:`);
      console.log(`Latest: ${latestHtml.length} characters`);
      console.log(`Trunk:  ${trunkHtml.length} characters`);
      console.log(`Difference: ${lengthDiff} characters`);
      
      if (lengthDiff < 1000) {
        console.log("Versions appear to be very similar");
      } else {
        console.log("Significant differences between versions");
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const explorer = new EDSSDocExplorer();
  
  if (args.length === 0) {
    console.log(`
EDSS Documentation Explorer

Usage:
  node edss-doc-explorer.js latest     # Fetch and analyze latest docs
  node edss-doc-explorer.js trunk      # Fetch and analyze trunk docs
  node edss-doc-explorer.js compare    # Compare both versions
  node edss-doc-explorer.js download   # Download latest docs as ZIP
  node edss-doc-explorer.js all        # Do everything

Available documentation URLs:
  Latest: http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/
  Trunk:  http://dh.lan:777/docs/EDSS/trunk/documentation/v4/
  ZIP:    http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/get_doc.php?t=zip
    `);
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'latest':
      await explorer.fetchDocumentation('latest');
      break;
    case 'trunk':
      await explorer.fetchDocumentation('trunk');
      break;
    case 'compare':
      await explorer.compareVersions();
      break;
    case 'download':
      await explorer.downloadZip();
      break;
    case 'all':
      await explorer.compareVersions();
      await explorer.downloadZip();
      break;
    default:
      console.log(`Unknown command: ${command}`);
  }
}

main().catch(console.error);
