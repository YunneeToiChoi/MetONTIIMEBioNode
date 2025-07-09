# MetONTIIME Web Interface

A modern, extensible web interface for bioinformatics pipelines with a focus on the MetONTIIME analysis workflow. This application provides a user-friendly interface for:

- 📁 **File Input**: Upload files or browse system directories for FASTQ/FASTA files
- 🧬 **Multiple Analysts**: Support for different analysis engines through the Analyst Factory system
- 🗄️ **Database Management**: Select from available databases specific to each analyst
- 📊 **Real-time Monitoring**: Track analysis progress with live status updates
- 📋 **Comprehensive History**: Manage upload and job histories
- ⬇️ **Result Access**: Download and organize analysis results
- 🎯 **Custom Output Paths**: Choose where to save analysis results

## Features

### 🌟 Modern User Interface

- **Responsive web design** built with Bootstrap 5
- **Drag-and-drop file upload** with progress tracking
- **System file browser** for selecting input files from local directories
- **Real-time job monitoring** with detailed status updates
- **Mobile-friendly design** that adapts to all screen sizes
- **Intuitive navigation** with organized tabs and sections

### 📂 Advanced File Management

- **Dual Input Methods**: Upload files or browse/select from system directories
- **File Validation**: Automatic format validation for FASTQ/FASTA files (.fastq, .fasta, .fq, .fa, .gz)
- **Upload History**: Complete tracking of all file uploads and selections
- **Job Management**: Monitor multiple concurrent analysis jobs
- **Custom Output Directories**: Choose specific locations for saving results
- **Result Organization**: Results are organized by job ID and analyst type

### 🔬 Analyst Factory System

- **Extensible Architecture**: Plugin-based system for adding new analysis tools
- **Multiple Analysts**: Support for MetONTIIME and other bioinformatics pipelines
- **Database Compatibility**: Each analyst supports specific databases
- **Dynamic Discovery**: Automatic detection and registration of available analysts
- **Unified Interface**: Consistent API regardless of underlying analysis tool

### 🔧 Technical Features

- **RESTful API** with comprehensive endpoints
- **Background Processing**: Non-blocking analysis execution
- **Error Handling**: Robust error management with user-friendly messages
- **Rate Limiting**: Protection against API abuse (configurable)
- **Large File Support**: Handle files up to 10GB
- **Docker Integration**: Containerized analysis for isolation and reproducibility
- **CORS Support**: Cross-origin resource sharing for API access

## Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Docker** (for running analysis pipelines)
- **Linux/macOS/WSL** (recommended for optimal compatibility)

### Option 1: Quick Setup (Recommended)

