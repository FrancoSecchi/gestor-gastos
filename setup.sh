#!/bin/bash
# Setup script for Gastos Personales - Tauri 2 app

set -e

echo "=== Gastos Personales - Setup ==="
echo ""

# Install system dependencies (Linux/Ubuntu)
echo "Instalando dependencias del sistema (requiere sudo)..."
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev

echo ""
echo "Instalando dependencias npm..."
npm install

echo ""
echo "=== Setup completo! ==="
echo ""
echo "Para desarrollar: npm run tauri dev"
echo "Para compilar:    npm run tauri build"
