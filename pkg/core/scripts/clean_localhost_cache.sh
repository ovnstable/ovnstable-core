#!/bin/bash

# Clean localhost deployment cache for OpenZeppelin upgrades
# Run this before deploying to localhost fork

echo "Cleaning OpenZeppelin upgrade caches..."

# Remove .openzeppelin cache folders
find . -type d -name ".openzeppelin" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true

# Remove system temp cache
rm -rf /var/folders/*/T/openzeppelin-upgrades/ 2>/dev/null || true

# Remove localhost deployments
find . -type d -name "localhost" -path "*/deployments/localhost" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true

echo "Cache cleaned successfully!"
echo ""
echo "Now you can deploy safely:"
echo "  cd ~/ovnstable-core/pkg/core"
echo "  STAND=blast hh deploy --tags UsdPlusTokenV1 --impl --gov --network localhost"

