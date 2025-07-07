const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
// const rateLimit = require('express-rate-limit'); // Disabled

const app = express();
const PORT = process.env.PORT || 3000;

// ======================= CẤU HÌNH CỨNG =======================
const DOCKER_IMAGE_NAME = 'metontiime-image';
const CARD_FASTA_FILE = 'nucleotide_fasta_protein_knockout_model.fasta';
const CARD_TSV_FILE = 'aro_index.tsv';
const CPU_THREADS = 8;
const metontiimeSrcHost = '/home/vannang/Documents/BioB/MetONTIIME';

// Đường dẫn database cố định
const cardDbHost = path.resolve(__dirname, 'databases/card_db');

// Tạo các thư mục cần thiết
const uploadsDir = path.join(__dirname, 'uploads');
const outputsDir = path.join(__dirname, 'outputs');
const historyDir = path.join(__dirname, 'history');

[uploadsDir, outputsDir, historyDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ======================= MIDDLEWARE =======================
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting disabled for development
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // allow 100 requests per 15 minutes
//     skip: (req) => {
//         // Skip rate limiting for certain endpoints
//         const skipPaths = ['/api/databases', '/api/common-directories', '/api/browse-directory'];
//         return skipPaths.some(path => req.path.startsWith(path));
//     }
// });
// app.use('/api/', limiter);

// Cấu hình multer cho upload files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 * 1024 // 10GB limit
    },
    fileFilter: (req, file, cb) => {
        // Chấp nhận các file fastq, fasta, gz
        const allowedExtensions = ['.fastq', '.fasta', '.gz', '.fq', '.fa'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        const isCompressed = file.originalname.toLowerCase().endsWith('.gz');
        
        if (allowedExtensions.some(ext => file.originalname.toLowerCase().includes(ext)) || isCompressed) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file .fastq, .fasta, .fq, .fa hoặc file nén .gz'));
        }
    }
});

// ======================= ROUTES =======================

// Trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Lấy danh sách databases có sẵn (Hardcoded CARD Database)
app.get('/api/databases', (req, res) => {
    try {
        console.log('Returning hardcoded CARD database...');
        
        // Kiểm tra files có tồn tại không
        const requiredFiles = [
            { path: path.join(cardDbHost, CARD_FASTA_FILE), name: 'CARD FASTA' },
            { path: path.join(cardDbHost, CARD_TSV_FILE), name: 'CARD TSV' }
        ];
        
        for (const file of requiredFiles) {
            if (!fs.existsSync(file.path)) {
                console.error(`❌ Missing ${file.name}: ${file.path}`);
                return res.status(500).json({ 
                    error: `Database file missing: ${file.name}`,
                    databases: []
                });
            }
        }
        
        // CARD Database cố định
        const databases = [{
            name: "CARD Database",
            fastaFile: CARD_FASTA_FILE,
            tsvFile: CARD_TSV_FILE,
            path: cardDbHost,
            description: "Comprehensive Antibiotic Resistance Database",
            type: "hardcoded"
        }];
        
        console.log('✅ CARD database configuration valid');
        res.json({ databases });
        
    } catch (error) {
        console.error('Database endpoint error:', error);
        res.status(500).json({ error: 'Lỗi khi đọc database: ' + error.message });
    }
});

