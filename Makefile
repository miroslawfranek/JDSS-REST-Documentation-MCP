# JDSS REST Documentation MCP Server - Build and Deployment
# ========================================================

# Package information
PACKAGE_NAME = @miroslaw.franek/jdss-rest-doc-mcp-server
VERSION = $(shell node -p "require('./package.json').version")
PACKAGE_FILE = open-e-jdss-rest-doc-mcp-server-$(VERSION).tgz

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help clean install test build pack publish status check-auth check-version

# Default target
help:
	@echo "$(BLUE)JDSS REST Documentation MCP Server - Build System$(NC)"
	@echo "=================================================="
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@echo "  help         - Show this help message"
	@echo "  install      - Install dependencies"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean build artifacts and node_modules"
	@echo "  build        - Build the package (install + test)"
	@echo "  pack         - Create npm package (.tgz file)"
	@echo "  publish      - Publish to npm registry"
	@echo "  status       - Show package status and version info"
	@echo "  check-auth   - Check npm authentication"
	@echo "  check-version- Compare local vs published version"
	@echo ""
	@echo "$(YELLOW)Example workflow:$(NC)"
	@echo "  make install    # Install dependencies"
	@echo "  make test       # Run tests"
	@echo "  make pack       # Create package"
	@echo "  make publish    # Publish to npm"

# Install dependencies
install:
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)Dependencies installed successfully$(NC)"

# Run tests
test:
	@echo "$(BLUE)Running tests...$(NC)"
	npm run test
	@echo "$(GREEN)Tests completed successfully$(NC)"

# Clean build artifacts
clean:
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -f *.tgz
	rm -rf node_modules
	rm -f package-lock.json
	@echo "$(GREEN)Clean completed$(NC)"

# Build (install + test)
build: install test
	@echo "$(GREEN)Build completed successfully$(NC)"

# Create npm package
pack: build
	@echo "$(BLUE)Creating npm package...$(NC)"
	npm pack
	@if [ -f "$(PACKAGE_FILE)" ]; then \
		echo "$(GREEN)Package created: $(PACKAGE_FILE)$(NC)"; \
		ls -la $(PACKAGE_FILE); \
	else \
		echo "$(RED)Package creation failed$(NC)"; \
		exit 1; \
	fi

# Check npm authentication
check-auth:
	@echo "$(BLUE)Checking npm authentication...$(NC)"
	@if npm whoami >/dev/null 2>&1; then \
		echo "$(GREEN)Authenticated as: $(shell npm whoami)$(NC)"; \
	else \
		echo "$(RED)Not authenticated. Run: npm login$(NC)"; \
		exit 1; \
	fi

# Check version comparison
check-version:
	@echo "$(BLUE)Checking version status...$(NC)"
	@LOCAL_VERSION=$(VERSION); \
	PUBLISHED_VERSION=$$(npm view $(PACKAGE_NAME) version 2>/dev/null || echo "not-published"); \
	echo "Local version:     $$LOCAL_VERSION"; \
	echo "Published version: $$PUBLISHED_VERSION"; \
	if [ "$$LOCAL_VERSION" = "$$PUBLISHED_VERSION" ]; then \
		echo "$(YELLOW)Versions match - no publish needed$(NC)"; \
	else \
		echo "$(GREEN)Version differs - ready to publish$(NC)"; \
	fi

# Publish to npm
publish: check-auth check-version pack
	@echo "$(BLUE)Publishing to npm registry...$(NC)"
	@LOCAL_VERSION=$(VERSION); \
	PUBLISHED_VERSION=$$(npm view $(PACKAGE_NAME) version 2>/dev/null || echo "not-published"); \
	if [ "$$LOCAL_VERSION" = "$$PUBLISHED_VERSION" ]; then \
		echo "$(YELLOW)Version $$LOCAL_VERSION already published$(NC)"; \
		echo "$(YELLOW)Skipping publish. Update version in package.json to publish.$(NC)"; \
	else \
		echo "$(GREEN)Publishing version $$LOCAL_VERSION...$(NC)"; \
		npm publish; \
		if [ $$? -eq 0 ]; then \
			echo "$(GREEN)Successfully published $(PACKAGE_NAME)@$$LOCAL_VERSION$(NC)"; \
			echo "$(GREEN)Package can now be installed with:$(NC)"; \
			echo "  npm install -g $(PACKAGE_NAME)"; \
		else \
			echo "$(RED)Publish failed$(NC)"; \
			exit 1; \
		fi; \
	fi

# Show package status
status:
	@echo "$(BLUE)Package Status$(NC)"
	@echo "=============="
	@echo "Package name: $(PACKAGE_NAME)"
	@echo "Local version: $(VERSION)"
	@echo ""
	@echo "$(BLUE)Local files:$(NC)"
	@ls -la *.tgz 2>/dev/null || echo "No package files found"
	@echo ""
	@echo "$(BLUE)NPM info:$(NC)"
	@npm info $(PACKAGE_NAME) 2>/dev/null || echo "Package not found on npm registry"
	@echo ""
	@if npm whoami >/dev/null 2>&1; then \
		echo "$(GREEN)NPM authenticated as: $(shell npm whoami)$(NC)"; \
	else \
		echo "$(RED)Not authenticated with npm$(NC)"; \
	fi

# Quick development workflow
dev: clean install test
	@echo "$(GREEN)Development build completed$(NC)"

# Full release workflow
release: clean build pack publish
	@echo "$(GREEN)Release completed successfully$(NC)"