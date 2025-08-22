# Open-E JovianDSS REST API Documentation MCP Server

A Model Context Protocol (MCP) server that provides Claude Code with access to Open-E JovianDSS REST API documentation, enabling intelligent assistance with JovianDSS development and integration.

## 🚀 Features

- **📚 Documentation Access**: Retrieve latest or trunk versions of JDSS REST API documentation
- **🔍 Smart Search**: Search within documentation for specific terms, endpoints, and concepts
- **🔗 API Analysis**: Extract and analyze API endpoints, HTTP methods, and schemas
- **📥 ZIP Downloads**: Access complete documentation packages for offline use
- **🆚 Version Comparison**: Compare different versions of documentation
- **🎯 Global Installation**: Install once, use everywhere across all your projects

## 📦 Installation

### Quick Install (Recommended)

```bash
# Install globally from GitHub
npm install -g https://github.com/miroslawfranek/JDSS-REST-Documentation-MCP.git

# Verify installation
jdss-rest-doc --help
```

### Manual Installation

```bash
# Clone repository
git clone https://github.com/miroslawfranek/JDSS-REST-Documentation-MCP.git
cd JDSS-REST-Documentation-MCP

# Install dependencies
npm install

# Make globally available
npm install -g .
```

### Using Installation Script

```bash
# Run the comprehensive installation script
./install.sh
```

## 🔧 Configuration

### Claude Code Integration

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "jdss-rest-documentation": {
      "command": "jdss-rest-doc-mcp",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Claude Desktop Integration

Add to Claude Desktop settings:

```json
{
  "mcpServers": {
    "jdss-rest-documentation": {
      "command": "node",
      "args": ["path/to/jdss-rest-doc-mcp/index.js"]
    }
  }
}
```

## 🎯 Usage

### Command Line Interface

```bash
# Start MCP server
jdss-rest-doc start

# Test documentation access
jdss-rest-doc test

# Explore and download documentation
jdss-rest-doc explore

# Show configuration information
jdss-rest-doc config

# View usage examples
jdss-rest-doc demo
```

### Claude Integration

Once configured, you can ask Claude:

- *"Get the latest JovianDSS REST API documentation"*
- *"Search for 'volume' in the JDSS documentation"*
- *"Analyze the API endpoints in the JovianDSS documentation"*
- *"Compare latest and trunk versions of JDSS docs"*
- *"Download the complete JDSS documentation as ZIP"*

## 🛠️ Available MCP Tools

### 1. `get_edss_documentation`
Retrieve JDSS REST API documentation content.

**Parameters:**
- `version`: "latest" or "trunk" (default: "latest")
- `section`: Optional specific section to extract

**Example:**
```json
{
  "name": "get_edss_documentation",
  "arguments": {
    "version": "latest",
    "section": "authentication"
  }
}
```

### 2. `search_edss_documentation`
Search within the documentation for specific terms.

**Parameters:**
- `query`: Search term (required)
- `version`: "latest", "trunk", or "both" (default: "latest")

**Example:**
```json
{
  "name": "search_edss_documentation", 
  "arguments": {
    "query": "volume management",
    "version": "both"
  }
}
```

### 3. `analyze_edss_api_endpoints`
Extract and analyze API endpoints from documentation.

**Parameters:**
- `version`: "latest" or "trunk" (default: "latest") 
- `detailed`: Include detailed analysis (default: false)

### 4. `download_edss_documentation`
Get information about downloading documentation as ZIP.

**Parameters:**
- `download`: Return download information (default: true)

### 5. `compare_documentation_versions`
Compare different versions of the documentation.

**Parameters:**
- `focus`: "endpoints", "changes", "summary", or "all" (default: "summary")

## 📋 Documentation URLs

The MCP server accesses these Open-E JovianDSS documentation sources:

- **Latest**: `http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/`
- **Trunk**: `http://dh.lan:777/docs/EDSS/trunk/documentation/v4/`
- **ZIP Download**: `http://dh.lan:777/docs/EDSS/JEFFERSONVILLE/documentation/v4/get_doc.php?t=zip`

## 🏗️ Development

### Project Structure

```
jdss-rest-mcp/
├── package.json              # NPM package configuration
├── README.md                  # This documentation
├── index.js                   # Main MCP server
├── cli.js                     # Command-line interface
├── install.sh                 # Installation script
├── edss-doc-explorer.js       # Documentation analysis tool
└── examples/
    ├── claude-queries.md      # Example Claude interactions
    └── mcp-config.json        # MCP configuration examples
```

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Latest stable version
- **Network Access**: To Open-E documentation servers

### Local Development

```bash
# Clone repository
git clone https://github.com/miroslawfranek/JDSS-REST-Documentation-MCP.git
cd JDSS-REST-Documentation-MCP

# Install dependencies
npm install

# Run in development mode
npm run dev

# Test CLI functionality  
npm run test
```

## 🧪 Testing

### Test Documentation Access

```bash
# Test all documentation endpoints
jdss-rest-doc test

# Test with Node.js directly
node cli.js test
```

### Test MCP Server

```bash
# Start server and test with Claude
npm start

# Run exploration and analysis
npm run explore
```

## 📖 Documentation Structure

The JovianDSS REST API documentation typically includes:

- **Authentication**: API key management and login procedures
- **Volume Management**: Create, modify, and delete storage volumes
- **Pool Operations**: ZFS pool management and monitoring
- **System Information**: Hardware status and system configuration
- **User Management**: User accounts and permissions
- **Monitoring**: Performance metrics and health status
- **Backup & Replication**: Data protection features
- **Network Configuration**: iSCSI, NFS, and CIFS settings

## 🔍 Search Capabilities

The MCP server can find information about:

- **API Endpoints**: `/api/v4/volumes`, `/api/v4/pools`, etc.
- **HTTP Methods**: GET, POST, PUT, DELETE operations
- **Parameters**: Request/response schemas and data types
- **Authentication**: Token-based access and session management
- **Error Codes**: HTTP status codes and error handling
- **Medical/Clinical Terms**: Patient, assessment, score, examination
- **Storage Terms**: Volume, pool, dataset, snapshot, replication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m "Add feature description"`
5. Push to your fork: `git push origin feature-name`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Open-E, Inc.** - For JovianDSS and comprehensive REST API documentation
- **Anthropic** - For Claude and the Model Context Protocol framework
- **Professional Wiki** - For MCP server architecture inspiration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/miroslawfranek/JDSS-REST-Documentation-MCP/issues)
- **Documentation**: [Project Wiki](https://github.com/miroslawfranek/JDSS-REST-Documentation-MCP/wiki)
- **Open-E Support**: [Open-E Knowledge Base](https://www.open-e.com/support/)

---

**🎯 Ready to enhance your JovianDSS development experience with intelligent documentation assistance!**