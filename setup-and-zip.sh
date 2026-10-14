#!/bin/bash
set -e
echo "🚀 Packaging AI-Powered WooCommerce PIM System..."
npm install
cd client && npm install && cd ..
zip -r pim-woocommerce-system.zip . -x "node_modules/*" "client/node_modules/*" "client/dist/*" ".git/*" "*.zip"
echo "✅ Project bundled into pim-woocommerce-system.zip!"
