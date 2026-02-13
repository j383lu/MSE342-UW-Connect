#!/bin/bash
set -e # Exit on any error
echo "Installing Cypress system dependencies..."
sudo apt-get update
sudo apt-get install -y libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev \
libnss3 libxss1 libasound2 libxtst6 xauth xvfb
echo "Installing root dependencies..."
npm install
echo "Installing client dependencies..."
cd client
npm install
cd ..
echo "All dependencies installed successfully!"
