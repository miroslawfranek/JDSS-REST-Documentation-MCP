#!/bin/bash

# JDSS REST API Documentation MCP Server - Global Installation Script
# This script installs the JDSS REST API documentation MCP server globally in user home directory

set -e  # Exit on any error

echo "🚀 JDSS REST API Documentation MCP Server - Global Installation"
echo "=============================================================="

# Configuration
PROJECT_NAME="jdss-rest-doc-mcp"
INSTALL_DIR="$HOME/.${PROJECT_NAME}"
BIN_DIR="$HOME/.local/bin"
CONFIG_DIR="$HOME/.config/${PROJECT_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js (version 18+) first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current version: $(node --version)"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Create global directory structure
create_global_structure() {
    print_status "Creating global directory structure..."
    
    # Remove existing installation
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "Existing installation found. Removing..."
        rm -rf "$INSTALL_DIR"
    fi
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
    mkdir -p "$CONFIG_DIR"
    
    # Add ~/.local/bin to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
        export PATH="$HOME/.local/bin:$PATH"
        print_warning "Added ~/.local/bin to PATH. Restart your shell or run: source ~/.bashrc"
    fi
    
    cd "$INSTALL_DIR"
    print_success "Global directory structure created: $INSTALL_DIR"
}

# Create package.json
create_package_json() {
    print_status "Creating package.json..."
    
    cat > package.json << 'EOF'
{
  "name": "jdss-rest-doc-mcp-server",
  "version": "1.0.0",
  "description": "Global MCP server for JDSS REST API documentation access",
  "type": "module",
  "main": "index.js",
  "bin": {
    "jdss-rest-doc-mcp": "./index.js",
    "jdss-rest-doc": "./cli.js"
  },
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "explore": "node cli.js explore",
    "test": "node cli.js test",
    "demo": "node cli.js demo"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0"
  },
  "keywords": ["mcp", "jdss", "documentation", "api-docs", "claude", "global"],
  "author": "Your Name",
  "license": "MIT"
}
EOF
    
    print_success "package.json created"
}

# Create CLI wrapper
create_cli_wrapper() {
    print_status "Creating CLI wrapper..."
    
    cat > cli.js << 'EOF'
#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const homeDir = process.env.HOME;
const configDir = join(homeDir, '.config', 'jdss-rest-doc-mcp');

function ensureConfigDir() {
    if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
    }
}

function showHelp() {
    console.log(`
JDSS REST API Documentation MCP - Global CLI

Usage: jdss-rest-doc <command> [options]

Commands:
  start [--port PORT]     Start the MCP server
  test                    Test documentation access
  explore                 Analyze documentation and generate reports
  demo                    Show usage examples
  config                  Show configuration information
  help                    Show this help message

Examples:
  jdss-rest-doc start         # Start MCP server
  jdss-rest-doc test          # Test connectivity
  jdss-rest-doc explore       # Download and analyze docs
  jdss-rest-doc config        # Show config paths

Global Installation:
  Installed in: ${__dirname}
  Config dir:   ${configDir}
  Binary:       ~/.local/bin/jdss-rest-doc
    `);
}

function showConfig() {
    console.log(`
JDSS REST API Documentation MCP - Configuration

Installation directory: ${__dirname}
Configuration directory: ${configDir}
Binary location: ${homeDir}/.local/bin/jdss-rest-doc

Documentation URLs:
  Latest: http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/
  Trunk:  http://dh.lan:777/docs/EDSS/trunk/documentation/v4/
  ZIP:    http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/get_doc.php?t=zip

MCP Configuration for Claude Desktop:
{
  "mcpServers": {
    "jdss-rest-documentation": {
      "command": "node",
      "args": ["${__dirname}/index.js"]
    }
  }
}
    `);
}

async function testDocs() {
    console.log("Testing EDSS Documentation Access...");
    console.log("====================================");
    
    const urls = [
        "http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/",
        "http://dh.lan:777/docs/EDSS/trunk/documentation/v4/",
        "http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/get_doc.php?t=zip"
    ];
    
    for (const url of urls) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            const status = response.status;
            const statusText = status === 200 ? "✅ Accessible" : 
                              status === 404 ? "❌ Not found" : 
                              "⚠️ Check network/server";
            console.log(`${url}: ${status} ${statusText}`);
        } catch (error) {
            console.log(`${url}: ❌ Error - ${error.message}`);
        }
    }
}

