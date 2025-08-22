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
