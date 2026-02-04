#!/bin/bash

# Clean localhost deployment cache for OpenZeppelin upgrades
# Run this before deploying strategies to localhost fork
#
# NOTE: With unsafeSkipStorageCheck enabled in deploy scripts,
# this cleanup is optional but recommended for a clean state

echo "Cleaning OpenZeppelin upgrade caches..."

# Remove .openzeppelin cache folders
cd /Users/mkjck/ovnstable-core
find . -type d -name ".openzeppelin" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true

# Remove system temp cache
rm -rf /var/folders/*/T/openzeppelin-upgrades/ 2>/dev/null || true

# Remove localhost deployments
find . -type d -name "localhost" -path "*/deployments/localhost" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true

echo "Cache cleaned successfully!"
echo ""
echo "Now you can deploy safely:"
echo "  cd ~/ovnstable-core/pkg/strategies/blast"
echo "  STAND=blast hh deploy --tags StrategyZerolend --impl --gov --network localhost"

