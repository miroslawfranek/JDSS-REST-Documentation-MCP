#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';

class EDSSDocumentationMCPServer {
  constructor(options = {}) {
    this.server = new Server(
      {
        name: "edss-documentation-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Dynamic link discovery from dh.lan main page
    this.baseUrl = "http://dh.lan:777/";
    this.discoveredLinks = null;
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes cache
    this.lastDiscovery = null;
    
    // Legacy URLs for backwards compatibility
    this.legacyDocUrls = {
      latest: "http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/",
      trunk: "http://dh.lan:777/docs/EDSS/trunk/documentation/v4/",
      latestZip: "http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/get_doc.php?t=zip"
    };
    
    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_edss_documentation",
            description: "Get EDSS REST API documentation (latest or trunk version)",
            inputSchema: {
              type: "object",
              properties: {
                version: {
                  type: "string",
                  enum: ["latest", "trunk"],
                  default: "latest",
                  description: "Documentation version to retrieve"
                },
                section: {
                  type: "string", 
                  description: "Optional: specific section or page to retrieve (if available)"
                }
              }
            }
          },
          {
            name: "download_edss_documentation", 
            description: "Get download link for EDSS documentation as ZIP file",
            inputSchema: {
              type: "object",
              properties: {
                download: {
                  type: "boolean",
                  default: true,
                  description: "Return download information for ZIP file"
                }
              }
            }
          },
          {
            name: "search_edss_documentation",
            description: "Search for specific terms or endpoints in EDSS documentation", 
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search term (e.g., 'patient', 'assessment', 'POST', '/api/patients')"
                },
                version: {
                  type: "string",
                  enum: ["latest", "trunk", "both"],
                  default: "latest", 
                  description: "Which version to search"
                }
              },
              required: ["query"]
            }
          },
          {
            name: "analyze_edss_api_endpoints",
            description: "Extract and analyze API endpoints from EDSS documentation",
            inputSchema: {
              type: "object",
              properties: {
                version: {
                  type: "string",
                  enum: ["latest", "trunk"],
                  default: "latest",
                  description: "Documentation version to analyze"
                },
                detailed: {
                  type: "boolean",
                  default: false,
                  description: "Include detailed analysis of endpoints, parameters, and schemas"
                }
              }
            }
          },
          {
            name: "compare_documentation_versions", 
            description: "Compare latest and trunk versions of EDSS documentation",
            inputSchema: {
              type: "object",
              properties: {
                focus: {
                  type: "string",
                  enum: ["endpoints", "changes", "summary", "all"],
                  default: "summary",
                  description: "What to focus the comparison on"
                }
              }
            }
          },
          {
            name: "discover_documentation_links",
            description: "Discover all available EDSS documentation by parsing dh.lan homepage",
            inputSchema: {
              type: "object",
              properties: {
                refresh: {
                  type: "boolean",
                  default: false,
                  description: "Force refresh discovery cache"
                }
              }
            }
          },
          {
            name: "get_edss_documentation_enhanced",
            description: "Get EDSS documentation with automatic version discovery and jQuery processing",
            inputSchema: {
              type: "object",
              properties: {
                version: {
                  type: "string",
                  default: "latest",
                  description: "Version: 'latest', 'trunk', or specific release name"
                },
                apiVersion: {
                  type: "string",
                  enum: ["v3", "v4"],
                  default: "v4"
                },
                useJavaScript: {
                  type: "boolean",
                  default: true,
                  description: "Process with jQuery to reveal hidden content"
                }
              }
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case "get_edss_documentation":
            return await this.getDocumentation(args);
            
          case "download_edss_documentation":
            return await this.downloadDocumentation(args);
            
          case "search_edss_documentation":
            return await this.searchDocumentation(args);
            
          case "analyze_edss_api_endpoints":
            return await this.analyzeEndpoints(args);
            
          case "compare_documentation_versions":
            return await this.compareVersions(args);

          case "discover_documentation_links":
            return await this.discoverLinks(args);

          case "get_edss_documentation_enhanced":
            return await this.getDocumentationEnhanced(args);
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  /**
   * Dynamic link discovery from dh.lan main page
   */
  async discoverDocumentationLinks() {
    // Check cache first
    if (this.discoveredLinks && this.lastDiscovery && 
        (Date.now() - this.lastDiscovery) < this.cacheTimeout) {
      return this.discoveredLinks;
    }

    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch homepage: ${response.status}`);
      }
      
      const html = await response.text();
      const links = this.parseDocumentationLinks(html);
      
      // Cache the results
      this.discoveredLinks = links;
      this.lastDiscovery = Date.now();
      
      return links;
    } catch (error) {
      console.error('Discovery failed, using legacy URLs:', error.message);
      return this.buildLegacyLinks();
    }
  }

  parseDocumentationLinks(html) {
    const links = {};
    
    // Updated regex to match relative URLs without leading slash
    const linkRegex = /<a[^>]+href="([^"]*docs\/EDSS[^"]*documentation\/v[34][^"]*?)"[^>]*>([^<]*)<\/a>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const linkText = match[2].trim();
      
      // Parse the URL to extract version and release info
      const urlMatch = url.match(/docs\/EDSS\/([^\/]+)\/documentation\/(v[34])\/?$/);
      if (urlMatch) {
        const release = urlMatch[1];
        const apiVersion = urlMatch[2];
        
        // Construct full URL (add leading slash if missing)
        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url.startsWith('/') ? url.slice(1) : url}`;
        const zipUrl = fullUrl + (fullUrl.endsWith('/') ? '' : '/') + 'get_doc.php?t=zip';
        
        const key = `${release.toLowerCase()}_${apiVersion}`;
        links[key] = {
          url: fullUrl,
          zipUrl: zipUrl,
          release: release,
          apiVersion: apiVersion,
          linkText: linkText,
          discovered: true
        };
        
        // Create aliases for latest
        if (release !== 'trunk') {
          const aliasKey = `latest_${apiVersion}`;
          links[aliasKey] = { ...links[key] };
        }
      }
    }
    
    return links;
  }

  buildLegacyLinks() {
    return {
      latest_v4: {
        url: this.legacyDocUrls.latest,
        zipUrl: this.legacyDocUrls.latestZip,
        release: 'JEFFERSONVILLE',
        apiVersion: 'v4',
        linkText: 'Legacy Latest',
        discovered: false
      },
      trunk_v4: {
        url: this.legacyDocUrls.trunk,
        zipUrl: this.legacyDocUrls.trunk + 'get_doc.php?t=zip',
        release: 'trunk',
        apiVersion: 'v4', 
        linkText: 'Legacy Trunk',
        discovered: false
      }
    };
  }

  async discoverLinks(args) {
    const refresh = args?.refresh || false;
    
    if (refresh) {
      this.discoveredLinks = null;
      this.lastDiscovery = null;
    }
    
    const links = await this.discoverDocumentationLinks();
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            links: links,
            discoveredAt: new Date().toISOString(),
            totalFound: Object.keys(links).length
          }, null, 2)
        }
      ]
    };
  }

  /**
   * Enhanced documentation retrieval with automatic discovery and jQuery processing
   */
  async getDocumentationEnhanced(args) {
    const version = args?.version || 'latest';
    const apiVersion = args?.apiVersion || 'v4';
    const useJavaScript = args?.useJavaScript !== false; // default true

    try {
      // Get available links
      const links = await this.discoverDocumentationLinks();
      
      // Find the appropriate link
      let targetLink = null;
      const lookupKey = `${version.toLowerCase()}_${apiVersion}`;
      
      if (links[lookupKey]) {
        targetLink = links[lookupKey];
      } else if (version === 'latest') {
        // Try to find any latest version
        targetLink = links[`latest_${apiVersion}`] || links[Object.keys(links).find(k => k.includes('latest'))];
      } else if (version === 'trunk') {
        targetLink = links[`trunk_${apiVersion}`] || links[Object.keys(links).find(k => k.includes('trunk'))];
      }
      
      if (!targetLink) {
        throw new Error(`Could not find documentation for version: ${version}, apiVersion: ${apiVersion}`);
      }

      // Download ZIP file
      const response = await fetch(targetLink.zipUrl);
      if (!response.ok) {
        throw new Error(`Failed to download documentation: ${response.status}`);
      }

      const zipBuffer = await response.arrayBuffer();
      
      if (useJavaScript) {
        // Process with jQuery to reveal hidden content
        const processedHTML = await this.processZipWithJQuery(zipBuffer);
        
        return {
          content: [
            {
              type: "text", 
              text: `Enhanced EDSS Documentation (${targetLink.release} ${apiVersion})\n` +
                   `Source: ${targetLink.zipUrl}\n` +
                   `Processed with jQuery: ${useJavaScript ? 'YES' : 'NO'}\n\n` +
                   processedHTML
            }
          ]
        };
      } else {
        // Standard ZIP extraction
        const zip = new JSZip();
        const contents = await zip.loadAsync(zipBuffer);
        
        let htmlContent = '';
        for (const [path, file] of Object.entries(contents.files)) {
          if (path.endsWith('.html') && !file.dir) {
            htmlContent = await file.async('text');
            break;
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: `EDSS Documentation (${targetLink.release} ${apiVersion})\n` +
                   `Source: ${targetLink.zipUrl}\n\n` +
                   htmlContent
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving enhanced documentation: ${error.message}`
          }
        ]
      };
    }
  }

  /**
   * Process ZIP file with jQuery to reveal hidden content
   */
  async processZipWithJQuery(zipBuffer) {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(zipBuffer);
      
      // Find HTML and jQuery files
      let mainHTML = '';
      let jqueryCode = '';
      
      for (const [path, file] of Object.entries(contents.files)) {
        if (path.endsWith('.html') && !file.dir && !mainHTML) {
          mainHTML = await file.async('text');
        }
        if (path.includes('jquery') && path.endsWith('.js')) {
          jqueryCode = await file.async('text');
        }
      }
      
      if (!mainHTML) {
        throw new Error('No HTML file found in ZIP');
      }
      
      if (!jqueryCode) {
        console.warn('No jQuery found in ZIP, returning unprocessed HTML');
        return mainHTML;
      }
      
      // Create virtual DOM
      const dom = new JSDOM(mainHTML, {
        runScripts: "dangerously",
        resources: "usable"
      });
      
      const window = dom.window;
      const document = window.document;
      
      // Inject jQuery
      const scriptElement = document.createElement('script');
      scriptElement.textContent = jqueryCode;
      document.head.appendChild(scriptElement);
      
      // Wait for jQuery to load and then reveal content
      await new Promise(resolve => {
        setTimeout(async () => {
          try {
            await this.revealAllContent(window);
          } catch (error) {
            console.warn('jQuery processing error:', error.message);
          }
          resolve();
        }, 1000);
      });
      
      return document.documentElement.outerHTML;
      
    } catch (error) {
      throw new Error(`jQuery processing failed: ${error.message}`);
    }
  }

  /**
   * Reveal all hidden content using jQuery
   */
  async revealAllContent(window) {
    const $ = window.$;
    if (!$) {
      throw new Error('jQuery not available');
    }
    
    // Simulate clicks on all toggle buttons
    $('.toggleOperation').each(function() {
      try {
        $(this).trigger('click');
      } catch (e) {
        // Ignore individual click errors
      }
    });
    
    // Force show hidden elements
    $('div[style*="display: none"]').show();
    $('.content.func_doc').show();
    $('.content.func_src').show(); 
    $('.operation').show();
    $('.endpoint').show();
    
    // Remove any remaining display: none styles
    $('[style*="display: none"]').css('display', '');
  }

  async getDocumentation(args) {
    const version = args?.version || "latest";
    const section = args?.section;
    
    try {
      const url = version === "latest" ? this.legacyDocUrls.latest : this.legacyDocUrls.trunk;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documentation: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();
      
      return {
        content: [
          {
            type: "text",
            text: section ? this.extractSection(content, section) : content
          }
        ]
      };
    } catch (error) {
      throw new Error(`Documentation retrieval failed: ${error.message}`);
    }
  }

  async downloadDocumentation(args) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            zipUrl: this.legacyDocUrls.latestZip,
            description: "Download complete EDSS documentation as ZIP",
            contentType: "application/zip",
            version: "latest"
          }, null, 2)
        }
      ]
    };
  }

  async searchDocumentation(args) {
    const { query, version = "latest" } = args;
    
    try {
      const versions = version === "both" ? ["latest", "trunk"] : [version];
      const results = [];

      for (const ver of versions) {
        const url = ver === "latest" ? this.legacyDocUrls.latest : this.legacyDocUrls.trunk;
        const response = await fetch(url);
        
        if (response.ok) {
          const content = await response.text();
          const matches = this.findMatches(content, query, ver);
          results.push(...matches);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query: query,
              results: results,
              total: results.length
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async analyzeEndpoints(args) {
    const { version = "latest", detailed = false } = args;
    
    try {
      const url = version === "latest" ? this.legacyDocUrls.latest : this.legacyDocUrls.trunk;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documentation: ${response.status}`);
      }

      const content = await response.text();
      const endpoints = this.extractEndpoints(content, detailed);

      return {
        content: [
          {
            type: "text", 
            text: JSON.stringify({
              version: version,
              endpoints: endpoints,
              total: endpoints.length,
              detailed: detailed
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  async compareVersions(args) {
    const { focus = "summary" } = args;
    
    try {
      const [latestResponse, trunkResponse] = await Promise.all([
        fetch(this.legacyDocUrls.latest),
        fetch(this.legacyDocUrls.trunk)
      ]);

      if (!latestResponse.ok || !trunkResponse.ok) {
        throw new Error("Failed to fetch both versions");
      }

      const [latestContent, trunkContent] = await Promise.all([
        latestResponse.text(),
        trunkResponse.text()
      ]);

      const comparison = this.compareContent(latestContent, trunkContent, focus);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(comparison, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Comparison failed: ${error.message}`);
    }
  }

  // Helper methods
  extractSection(content, section) {
    const sectionRegex = new RegExp(`<h[1-6][^>]*>${section}.*?</h[1-6]>.*?(?=<h[1-6]|$)`, 'is');
    const match = content.match(sectionRegex);
    return match ? match[0] : `Section "${section}" not found`;
  }

  findMatches(content, query, version) {
    const regex = new RegExp(query, 'gi');
    const matches = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (regex.test(line)) {
        matches.push({
          version: version,
          line: index + 1,
          content: line.trim(),
          context: lines.slice(Math.max(0, index - 1), index + 2)
        });
      }
    });

    return matches;
  }

  extractEndpoints(content, detailed) {
    const endpoints = [];
    const endpointRegex = /(GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-\{\}\.]+)/g;
    let match;

    while ((match = endpointRegex.exec(content)) !== null) {
      const endpoint = {
        method: match[1],
        path: match[2]
      };

      if (detailed) {
        // Extract additional details if requested
        endpoint.description = this.extractEndpointDescription(content, match.index);
        endpoint.parameters = this.extractParameters(content, match.index);
      }

      endpoints.push(endpoint);
    }

    return endpoints;
  }

  extractEndpointDescription(content, index) {
    const beforeContext = content.substring(Math.max(0, index - 200), index);
    const descMatch = beforeContext.match(/<p[^>]*>(.*?)<\/p>/s);
    return descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  }

  extractParameters(content, index) {
    const afterContext = content.substring(index, Math.min(content.length, index + 500));
    const paramRegex = /"([^"]+)"\s*:\s*"([^"]+)"/g;
    const parameters = [];
    let paramMatch;

    while ((paramMatch = paramRegex.exec(afterContext)) !== null) {
      parameters.push({
        name: paramMatch[1],
        type: paramMatch[2]
      });
    }

    return parameters;
  }

  compareContent(latest, trunk, focus) {
    const comparison = {
      timestamp: new Date().toISOString(),
      focus: focus
    };

    if (focus === "summary" || focus === "all") {
      comparison.summary = {
        latest_size: latest.length,
        trunk_size: trunk.length,
        size_difference: trunk.length - latest.length,
        identical: latest === trunk
      };
    }

    if (focus === "endpoints" || focus === "all") {
      const latestEndpoints = this.extractEndpoints(latest, false);
      const trunkEndpoints = this.extractEndpoints(trunk, false);
      
      comparison.endpoints = {
        latest_count: latestEndpoints.length,
        trunk_count: trunkEndpoints.length,
        latest_only: latestEndpoints.filter(le => 
          !trunkEndpoints.some(te => te.method === le.method && te.path === le.path)
        ),
        trunk_only: trunkEndpoints.filter(te => 
          !latestEndpoints.some(le => le.method === te.method && le.path === te.path)
        )
      };
    }

    return comparison;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Initialize and run server
const server = new EDSSDocumentationMCPServer();
await server.run();