// API: Upload file
app.post('/api/upload', upload.single('inputFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }
        
        const fileInfo = {
            id: uuidv4(),
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            uploadTime: new Date().toISOString(),
            path: req.file.path
        };
        
        // Lưu thông tin file vào history
        const historyFile = path.join(historyDir, 'uploads.json');
        let uploadHistory = [];
        
        if (fs.existsSync(historyFile)) {
            uploadHistory = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        }
        
        uploadHistory.push(fileInfo);
        fs.writeFileSync(historyFile, JSON.stringify(uploadHistory, null, 2));
        
        res.json({ 
            success: true, 
            file: fileInfo,
            message: 'File đã được upload thành công'
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi upload file: ' + error.message });
    }
});

// API: Chạy phân tích
app.post('/api/analyze', (req, res) => {
    try {
        const { fileId, database, jobName, customOutputPath } = req.body;
        
        if (!fileId || !database) {
            return res.status(400).json({ error: 'Thiếu thông tin file hoặc database' });
        }
        
        // Tìm file trong upload history
        const historyFile = path.join(historyDir, 'uploads.json');
        if (!fs.existsSync(historyFile)) {
            return res.status(404).json({ error: 'Không tìm thấy file upload' });
        }
        
        const uploadHistory = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        const fileInfo = uploadHistory.find(f => f.id === fileId);
        
        if (!fileInfo) {
            return res.status(404).json({ error: 'File không tồn tại' });
        }
        
        // Tạo job ID và thư mục output
        const jobId = uuidv4();
        let jobOutputDir;
        
        if (customOutputPath && customOutputPath.trim()) {
            // Sử dụng custom output path
            const resolvedOutputPath = path.resolve(customOutputPath);
            if (!fs.existsSync(resolvedOutputPath)) {
                return res.status(400).json({ error: `Output directory does not exist: ${resolvedOutputPath}` });
            }
            
            // Check if directory is writable
            try {
                const testFile = path.join(resolvedOutputPath, '.write_test');
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
            } catch (writeError) {
                return res.status(400).json({ error: `Output directory is not writable: ${resolvedOutputPath}` });
            }
            
            jobOutputDir = path.join(resolvedOutputPath, `MetONTIIME_job_${jobId}`);
        } else {
            return res.status(400).json({ error: 'Output directory is required. Please select where to save results.' });
        }
        
        // Create job output directory
        try {
            fs.mkdirSync(jobOutputDir, { recursive: true });
        } catch (mkdirError) {
            return res.status(500).json({ error: `Failed to create output directory: ${mkdirError.message}` });
        }
        
        // Thông tin job
        const jobInfo = {
            id: jobId,
            name: jobName || `Analysis_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
            fileId: fileId,
            fileName: fileInfo.originalName,
            database: database,
            status: 'running',
            startTime: new Date().toISOString(),
            outputDir: jobOutputDir,
            customOutput: !!customOutputPath
        };
        
        // Lưu job info
        const jobHistoryFile = path.join(historyDir, 'jobs.json');
        let jobHistory = [];
        
        if (fs.existsSync(jobHistoryFile)) {
            jobHistory = JSON.parse(fs.readFileSync(jobHistoryFile, 'utf8'));
        }
        
        jobHistory.push(jobInfo);
        fs.writeFileSync(jobHistoryFile, JSON.stringify(jobHistory, null, 2));
        
        // Chạy Docker command trong background
        setTimeout(() => {
            runDockerAnalysis(fileInfo, database, jobInfo);
        }, 100);
        
        res.json({ 
            success: true, 
            jobId: jobId,
            message: 'Phân tích đã được bắt đầu'
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Lỗi khởi tạo phân tích: ' + error.message });
    }
});

// API: Lấy upload history
app.get('/api/upload-history', (req, res) => {
    try {
        const historyFile = path.join(historyDir, 'uploads.json');
        let uploadHistory = [];
        
        if (fs.existsSync(historyFile)) {
            uploadHistory = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        }
        
        res.json({ uploads: uploadHistory.reverse() }); // Newest first
    } catch (error) {
        res.status(500).json({ error: 'Lỗi đọc upload history: ' + error.message });
    }
});

// API: Lấy job history
app.get('/api/job-history', (req, res) => {
    try {
        const jobHistoryFile = path.join(historyDir, 'jobs.json');
        let jobHistory = [];
        
        if (fs.existsSync(jobHistoryFile)) {
            jobHistory = JSON.parse(fs.readFileSync(jobHistoryFile, 'utf8'));
        }
        
        res.json({ jobs: jobHistory.reverse() }); // Newest first
    } catch (error) {
        res.status(500).json({ error: 'Lỗi đọc job history: ' + error.message });
    }
});

// API: Download kết quả
app.get('/api/download/:jobId/:filename', (req, res) => {
    try {
        const { jobId, filename } = req.params;
        const filePath = path.join(outputsDir, jobId, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File không tồn tại' });
        }
        
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi download file: ' + error.message });
    }
});

// API: Lấy danh sách files kết quả của một job
app.get('/api/job-results/:jobId', (req, res) => {
    try {
        const { jobId } = req.params;
        const jobOutputDir = path.join(outputsDir, jobId);
        
        if (!fs.existsSync(jobOutputDir)) {
            return res.json({ files: [] });
        }
        
        const files = fs.readdirSync(jobOutputDir).map(filename => {
            const filePath = path.join(jobOutputDir, filename);
            const stats = fs.statSync(filePath);
            
            return {
                name: filename,
                size: stats.size,
                modified: stats.mtime.toISOString()
            };
        });
        
        res.json({ files });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi đọc kết quả job: ' + error.message });
    }
});

// API: Browse directories for input file selection
app.get('/api/browse-directory', (req, res) => {
    try {
        const dirPath = req.query.path || process.env.HOME || '/home';
        
        if (!fs.existsSync(dirPath)) {
            return res.status(404).json({ error: 'Đường dẫn không tồn tại' });
        }
        
        const items = fs.readdirSync(dirPath).map(item => {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);
            
            return {
                name: item,
                path: itemPath,
                isDirectory: stats.isDirectory(),
                size: stats.isDirectory() ? null : stats.size,
                modified: stats.mtime.toISOString()
            };
        });
        
        // Separate directories and files, show directories first
        const directories = items.filter(item => item.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
        const files = items.filter(item => !item.isDirectory && 
            (item.name.toLowerCase().includes('.fastq') || 
             item.name.toLowerCase().includes('.fasta') ||
             item.name.toLowerCase().includes('.fq') ||
             item.name.toLowerCase().includes('.fa') ||
             item.name.toLowerCase().endsWith('.gz')))
            .sort((a, b) => a.name.localeCompare(b.name));
        
        res.json({ 
            currentPath: dirPath,
            parentPath: path.dirname(dirPath),
            items: [...directories, ...files]
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi khi duyệt thư mục: ' + error.message });
    }
});

// API: Get common directories
app.get('/api/common-directories', (req, res) => {
    try {
        const homeDir = process.env.HOME || '/home';
        const commonDirs = [
            { name: 'Home', path: homeDir },
            { name: 'Documents', path: path.join(homeDir, 'Documents') },
            { name: 'Downloads', path: path.join(homeDir, 'Downloads') },
            { name: 'Desktop', path: path.join(homeDir, 'Desktop') },
            { name: 'Current Project', path: __dirname }
        ].filter(dir => fs.existsSync(dir.path));
        
        res.json({ directories: commonDirs });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi khi lấy thư mục: ' + error.message });
    }
});

// API: Select input file from system
app.post('/api/select-input-file', (req, res) => {
    try {
        const { filePath } = req.body;
        
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(400).json({ error: 'File không tồn tại' });
        }
        
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            return res.status(400).json({ error: 'Đây là thư mục, không phải file' });
        }
        
        // Validate file type
        const fileName = path.basename(filePath).toLowerCase();
        const isValidFile = fileName.includes('.fastq') || 
                           fileName.includes('.fasta') ||
                           fileName.includes('.fq') ||
                           fileName.includes('.fa') ||
                           fileName.endsWith('.gz');
        
        if (!isValidFile) {
            return res.status(400).json({ error: 'File không đúng định dạng FASTQ/FASTA' });
        }
        
        const fileInfo = {
            id: uuidv4(),
            originalName: path.basename(filePath),
            filename: path.basename(filePath),
            size: stats.size,
            uploadTime: new Date().toISOString(),
            path: filePath,
            isSystemFile: true
        };
        
        // Lưu thông tin file vào history
        const historyFile = path.join(historyDir, 'uploads.json');
        let uploadHistory = [];
        
        if (fs.existsSync(historyFile)) {
            uploadHistory = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        }
        
        uploadHistory.push(fileInfo);
        fs.writeFileSync(historyFile, JSON.stringify(uploadHistory, null, 2));
        
        res.json({ 
            success: true, 
            file: fileInfo,
            message: 'File đã được chọn thành công từ hệ thống'
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi khi chọn file: ' + error.message });
    }
});

// ======================= HELPER FUNCTIONS =======================

async function runDockerAnalysis(fileInfo, database, jobInfo) {
    const jobHistoryFile = path.join(historyDir, 'jobs.json');
    
    try {
        // Update job status
        updateJobStatus(jobInfo.id, 'running', 'Đang phân tích...');
        
        // Sử dụng cấu hình cứng giống script gốc
        console.log('Bắt đầu kiểm tra cấu hình...');
        
        const requiredPaths = [
            { path: path.join(cardDbHost, CARD_FASTA_FILE), name: 'File CARD FASTA' },
            { path: path.join(cardDbHost, CARD_TSV_FILE), name: 'File CARD TSV' },
            { path: metontiimeSrcHost, name: 'Thư mục mã nguồn MetONTIIME' }
        ];
        
        for (const item of requiredPaths) {
            if (!fs.existsSync(item.path)) {
                console.error(`❌ Lỗi: Không tìm thấy ${item.name} tại: ${item.path}`);
                throw new Error(`Không tìm thấy ${item.name} tại: ${item.path}`);
            }
        }
        
        console.log('✅ Cấu hình hợp lệ. Bắt đầu xây dựng lệnh Docker...');
        
        // Determine input path for Docker
        let inputPath;
        if (fileInfo.isSystemFile) {
            inputPath = path.dirname(fileInfo.path);
        } else {
            inputPath = path.dirname(fileInfo.path);
        }
        
        // Ensure output directory exists and is writable
        if (!fs.existsSync(jobInfo.outputDir)) {
            fs.mkdirSync(jobInfo.outputDir, { recursive: true });
        }
        
        // Docker command giống như script gốc
        const dockerCommand = `
        docker run --rm \
            -v "${inputPath}":/app/input \
            -v "${jobInfo.outputDir}":/app/output \
            -v "${cardDbHost}":/app/databases/card \
            -v "${metontiimeSrcHost}":/app/src \
            -v "/var/run/docker.sock":"/var/run/docker.sock" \
            ${DOCKER_IMAGE_NAME} \
            nextflow run /app/src/metontiime2.nf -profile docker \
                --workDir /app/input \
                --resultsDir /app/output \
                --dbSequencesFasta "/app/databases/card/${CARD_FASTA_FILE}" \
                --dbTaxonomyTsv "/app/databases/card/${CARD_TSV_FILE}" \
                --threads ${CPU_THREADS}
        `.replace(/\n/g, ' ');
        
        console.log('🚀 Đang thực thi lệnh Docker...');
        console.log(`Input file: ${fileInfo.path}`);
        console.log(`Output directory: ${jobInfo.outputDir}`);
        console.log(`FASTA: /app/databases/card/${CARD_FASTA_FILE}`);
        console.log(`TSV: /app/databases/card/${CARD_TSV_FILE}`);
        console.log(`\nLệnh được thực thi:\n${dockerCommand}\n`);
        
        execSync(dockerCommand, { stdio: 'inherit' });
        
        updateJobStatus(jobInfo.id, 'completed', 'Phân tích hoàn tất');
        console.log('\n✅ Phân tích hoàn tất!');
        
        // Check result files
        const resultFiles = fs.readdirSync(jobInfo.outputDir);
        if (resultFiles.length > 0) {
            console.log('\n--- 📄 Các file kết quả đã được tạo ---');
            resultFiles.forEach(file => console.log(`- ${file}`));
        } else {
            console.warn('⚠️ Phân tích chạy xong nhưng không tạo ra file kết quả nào.');
        }
        
    } catch (error) {
        console.error('\n❌ Đã xảy ra lỗi nghiêm trọng trong quá trình chạy Docker.');
        console.error('Chi tiết lỗi:', error.message);
        updateJobStatus(jobInfo.id, 'failed', `Lỗi: ${error.message}`);
    }
}

function updateJobStatus(jobId, status, message) {
    try {
        const jobHistoryFile = path.join(historyDir, 'jobs.json');
        
        if (fs.existsSync(jobHistoryFile)) {
            let jobHistory = JSON.parse(fs.readFileSync(jobHistoryFile, 'utf8'));
            
            const jobIndex = jobHistory.findIndex(job => job.id === jobId);
            if (jobIndex !== -1) {
                jobHistory[jobIndex].status = status;
                jobHistory[jobIndex].message = message;
                jobHistory[jobIndex].lastUpdate = new Date().toISOString();
                
                if (status === 'completed' || status === 'failed') {
                    jobHistory[jobIndex].endTime = new Date().toISOString();
                }
                
                fs.writeFileSync(jobHistoryFile, JSON.stringify(jobHistory, null, 2));
            }
        }
    } catch (error) {
        console.error('Lỗi cập nhật job status:', error.message);
    }
}

// ======================= START SERVER =======================

app.listen(PORT, () => {
    console.log(`🚀 MetONTIIME Web Interface đang chạy tại http://localhost:${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`📁 Outputs directory: ${outputsDir}`);
    console.log(`📁 History directory: ${historyDir}`);
});

module.exports = app;
