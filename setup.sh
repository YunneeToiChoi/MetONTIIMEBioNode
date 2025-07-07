#!/bin/bash

echo "🚀 MetONTIIME Web Interface Setup"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo ""
    echo "Please install Node.js first:"
    echo "  Option 1 - Using package manager:"
    echo "    sudo apt update && sudo apt install nodejs npm  # Ubuntu/Debian"
    echo "    sudo yum install nodejs npm                      # CentOS/RHEL"
    echo "    sudo pacman -S nodejs npm                        # Arch Linux"
    echo ""
    echo "  Option 2 - Using NodeSource repository:"
    echo "    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "    sudo apt-get install -y nodejs"
    echo ""
    echo "  Option 3 - Using NVM (Node Version Manager):"
    echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "    source ~/.bashrc"
    echo "    nvm install 18"
    echo "    nvm use 18"
    echo ""
    echo "After installing Node.js, run this script again."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup completed successfully!"
    echo ""
    echo "🚀 To start the web interface:"
    echo "   npm start"
    echo ""
    echo "📱 Then open in your browser:"
    echo "   http://localhost:3000"
    echo ""
    echo "🐳 Alternative: Use Docker (if you prefer):"
    echo "   docker build -t metontiime-web ."
    echo "   docker run -p 3000:3000 -v \$(pwd)/uploads:/app/uploads -v \$(pwd)/outputs:/app/outputs metontiime-web"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
