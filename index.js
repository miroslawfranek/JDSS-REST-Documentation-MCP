#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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

    // Documentation URLs (no auth required for local access)
    this.docUrls = {
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
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let response;
        
        switch (name) {
          case "get_edss_documentation":
            response = await this.getDocumentation(args.version || "latest", args.section);
            break;
            
          case "download_edss_documentation":
            response = await this.getDownloadInfo();
            break;
            
          case "search_edss_documentation":
            response = await this.searchDocumentation(args.query, args.version || "latest");
            break;
            
          case "analyze_edss_api_endpoints":
            response = await this.analyzeEndpoints(args.version || "latest", args.detailed || false);
            break;
            
          case "compare_documentation_versions":
            response = await this.compareVersions(args.focus || "summary");
            break;
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: "text",
              text: typeof response === 'string' ? response : JSON.stringify(response, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text", 
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async getDocumentation(version = "latest", section = null) {
    const url = version === "trunk" ? this.docUrls.trunk : this.docUrls.latest;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documentation: HTTP ${response.status}`);
      }
      
      const html = await response.text();
      
      // If a specific section is requested, try to extract it
      if (section) {
        const sectionContent = this.extractSection(html, section);
        if (sectionContent) {
          return {
            version: version,
            section: section,
            url: url,
            content: sectionContent,
            note: `Extracted section: ${section}`
          };
        }
      }
      
      return {
        version: version,
        url: url,
        content: html,
        length: html.length,
        note: "Full EDSS REST API documentation retrieved"
      };
    } catch (error) {
      throw new Error(`Failed to fetch ${version} documentation: ${error.message}`);
    }
  }

  async getDownloadInfo() {
    try {
      const response = await fetch(this.docUrls.latestZip, { method: 'HEAD' });
      
      if (!response.ok) {
        throw new Error(`Failed to access ZIP download: HTTP ${response.status}`);
      }
      
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      const lastModified = response.headers.get('last-modified');
      
      return {
        message: "EDSS Documentation ZIP download available",
        downloadUrl: this.docUrls.latestZip,
        contentType: contentType || "application/zip",
        size: contentLength ? `${Math.round(parseInt(contentLength) / 1024)} KB` : "Unknown size",
        lastModified: lastModified || "Unknown",
        instructions: "Use the downloadUrl to download the complete EDSS API documentation as a ZIP file"
      };
    } catch (error) {
      throw new Error(`Failed to get download info: ${error.message}`);
    }
  }

  async searchDocumentation(query, version) {
    const versions = version === "both" ? ["latest", "trunk"] : [version];
    const results = [];
    
    for (const ver of versions) {
      try {
        const doc = await this.getDocumentation(ver);
        const html = doc.content;
        const matches = this.findMatches(html, query);
        
        results.push({
          version: ver,
          query: query,
          matchCount: matches.length,
          matches: matches.slice(0, 10), // Limit to first 10 matches
          url: ver === "trunk" ? this.docUrls.trunk : this.docUrls.latest
        });
      } catch (error) {
        results.push({
          version: ver,
          error: error.message
        });
      }
    }
    
    return {
      searchQuery: query,
      results: results,
      note: results.length > 1 ? "Searched both versions" : `Searched ${version} version`
    };
  }

  async analyzeEndpoints(version, detailed) {
    try {
      const doc = await this.getDocumentation(version);
      const html = doc.content;
      
      // Extract API endpoints
      const endpoints = this.extractAPIEndpoints(html);
      const httpMethods = this.extractHTTPMethods(html);
      const schemas = detailed ? this.extractSchemas(html) : [];
      const authentication = this.extractAuthInfo(html);
      
      const analysis = {
        version: version,
        url: doc.url,
        summary: {
          totalEndpoints: endpoints.length,
          httpMethods: [...new Set(httpMethods)],
          hasAuthentication: authentication.found,
          documentSize: html.length
        },
        endpoints: endpoints,
        ...(detailed && { 
          schemas: schemas,
          authentication: authentication
        }),
        generatedAt: new Date().toISOString()
      };
      
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze endpoints: ${error.message}`);
    }
  }

  async compareVersions(focus) {
    try {
      const latest = await this.getDocumentation("latest");
      const trunk = await this.getDocumentation("trunk");
      
      const comparison = {
        comparisonType: focus,
        latest: {
          url: latest.url,
          size: latest.content.length
        },
        trunk: {
          url: trunk.url, 
          size: trunk.content.length
        },
        differences: {
          sizeDifference: Math.abs(latest.content.length - trunk.content.length),
          percentageDifference: Math.abs((latest.content.length - trunk.content.length) / latest.content.length * 100).toFixed(2)
        }
      };
      
      if (focus === "endpoints" || focus === "all") {
        const latestEndpoints = this.extractAPIEndpoints(latest.content);
        const trunkEndpoints = this.extractAPIEndpoints(trunk.content);
        
        comparison.endpointComparison = {
          latest: { count: latestEndpoints.length, endpoints: latestEndpoints },
          trunk: { count: trunkEndpoints.length, endpoints: trunkEndpoints },
          onlyInLatest: latestEndpoints.filter(e => !trunkEndpoints.includes(e)),
          onlyInTrunk: trunkEndpoints.filter(e => !latestEndpoints.includes(e))
        };
      }
      
      return comparison;
    } catch (error) {
      throw new Error(`Failed to compare versions: ${error.message}`);
    }
  }

  // Helper methods for parsing documentation
  extractSection(html, sectionName) {
    // Simple section extraction - can be enhanced based on HTML structure
    const sectionRegex = new RegExp(`<.*?>${sectionName}.*?</.*?>([\\s\\S]*?)(?=<.*?>.*?</.*?>|$)`, 'i');
    const match = html.match(sectionRegex);
    return match ? match[1].trim() : null;
  }

  findMatches(html, query) {
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\'), 'gi');
    const matches = [];
    let match;
    
    while ((match = regex.exec(html)) !== null && matches.length < 50) {
      const start = Math.max(0, match.index - 100);
      const end = Math.min(html.length, match.index + query.length + 100);
      const context = html.substring(start, end).replace(/\s+/g, ' ');
      
      matches.push({
        position: match.index,
        context: context,
        match: match[0]
      });
    }
    
    return matches;
  }

  extractAPIEndpoints(html) {
    const endpoints = [];
    const patterns = [
      /\/api\/v?\d*\/[\w\/\-\{\}]+/gi,
      /endpoint[:\s]+(\/[\w\/\-\{\}]+)/gi,
      /url[:\s]+(\/api\/[\w\/\-\{\}]+)/gi,
      /(GET|POST|PUT|DELETE|PATCH)\s+(\/[\w\/\-\{\}]+)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        endpoints.push(...matches);
      }
    });
    
    return [...new Set(endpoints)];
  }

  extractHTTPMethods(html) {
    const methodPattern = /(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/gi;
    const matches = html.match(methodPattern);
    return matches ? [...new Set(matches.map(m => m.toUpperCase()))] : [];
  }

  extractSchemas(html) {
    // Extract JSON schema patterns
    const schemaPattern = /\{[\s\S]*?"[\w_]+"\s*:[\s\S]*?\}/gi;
    const matches = html.match(schemaPattern);
    return matches ? matches.slice(0, 20) : []; // Limit to first 20 schemas
  }

  extractAuthInfo(html) {
    const authKeywords = ['authentication', 'token', 'api key', 'bearer', 'authorization', 'oauth'];
    const found = authKeywords.some(keyword => 
      html.toLowerCase().includes(keyword)
    );
    
    return {
      found: found,
      keywords: authKeywords.filter(keyword => html.toLowerCase().includes(keyword))
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Parse command line arguments
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        console.log(`
EDSS Documentation MCP Server (Global Installation)

Usage: node index.js [options]

Options:
  --help, -h          Show this help message

This MCP server provides access to EDSS REST API documentation.

Available Documentation URLs:
  Latest:    http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/
  Trunk:     http://dh.lan:777/docs/EDSS/trunk/documentation/v4/
  ZIP:       http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/get_doc.php?t=zip

MCP Tools Available:
  - get_edss_documentation      # Retrieve documentation content
  - download_edss_documentation # Get ZIP download info
  - search_edss_documentation   # Search within documentation
  - analyze_edss_api_endpoints  # Extract API endpoints
  - compare_documentation_versions # Compare latest vs trunk

Global CLI Commands:
  edss-docs start     # Start this MCP server
  edss-docs test      # Test documentation access
  edss-docs explore   # Download and analyze documentation
  edss-docs config    # Show configuration
  edss-docs help      # Show help
        `);
        process.exit(0);
        break;
    }
  }
  return options;
}

// Start the server
const args = process.argv.slice(2);
const options = parseArgs(args);
const server = new EDSSDocumentationMCPServer(options);
server.start().catch(console.error);