1. **Clone and setup**:

   ```bash
   git clone <your-repo-url>
   cd MetONTIIMEBioNode
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Start the application**:

   ```bash
   npm start
   ```

3. **Access the interface**: http://localhost:3000

### Option 2: Manual Installation

1. **Install Node.js** (if not already installed):

   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # CentOS/RHEL/Fedora
   sudo dnf install nodejs npm

   # macOS
   brew install node
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Create required directories**:

   ```bash
   mkdir -p uploads outputs history databases
   ```

4. **Start the server**:
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

### Option 3: Docker Deployment

1. **Build the web interface**:

   ```bash
   docker build -f Dockerfile.web -t metontiime-web .
   ```

2. **Run with volume mounts**:

   ```bash
   docker run -d \
     --name metontiime-web \
     -p 3000:3000 \
     -v $(pwd)/uploads:/app/uploads \
     -v $(pwd)/outputs:/app/outputs \
     -v $(pwd)/databases:/app/databases \
     -v $(pwd)/history:/app/history \
     -v /var/run/docker.sock:/var/run/docker.sock \
     metontiime-web
   ```

3. **Access the application**: http://localhost:3000

## Usage Workflow

### 1. Select Input Files

**Method A: Upload Files**

- Navigate to the **Upload & Analyze** tab
- Drag and drop your FASTQ/FASTA file (supports .gz compression)
- Files are validated automatically for correct format

**Method B: Browse System Files**

- Click **Browse System Files** in the Upload tab
- Navigate through your file system using the directory browser
- Select FASTQ/FASTA files directly from any accessible location
- Files remain in their original location (no copying required)

### 2. Configure Analysis

- **Choose Analyst**: Select from available analysis engines (MetONTIIME, etc.)
- **Select Database**: Pick an appropriate database for your chosen analyst
- **Set Job Name**: Provide a descriptive name for your analysis (optional)
- **Choose Output Directory**: Select where results should be saved

### 3. Monitor Progress

- Switch to the **Analysis Jobs** tab
- View real-time status updates for all running analyses
- Job states: `Queued` → `Running` → `Completed` / `Failed`
- Click job entries to see detailed progress information

### 4. Access Results

- Click the **Results** button for completed jobs
- Browse and download individual result files
- Results are organized by job ID and analyst type
- Files are saved in your chosen output directory

### 5. Manage History

- **Upload History**: View all uploaded and selected files
- **Analysis Jobs**: Monitor all past and current analysis tasks
- **Re-use Files**: Select previously uploaded files for new analyses
- **Export Data**: Access job metadata and execution logs

- Click **Results** button for completed jobs
- Download individual result files
- Results are organized by job ID

### 4. Manage History

- **Upload History**: View all uploaded files
- **Analysis Jobs**: Monitor all analysis tasks
- Re-use previously uploaded files for new analyses

## API Reference

The application provides a comprehensive RESTful API:

### Analyst Management

- `GET /api/analysts` - List all available analysts
- `GET /api/analysts/:name` - Get detailed information about a specific analyst

### Database Operations

- `GET /api/databases` - List all available databases
- `GET /api/databases?analyst=:name` - Get databases supported by specific analyst

### File Operations

- `POST /api/upload` - Upload a new file via web interface
- `POST /api/select-input-file` - Select a file from the system
- `GET /api/upload-history` - Get complete upload/selection history

### Analysis Management

- `POST /api/analyze` - Start a new analysis job
- `GET /api/job-history` - Get all analysis job history
- `GET /api/job-results/:jobId` - Get result files for a specific job

### File System Browsing

- `GET /api/browse-directory?path=:path` - Browse directories and files
- `GET /api/common-directories` - Get frequently used directories

### Result Access

- `GET /api/download/:jobId/:filename` - Download specific result files

### API Response Examples

```json
// GET /api/analysts
{
  "analysts": [
    {
      "name": "metontiime",
      "description": "MetONTIIME taxonomic classification pipeline",
      "version": "1.0.0",
      "supportedDatabases": [...],
      "requiredInputs": ["inputFile", "outputDir", "jobName"]
    }
  ]
}

