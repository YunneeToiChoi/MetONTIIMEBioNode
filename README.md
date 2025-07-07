# MetONTIIME Web Interface

A modern web interface for the MetONTIIME bioinformatics pipeline that allows users to:

- 📁 Upload FASTQ/FASTA files through a web browser
- 🗄️ Select databases from available local databases
- 📊 Monitor analysis jobs with real-time status
- 📋 View upload and job history
- ⬇️ Download results when analysis is complete

## Features

### 🌟 User Interface

- **Modern, responsive web interface** built with Bootstrap 5
- **Drag-and-drop file upload** with progress tracking
- **Real-time job monitoring** with status updates
- **Mobile-friendly design** that works on all devices

### 📂 File Management

- **Upload History**: View all previously uploaded files
- **Job Tracking**: Monitor analysis progress and status
- **Result Downloads**: Easy access to completed analysis results
- **File Validation**: Automatic validation of FASTQ/FASTA formats

### 🔧 Technical Features

- **RESTful API** for all operations
- **Background job processing** using Docker containers
- **Rate limiting** to prevent abuse
- **Error handling** with user-friendly messages
- **File size limits** and format validation

## Quick Start

### Option 1: Direct Installation

1. **Install Node.js** (if not already installed):

   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Or using package manager
   sudo apt install nodejs npm
   ```

2. **Run setup script**:

   ```bash
   ./setup.sh
   ```

3. **Start the application**:

   ```bash
   npm start
   ```

4. **Open in browser**: http://localhost:3000

### Option 2: Using Docker

1. **Build the web interface image**:

   ```bash
   docker build -f Dockerfile.web -t metontiime-web .
   ```

2. **Run the web interface**:

   ```bash
   docker run -p 3000:3000 \
     -v $(pwd)/uploads:/app/uploads \
     -v $(pwd)/outputs:/app/outputs \
     -v $(pwd)/databases:/app/databases \
     -v /var/run/docker.sock:/var/run/docker.sock \
     metontiime-web
   ```

3. **Open in browser**: http://localhost:3000

## Usage Workflow

### 1. Upload Files

- Navigate to the **Upload & Analyze** tab
- Select your FASTQ or FASTA file (supports .gz compression)
- Choose a meaningful job name (optional)
- Select an appropriate database

### 2. Monitor Progress

- Switch to the **Analysis Jobs** tab
- View real-time status of your analysis
- Jobs show as: Running → Completed/Failed

### 3. Download Results

- Click **Results** button for completed jobs
- Download individual result files
- Results are organized by job ID

### 4. Manage History

- **Upload History**: View all uploaded files
- **Analysis Jobs**: Monitor all analysis tasks
- Re-use previously uploaded files for new analyses

## API Endpoints

The application provides a RESTful API:

- `GET /api/databases` - List available databases
- `POST /api/upload` - Upload a new file
- `POST /api/analyze` - Start analysis job
- `GET /api/upload-history` - Get upload history
- `GET /api/job-history` - Get job history
- `GET /api/job-results/:jobId` - Get job results
- `GET /api/download/:jobId/:filename` - Download result file

## Project Structure

```
my-metontiime-app/
├── server.js              # Express.js server
├── package.json           # Node.js dependencies
├── setup.sh              # Setup script
├── Dockerfile.web        # Docker configuration
├── public/               # Web interface files
│   ├── index.html        # Main HTML page
│   ├── app.js           # Frontend JavaScript
│   └── style.css        # Custom styles
├── uploads/             # Uploaded files (created automatically)
├── outputs/             # Analysis results (created automatically)
├── history/             # Job and upload history (created automatically)
└── databases/           # Database files
    └── card_db/         # Example CARD database
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### File Limits

- Maximum file size: 10GB
- Supported formats: .fastq, .fasta, .fq, .fa (with optional .gz compression)
- Rate limit: 10 requests per 15 minutes per IP

## Requirements

### System Requirements

- **Node.js 18+** and npm
- **Docker** (for running MetONTIIME pipeline)
- **MetONTIIME Docker image** (`metontiime-image`)

### Database Requirements

- Databases should be in `databases/` directory
- Each database folder should contain:
  - At least one `.fasta` file (sequences)
  - At least one `.tsv` file (taxonomy/annotations)

## Troubleshooting

### Common Issues

1. **"npm: command not found"**

   - Install Node.js using the setup script or package manager

2. **Upload fails**

   - Check file format (must be FASTQ/FASTA)
   - Ensure file size is under 10GB limit
   - Verify sufficient disk space

3. **Analysis jobs fail**

   - Ensure MetONTIIME Docker image exists: `docker images | grep metontiime`
   - Check database files are properly formatted
   - Verify Docker daemon is running

4. **Can't access web interface**
   - Check if port 3000 is available: `netstat -tulpn | grep 3000`
   - Try different port: `PORT=8080 npm start`

## Security Considerations

- Rate limiting prevents API abuse
- File type validation prevents malicious uploads
- No direct file system access from web interface
- Docker isolation for analysis processes

## Development

To modify the application:

1. **Backend**: Edit `server.js` for API changes
2. **Frontend**: Edit files in `public/` directory
3. **Styling**: Modify `public/style.css`
4. **Client Logic**: Update `public/app.js`

### Development Mode

```bash
npm install --dev
npm run dev  # Uses nodemon for auto-restart
```

## Migration from Original Script

The original `send_to_docker.js` script has been replaced with this web interface. Key improvements:

- ✅ **Web-based UI** instead of command-line
- ✅ **File upload interface** instead of hardcoded paths
- ✅ **Database selection** instead of fixed database
- ✅ **Job tracking** with status monitoring
- ✅ **History management** for uploads and results
- ✅ **Modern, responsive design**
- ✅ **Error handling** and user feedback

## License

This project follows the same license as the original MetONTIIME pipeline.