async function exploreDocs() {
    ensureConfigDir();
    console.log("Exploring EDSS Documentation...");
    console.log(`Results will be saved to: ${configDir}`);
    
    const explorerPath = join(__dirname, 'edss-doc-explorer.js');
    const child = spawn('node', [explorerPath, 'all'], {
        cwd: configDir,
        stdio: 'inherit'
    });
    
    child.on('close', (code) => {
        if (code === 0) {
            console.log(`\nGenerated files in: ${configDir}`);
        }
    });
}

function startServer(port) {
    const args = [join(__dirname, 'index.js')];
    if (port) {
        args.push('--port', port);
    }
    
    console.log("Starting EDSS Documentation MCP Server...");
    console.log("Use Ctrl+C to stop");
    
    const child = spawn('node', args, { stdio: 'inherit' });
    
    process.on('SIGINT', () => {
        child.kill('SIGINT');
        process.exit(0);
    });
}

function showDemo() {
    console.log(`
EDSS Documentation MCP Tools Demo
=================================

Available MCP Tools:
1. get_edss_documentation      - Retrieve documentation content
2. search_edss_documentation   - Search within documentation
3. analyze_edss_api_endpoints  - Extract API endpoints
4. download_edss_documentation - Get ZIP download info
5. compare_documentation_versions - Compare latest vs trunk

Example Claude Queries:
• "Get the EDSS documentation latest version"
• "Search for 'patient' in the EDSS documentation"
• "Analyze the API endpoints in the EDSS documentation"
• "Download the EDSS documentation as ZIP"
• "Compare the latest and trunk versions of EDSS docs"

To configure Claude Desktop:
1. Copy the MCP configuration from: jdss-rest-doc config
2. Add to Claude Desktop settings
3. Restart Claude Desktop
4. Ask Claude any of the example queries above

Current working directory: ${process.cwd()}
    `);
}

// Main CLI logic
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
    case 'start':
        const portIndex = args.indexOf('--port');
        const port = portIndex !== -1 ? args[portIndex + 1] : null;
        startServer(port);
        break;
    case 'test':
        testDocs();
        break;
    case 'explore':
        exploreDocs();
        break;
    case 'config':
        showConfig();
        break;
    case 'demo':
        showDemo();
        break;
    case 'help':
    case '--help':
    case '-h':
    default:
        showHelp();
        break;
}
EOF
    
    chmod +x cli.js
    print_success "CLI wrapper created"
}

# Create main server file (same as before but with minor tweaks)
create_server() {
    print_status "Creating MCP server..."
    
    cat > index.js << 'EOF'
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
EOF

    chmod +x index.js
    print_success "MCP server created"
}

# Create doc explorer (same as before)
create_doc_explorer() {
    print_status "Creating documentation explorer..."
    
    # Copy the same edss-doc-explorer.js from previous artifact
    # (keeping it the same for brevity)
    cat > edss-doc-explorer.js << 'EOF'
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
EOF

    chmod +x edss-doc-explorer.js
    print_success "Documentation explorer created"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    npm install
    
    print_success "Dependencies installed"
}

# Create global symlinks
create_global_symlinks() {
    print_status "Creating global command symlinks..."
    
    # Create symlinks in ~/.local/bin
    ln -sf "$INSTALL_DIR/cli.js" "$BIN_DIR/jdss-rest-doc"
    ln -sf "$INSTALL_DIR/index.js" "$BIN_DIR/jdss-rest-doc-mcp"
    
    print_success "Global commands created: jdss-rest-doc, jdss-rest-doc-mcp"
}

# Test installation
test_installation() {
    print_status "Testing global installation..."
    
    # Test help command
    node "$INSTALL_DIR/index.js" --help > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "MCP server test passed"
    else
        print_error "MCP server test failed"
        exit 1
    fi
    
    # Test CLI wrapper
    node "$INSTALL_DIR/cli.js" help > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "CLI wrapper test passed"
    else
        print_error "CLI wrapper test failed"
        exit 1
    fi
}