// POST /api/analyze
{
  "success": true,
  "jobId": "uuid-string",
  "analyst": "metontiime",
  "message": "Analysis started successfully"
}
```

## Project Architecture

```
MetONTIIMEBioNode/
├── server.js                    # Main Express.js server
├── package.json                 # Node.js dependencies and scripts
├── setup.sh                     # Automated setup script
├── start.sh                     # Production startup script
├── run.sh                       # Development run script
├── Dockerfile.web               # Docker configuration for web interface
├── send_to_docker.js           # Legacy Docker communication (deprecated)
│
├── public/                      # Frontend web interface
│   ├── index.html              # Main HTML application
│   ├── app.js                  # Frontend JavaScript logic
│   └── style.css               # Custom CSS styles
│
├── analysts/                    # Analyst Factory System
│   ├── AnalystFactory.js       # Main factory for analyst management
│   ├── BaseAnalyst.js          # Abstract base class for all analysts
│   ├── MetontiimeAnalyst.js    # MetONTIIME pipeline implementation
│   ├── ExampleAnalyst.js       # Template for creating new analysts
│   └── README.md               # Analyst system documentation
│
├── uploads/                     # Uploaded files (auto-created)
├── outputs/                     # Analysis results (auto-created)
├── history/                     # Job and upload history (auto-created)
│   ├── jobs.json               # Analysis job tracking
│   └── uploads.json            # File upload/selection history
│
├── databases/                   # Analysis databases
│   └── card_db/                # Example CARD database
│
├── input_data/                  # Sample input files
├── output_results/              # Legacy output directory
└── METONTIIMEBio/               # Core pipeline files (if applicable)
```

### Key Components

#### 1. **Web Server** (`server.js`)

- Express.js-based REST API server
- Handles file uploads, job management, and result serving
- Integrates with Analyst Factory for dynamic pipeline support
- Provides comprehensive error handling and logging

#### 2. **Analyst Factory System** (`analysts/`)

- **Factory Pattern**: Manages multiple analysis pipelines
- **Extensible**: Easy to add new analysts without modifying core code
- **Uniform Interface**: Consistent API across different analysis tools
- **Dynamic Registration**: Automatic discovery of available analysts

#### 3. **Frontend** (`public/`)

- Modern HTML5/CSS3/JavaScript interface
- Bootstrap 5 for responsive design
- Real-time updates via polling/websockets
- File upload with drag-and-drop support

#### 4. **Storage Systems**

- **File Storage**: Organized upload and output directories
- **History Tracking**: JSON-based job and upload history
- **Database Integration**: Flexible database mounting and selection

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000                           # Web server port (default: 3000)
NODE_ENV=production                 # Environment mode (development/production)

# File Upload Settings
MAX_FILE_SIZE=10737418240          # Maximum file size in bytes (10GB)
UPLOAD_DIR=./uploads               # Upload directory path
OUTPUT_DIR=./outputs               # Output directory path

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # Rate limit window (15 minutes)
RATE_LIMIT_MAX=100                 # Max requests per window
```

### File and Database Configuration

#### Supported File Formats

- **FASTQ**: `.fastq`, `.fq` (raw or gzipped)
- **FASTA**: `.fasta`, `.fa` (raw or gzipped)
- **Compressed**: Any of above with `.gz` extension
- **Size Limit**: Up to 10GB per file

#### Database Setup

```bash
databases/
├── card_db/                       # CARD resistance database
│   ├── sequences.fasta           # Sequence data
│   └── annotations.tsv           # Metadata/taxonomy
├── silva_db/                     # Example additional database
│   ├── silva_sequences.fasta
│   └── silva_taxonomy.tsv
└── custom_db/                    # Your custom databases
    ├── custom.fasta
    └── custom.tsv
```

### Security Configuration

#### Rate Limiting (Configurable)

```javascript
// Current settings in server.js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for certain endpoints
    const skipPaths = ["/api/databases", "/api/common-directories"];
    return skipPaths.some((path) => req.path.startsWith(path));
  },
});
```

#### File Upload Security

- File type validation based on extension and MIME type
- Size limits to prevent abuse
- Unique filename generation to prevent conflicts
- No direct execution of uploaded files

## System Requirements

### Hardware Requirements

- **CPU**: 4+ cores recommended for concurrent analyses
- **RAM**: 8GB minimum, 16GB+ recommended for large datasets
- **Storage**:
  - 50GB+ free space for databases and results
  - SSD recommended for better I/O performance
  - Network storage compatible for shared deployments

### Software Dependencies

#### Core Requirements

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (usually bundled with Node.js)
- **Docker**: Version 20.0+ (for running analysis pipelines)
- **Git**: For cloning and version control

#### Operating System Support

- **Linux**: Ubuntu 18.04+, CentOS 8+, Debian 10+ (recommended)
- **macOS**: macOS 10.15+ with Homebrew
- **Windows**: Windows 10+ with WSL2 (Windows Subsystem for Linux)

#### Docker Images

- **MetONTIIME**: `metontiime-image` (for MetONTIIME analyst)
- **Custom**: Additional images as required by other analysts

### Database Requirements

#### MetONTIIME Databases

- **CARD Database**: Comprehensive Antibiotic Resistance Database
  - Sequences: `.fasta` format
  - Annotations: `.tsv` format with taxonomy information
- **Custom Databases**: User-provided reference databases
  - Must follow consistent naming and format conventions

#### Database Storage

- Each database should be in its own subdirectory under `databases/`
- Minimum required files per database:
  - At least one `.fasta` file (reference sequences)
  - At least one `.tsv` file (annotations/taxonomy)
- Recommended database sizes: 100MB - 50GB per database

## Troubleshooting

### Installation Issues

#### 1. **Node.js Installation Problems**

```bash
# Issue: "npm: command not found"
# Solution: Install Node.js using package manager
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 2. **Permission Errors**

```bash
# Issue: Permission denied when creating directories
# Solution: Fix ownership and permissions
sudo chown -R $USER:$USER ./MetONTIIMEBioNode
chmod +x setup.sh start.sh run.sh

# Issue: NPM permission errors
# Solution: Configure npm for user-level packages
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### 3. **Docker Setup Issues**

```bash
# Issue: "Cannot connect to Docker daemon"
# Solution: Start Docker service and add user to docker group
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Log out and log back in

# Verify Docker installation
docker --version
docker run hello-world
```

### Runtime Issues

#### 4. **File Upload Failures**

- **Large Files**: Ensure sufficient disk space and increase timeout settings
- **Format Validation**: Check file extensions match supported formats
- **Network Issues**: Verify stable internet connection for large uploads
- **Browser Limits**: Try different browsers if upload stalls

#### 5. **Analysis Job Failures**

```bash
# Check Docker images are available
docker images | grep metontiime

# Verify database integrity
ls -la databases/*/
# Ensure each database has .fasta and .tsv files

# Check system resources
df -h          # Disk space
free -h        # Memory usage
top           # CPU usage
```

#### 6. **Web Interface Issues**

```bash
# Issue: "Cannot access web interface"
# Check if port is available
netstat -tulpn | grep 3000

# Try different port
PORT=8080 npm start

# Check firewall settings (Linux)
sudo ufw status
sudo ufw allow 3000
```

#### 7. **API Connection Problems**

```bash
# Check server logs for errors
npm start
# Look for error messages in console output

# Test API endpoints manually
curl http://localhost:3000/api/analysts
curl http://localhost:3000/api/databases

# Verify CORS settings for external access
# Edit server.js CORS configuration if needed
```

### Performance Optimization

#### 8. **Slow Analysis Performance**

- **Resource Allocation**: Increase Docker memory/CPU limits
- **Concurrent Jobs**: Limit simultaneous analyses based on system capacity
- **Storage**: Use SSD storage for databases and temp files
- **Network**: Ensure high-speed storage access for large files

#### 9. **Memory Issues**

```bash
# Monitor memory usage during analysis
watch -n 5 'free -h && docker stats --no-stream'

# Increase system swap if needed
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Database Management

#### 10. **Database Configuration Issues**

```bash
# Verify database structure
find databases/ -name "*.fasta" -o -name "*.tsv"