# Create project-specific config template
create_project_template() {
    print_status "Creating project configuration template..."
    
    cat > "$CONFIG_DIR/mcp-settings-template.json" << EOF
{
  "mcpServers": {
    "edss-documentation": {
      "command": "node",
      "args": [
        "${INSTALL_DIR}/index.js"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
EOF
    
    print_success "Configuration template created in $CONFIG_DIR"
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎉 JDSS REST API Documentation MCP Server - Global Installation Complete!"
    echo "======================================================================"
    echo ""
    echo "📁 Global installation: $INSTALL_DIR"
    echo "📁 Configuration directory: $CONFIG_DIR"
    echo "📁 Binary directory: $BIN_DIR"
    echo ""
    echo "🚀 Global Commands Available Anywhere:"
    echo ""
    echo "   jdss-rest-doc start          # Start MCP server"
    echo "   jdss-rest-doc test           # Test documentation access"
    echo "   jdss-rest-doc explore        # Analyze documentation"
    echo "   jdss-rest-doc config         # Show configuration"
    echo "   jdss-rest-doc demo           # Show usage examples"
    echo "   jdss-rest-doc help           # Show help"
    echo ""
    echo "🔧 Usage from any project directory:"
    echo ""
    echo "1. Test documentation access:"
    echo "   jdss-rest-doc test"
    echo ""
    echo "2. Explore documentation (saves to ~/.config/jdss-rest-doc-mcp/):"
    echo "   jdss-rest-doc explore"
    echo ""
    echo "3. Start MCP server:"
    echo "   jdss-rest-doc start"
    echo ""
    echo "4. Get configuration for Claude Desktop:"
    echo "   jdss-rest-doc config"
    echo ""
    echo "📋 Claude Desktop Configuration:"
    echo ""
    echo "Copy this configuration to Claude Desktop settings:"
    echo ""
    echo "{"
    echo "  \"mcpServers\": {"
    echo "    \"jdss-rest-documentation\": {"
    echo "      \"command\": \"node\","
    echo "      \"args\": [\"$INSTALL_DIR/index.js\"]"
    echo "    }"
    echo "  }"
    echo "}"
    echo ""
    echo "🎯 Example Claude Queries:"
    echo ""
    echo "• 'Get the EDSS documentation latest version'"
    echo "• 'Search for \"patient\" in the EDSS documentation'"
    echo "• 'Analyze the API endpoints in the EDSS documentation'"
    echo "• 'Compare latest and trunk EDSS documentation versions'"
    echo ""
    echo "📄 Generated files location: $CONFIG_DIR"
    echo "   - Configuration templates"
    echo "   - Downloaded documentation"
    echo "   - Analysis reports"
    echo ""
    echo "🔄 To update/reinstall: Run this installer script again"
    echo "🗑️  To uninstall: rm -rf $INSTALL_DIR $BIN_DIR/jdss-rest-doc*"
    echo ""
    print_success "Ready to use JDSS REST API documentation from any project!"
    
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        print_warning "Remember to restart your shell or run: source ~/.bashrc"
    fi
}

# Check if this is being run in a project directory
is_project_directory() {
    [ -f "package.json" ] || [ -f "pyproject.toml" ] || [ -f "Cargo.toml" ] || [ -f "go.mod" ] || [ -f "pom.xml" ]
}

# Check if JDSS REST MCP is globally installed
is_globally_installed() {
    [ -d "$INSTALL_DIR" ] && [ -x "$BIN_DIR/jdss-rest-doc-mcp" ]
}

# Create or update mcp.json for current project
create_project_mcp_json() {
    local mcp_file="mcp.json"
    local config="{
  \"mcpServers\": {
    \"jdss-rest-docs\": {
      \"command\": \"node\",
      \"args\": [\"$INSTALL_DIR/index.js\"],
      \"env\": {
        \"NODE_ENV\": \"production\"
      }
    }
  }
}"

    if [ -f "$mcp_file" ]; then
        echo "Backing up existing $mcp_file to ${mcp_file}.backup"
        cp "$mcp_file" "${mcp_file}.backup"
    fi

    echo "$config" > "$mcp_file"
    print_success "Created $mcp_file with JDSS REST MCP configuration"
}

# Main installation flow
main() {
    if is_project_directory; then
        print_status "📁 Project directory detected"
        
        if is_globally_installed; then
            print_success "✅ JDSS REST MCP server already installed globally"
        else
            print_status "🚀 Installing JDSS REST MCP server globally..."
            check_prerequisites
            create_global_structure
            create_package_json
            create_cli_wrapper
            create_server
            create_doc_explorer
            install_dependencies
            create_global_symlinks
            test_installation
            create_project_template
        fi
        
        print_status "📝 Creating project-level mcp.json..."
        create_project_mcp_json
    else
        print_status "🚀 Installing JDSS REST MCP server globally..."
        check_prerequisites
        create_global_structure
        create_package_json
        create_cli_wrapper
        create_server
        create_doc_explorer
        install_dependencies
        create_global_symlinks
        test_installation
        create_project_template
        show_next_steps
    fi
}

# Run installation
main "$@"