# Check database permissions
ls -la databases/*/

# Validate database format (example for FASTA)
head -n 10 databases/card_db/*.fasta
# Should start with ">" for FASTA format
```

### Development Issues

#### 11. **Development Mode Problems**

```bash
# Install development dependencies
npm install --only=dev

# Use nodemon for auto-restart during development
npm run dev

# Enable verbose logging
NODE_ENV=development DEBUG=* npm start
```

#### 12. **Code Modification Issues**

- **Syntax Errors**: Check server.js syntax with `node --check server.js`
- **Module Issues**: Ensure all dependencies in package.json are installed
- **API Changes**: Test API endpoints after modifications
- **Frontend Changes**: Clear browser cache after updating public/ files

### Getting Help

If you encounter issues not covered here:

1. **Check Logs**: Always examine console output and error messages
2. **System Resources**: Monitor CPU, memory, and disk usage
3. **Docker Status**: Verify Docker containers are running properly
4. **Network Connectivity**: Test local and remote connections
5. **File Permissions**: Ensure proper read/write access to all directories
6. **Version Compatibility**: Verify all software versions meet requirements

For persistent issues, provide:

- Error messages and logs
- System information (OS, Node.js version, Docker version)
- Steps to reproduce the problem
- Expected vs. actual behavior

## Security & Best Practices

### Security Considerations

#### Input Validation

- **File Type Filtering**: Only accepts validated bioinformatics file formats
- **Size Limitations**: Configurable file size limits prevent abuse
- **Content Validation**: MIME type checking prevents malicious file uploads
- **Path Sanitization**: Prevents directory traversal attacks

#### API Security

- **Rate Limiting**: Configurable limits prevent API abuse and DDoS attacks
- **CORS Policy**: Controlled cross-origin resource sharing
- **Input Sanitization**: All user inputs are validated and sanitized
- **Error Handling**: Generic error messages prevent information disclosure

#### System Isolation

- **Docker Containerization**: Analysis processes run in isolated containers
- **No Direct Execution**: Uploaded files are never directly executed
- **Sandboxed Analysis**: All pipeline execution happens within Docker
- **Resource Limits**: Container resource limits prevent system exhaustion

### Best Practices

#### File Management

- **Regular Cleanup**: Implement automated cleanup of old files and results
- **Backup Strategy**: Regular backups of important databases and results
- **Storage Monitoring**: Monitor disk usage and implement alerts
- **Access Logging**: Log all file access and analysis activities

#### Performance Optimization

- **Resource Monitoring**: Monitor CPU, memory, and I/O usage
- **Concurrent Limits**: Limit simultaneous analyses based on system capacity
- **Database Indexing**: Optimize database access for large reference sets
- **Caching Strategy**: Implement caching for frequently accessed data

#### Maintenance

- **Regular Updates**: Keep Node.js, Docker, and dependencies up to date
- **Log Rotation**: Implement log rotation to prevent disk space issues
- **Health Monitoring**: Monitor application health and performance metrics
- **Documentation**: Keep API documentation and usage guides current

## Development & Extension

### Adding New Analysts

The Analyst Factory system makes it easy to add new bioinformatics tools:

1. **Create New Analyst Class**:

   ```javascript
   // analysts/YourAnalyst.js
   const BaseAnalyst = require("./BaseAnalyst");

   class YourAnalyst extends BaseAnalyst {
     constructor() {
       super();
       this.name = "your-analyst";
       this.description = "Description of your analysis tool";
       this.version = "1.0.0";
     }

     async analyze(params) {
       // Implement your analysis logic
     }

     getSupportedDatabases() {
       // Return array of supported databases
     }

     getRequiredInputs() {
       // Return array of required input parameters
     }
   }
   ```

2. **Register with Factory**:
   The AnalystFactory automatically discovers and registers analysts in the `analysts/` directory.

3. **Test Integration**:

   ```bash
   # Restart server to load new analyst
   npm restart

   # Verify analyst is available
   curl http://localhost:3000/api/analysts
   ```

### Frontend Customization

#### Styling

- **CSS Framework**: Bootstrap 5 for responsive design
- **Custom Styles**: Add custom CSS to `public/style.css`
- **Theme Customization**: Modify Bootstrap variables for branding

#### JavaScript Extensions

- **API Integration**: Extend `public/app.js` for new functionality
- **Real-time Updates**: Implement WebSocket connections for live updates
- **Interactive Features**: Add data visualization and interactive elements

### API Extensions

#### Adding New Endpoints

```javascript
// In server.js
app.get("/api/your-endpoint", (req, res) => {
  try {
    // Your endpoint logic
    res.json({ success: true, data: yourData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Middleware Integration

```javascript
// Custom middleware example
const customMiddleware = (req, res, next) => {
  // Your middleware logic
  next();
};

app.use("/api/protected", customMiddleware);
```

### Testing

#### Unit Testing

```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Run tests
npm test
```

#### Integration Testing

```bash
# Test API endpoints
curl -X POST http://localhost:3000/api/upload \
  -F "inputFile=@test-file.fastq"

# Test analyst functionality
curl http://localhost:3000/api/analysts/metontiime
```

### Contributing

1. **Fork the Repository**: Create your own fork for development
2. **Feature Branches**: Use feature branches for new functionality
3. **Code Standards**: Follow existing code style and conventions
4. **Documentation**: Update documentation for new features
5. **Testing**: Add tests for new functionality
6. **Pull Requests**: Submit pull requests with detailed descriptions

### Deployment Considerations

#### Production Deployment

- **Environment Variables**: Use production environment settings
- **Process Management**: Use PM2 or similar for process management
- **Reverse Proxy**: Configure nginx or Apache for SSL and load balancing
- **Monitoring**: Implement application monitoring and alerting
- **Backup Strategy**: Regular backups of databases and configurations

#### Scaling

- **Horizontal Scaling**: Deploy multiple instances behind load balancer
- **Database Scaling**: Consider database replication for large deployments
- **Container Orchestration**: Use Kubernetes for large-scale deployments
- **CDN Integration**: Use CDN for static assets in distributed deployments

## Migration & Upgrade Guide

### Migrating from Original send_to_docker.js

The original command-line script has been completely replaced with this modern web interface. Here's what's changed:

#### ✅ **Major Improvements**

- **🌐 Web-based Interface**: No more command-line complexity
- **📤 Flexible File Input**: Upload files or browse system directories
- **🔀 Multiple Analysts**: Support for different analysis tools via Factory pattern
- **📊 Real-time Monitoring**: Live job status tracking and progress updates
- **🗄️ Database Management**: Dynamic database selection per analyst
- **📋 Complete History**: Track all uploads, jobs, and results
- **🎯 Custom Output Paths**: Choose where to save results
- **📱 Mobile-Friendly**: Responsive design for all devices
- **🔒 Enhanced Security**: Rate limiting, validation, and error handling
- **🐳 Better Docker Integration**: Improved container management and logging

#### 🔄 **Migration Steps**

1. **Backup Existing Data**:

   ```bash
   # Backup your old results and databases
   cp -r /path/to/old/outputs ./backup_outputs
   cp -r /path/to/old/databases ./databases
   ```

2. **Install New System**:

   ```bash
   git clone <repository-url>
   cd MetONTIIMEBioNode
   ./setup.sh
   ```

3. **Migrate Databases**:

   ```bash
   # Copy existing databases to new structure
   cp -r /path/to/old/databases/* ./databases/
   ```

4. **Test Migration**:
   ```bash
   npm start
   # Access http://localhost:3000 and test with sample files
   ```

#### 🔄 **Configuration Changes**

- **File Paths**: No more hardcoded paths - select via web interface
- **Database Selection**: Choose databases dynamically per analysis
- **Output Management**: Specify custom output directories
- **Job Naming**: Provide descriptive names for better organization

### Upgrading Between Versions

#### Version Compatibility

- **v1.0.0**: Initial release with MetONTIIME support
- **v1.1.0**: Added Analyst Factory system
- **v1.2.0**: Enhanced file browsing and custom output paths

#### Upgrade Process

```bash
# Backup current installation
cp -r MetONTIIMEBioNode MetONTIIMEBioNode_backup

# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Restart application
npm restart
```

## License & Credits

### License

This project is released under the **MIT License**, making it free to use, modify, and distribute.

```
MIT License

Copyright (c) 2025 MetONTIIME Web Interface Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### Credits & Acknowledgments

#### Core Technologies

- **Node.js & Express.js**: Web server framework
- **Bootstrap 5**: Frontend UI framework
- **Docker**: Containerization and analysis isolation
- **MetONTIIME Pipeline**: Core bioinformatics analysis tool

#### Databases & Resources

- **CARD Database**: Comprehensive Antibiotic Resistance Database
- **NCBI**: National Center for Biotechnology Information
- **Bioinformatics Community**: Open source tools and methodologies

#### Development Tools

- **Visual Studio Code**: Primary development environment
- **Git**: Version control and collaboration
- **npm**: Package management and dependency resolution
- **GitHub**: Repository hosting and collaboration platform

### Contributing

We welcome contributions from the bioinformatics and web development communities:

#### 🤝 **Ways to Contribute**

- **🐛 Bug Reports**: Report issues and bugs via GitHub Issues
- **💡 Feature Requests**: Suggest new features and improvements
- **🔧 Code Contributions**: Submit pull requests with enhancements
- **📚 Documentation**: Improve documentation and usage guides
- **🧪 Testing**: Help test new features and report compatibility issues
- **🎨 UI/UX**: Contribute to interface design and user experience

#### 📋 **Contribution Guidelines**

1. **Fork** the repository and create feature branches
2. **Follow** existing code style and conventions
3. **Test** your changes thoroughly before submitting
4. **Document** new features and API changes
5. **Submit** pull requests with clear descriptions

#### 🌟 **Recognition**

All contributors are acknowledged in our GitHub repository and release notes.

### Support & Community

#### 📞 **Getting Help**

- **GitHub Issues**: Technical problems and bug reports
- **Documentation**: Comprehensive guides and API references
- **Community Forums**: Share experiences and best practices

#### 🔗 **Related Projects**

- **MetONTIIME Pipeline**: Core bioinformatics analysis tool
- **CARD Database**: Antibiotic resistance gene database
- **Oxford Nanopore Technologies**: Long-read sequencing platform

### Changelog

#### v1.2.0 (Current)

- ✅ Added system file browsing capabilities
- ✅ Implemented custom output directory selection
- ✅ Enhanced Analyst Factory with dynamic discovery
- ✅ Improved error handling and user feedback
- ✅ Added comprehensive API documentation

#### v1.1.0

- ✅ Introduced Analyst Factory system
- ✅ Added support for multiple analysis tools
- ✅ Implemented database-analyst compatibility
- ✅ Enhanced job tracking and history

#### v1.0.0

- ✅ Initial release with MetONTIIME support
- ✅ Web-based file upload interface
- ✅ Real-time job monitoring
- ✅ Basic database selection
- ✅ Result download functionality

---

## Quick Reference

### 🚀 **Essential Commands**

```bash
# Setup and Installation
./setup.sh                    # Complete setup
npm install                   # Install dependencies only
npm start                     # Start production server
npm run dev                   # Start development server

# Maintenance
npm update                    # Update dependencies
docker system prune          # Clean Docker resources
ls -la uploads/ outputs/     # Check storage usage
```

### 🌐 **Key URLs**

- **Main Interface**: http://localhost:3000
- **API Base**: http://localhost:3000/api
- **Analyst List**: http://localhost:3000/api/analysts
- **Database List**: http://localhost:3000/api/databases

### 📁 **Important Directories**

- `uploads/` - Uploaded files
- `outputs/` - Analysis results
- `databases/` - Reference databases
- `history/` - Job and upload tracking
- `public/` - Web interface files
- `analysts/` - Analysis tool implementations

---

**🎯 Ready to start analyzing? Run `npm start` and visit http://localhost:3000!**
