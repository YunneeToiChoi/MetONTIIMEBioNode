const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
// const rateLimit = require('express-rate-limit'); // Disabled

// Import AnalystFactory
const AnalystFactory = require('./analysts/AnalystFactory');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize AnalystFactory
const analystFactory = new AnalystFactory();


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

// API: Lấy danh sách analysts có sẵn
app.get('/api/analysts', (req, res) => {
    try {
        console.log('Getting available analysts...');
        
        const analystsInfo = analystFactory.getAllAnalystsInfo();
        console.log('✅ Available analysts:', analystsInfo.map(a => a.name));
        
        res.json({ analysts: analystsInfo });
        
    } catch (error) {
        console.error('Analysts endpoint error:', error);
        res.status(500).json({ error: 'Lỗi khi lấy danh sách analysts: ' + error.message });
    }
});

// API: Lấy thông tin chi tiết của một analyst
app.get('/api/analysts/:name', (req, res) => {
    try {
        const { name } = req.params;
        const analystInfo = analystFactory.getAnalystInfo(name);
        
        if (!analystInfo) {
            return res.status(404).json({ error: `Analyst ${name} không tồn tại` });
        }
        
        res.json({ analyst: analystInfo });
        
    } catch (error) {
        console.error('Analyst info endpoint error:', error);
        res.status(500).json({ error: 'Lỗi khi lấy thông tin analyst: ' + error.message });
    }
});

// API: Lấy danh sách databases có sẵn (Updated to use analysts)
app.get('/api/databases', (req, res) => {
    try {
        const { analyst } = req.query;
        console.log(`Getting databases for analyst: ${analyst || 'all'}`);
        
        if (analyst) {
            // Lấy database cho analyst cụ thể
            const analystInfo = analystFactory.getAnalystInfo(analyst);
            if (!analystInfo) {
                return res.status(404).json({ error: `Analyst ${analyst} không tồn tại` });
            }
            
            res.json({ databases: analystInfo.supportedDatabases });
        } else {
            // Lấy tất cả database từ tất cả analysts (backward compatibility)
            const allAnalysts = analystFactory.getAllAnalystsInfo();
            const allDatabases = [];
            
            allAnalysts.forEach(analystInfo => {
                analystInfo.supportedDatabases.forEach(db => {
                    if (!allDatabases.find(existing => existing.name === db.name)) {
                        allDatabases.push(db);
                    }
                });
            });
            
            res.json({ databases: allDatabases });
        }
        
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

// API: Chạy phân tích (Updated to use AnalystFactory)
app.post('/api/analyze', (req, res) => {
    try {
        const { fileId, database, jobName, customOutputPath, analyst } = req.body;
        
        // Debug logging
        console.log('📊 Analysis request received:');
        console.log('- fileId:', fileId);
        console.log('- database:', database);
        console.log('- analyst:', analyst);
        console.log('- jobName:', jobName);
        console.log('- customOutputPath:', customOutputPath);
        
        // Validation với thông báo chi tiết
        const missingFields = [];
        if (!fileId) missingFields.push('fileId');
        if (!database) missingFields.push('database');
        if (!analyst) missingFields.push('analyst');
        
        if (missingFields.length > 0) {
            const errorMsg = `Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`;
            console.error('❌ Validation failed:', errorMsg);
            return res.status(400).json({ 
                error: errorMsg,
                received: { fileId, database, analyst, jobName, customOutputPath },
                missing: missingFields
            });
        }
        
        // Kiểm tra analyst có tồn tại không
        if (!analystFactory.hasAnalyst(analyst)) {
            return res.status(400).json({ error: `Analyst ${analyst} không được hỗ trợ` });
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
            
            jobOutputDir = path.join(resolvedOutputPath, `${analyst.toUpperCase()}_job_${jobId}`);
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
            name: jobName || `${analyst.toUpperCase()}_Analysis_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
            analyst: analyst,
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
        
        // Chạy analysis trong background
        setTimeout(() => {
            runAnalysisWithFactory(fileInfo, database, jobInfo, analyst);
        }, 100);
        
        res.json({ 
            success: true, 
            jobId: jobId,
            analyst: analyst,
            message: `Phân tích với ${analyst.toUpperCase()} đã được bắt đầu`
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

async function runAnalysisWithFactory(fileInfo, database, jobInfo, analystName) {
    const jobHistoryFile = path.join(historyDir, 'jobs.json');
    
    try {
        // Update job status
        updateJobStatus(jobInfo.id, 'running', `Đang phân tích với ${analystName.toUpperCase()}...`);
        
        // Prepare parameters for analyst
        const analysisParams = {
            // Required by MetontiimeAnalyst
            inputFile: fileInfo,
            outputDir: jobInfo.outputDir,
            jobName: jobInfo.name,
            
            // Additional info for backwards compatibility
            fileInfo: fileInfo,
            jobInfo: jobInfo,
            database: database
        };
        
        // Run analysis using AnalystFactory
        const result = await analystFactory.runAnalysis(analystName, analysisParams);
        
        if (result.success) {
            updateJobStatus(jobInfo.id, 'completed', `Phân tích ${analystName.toUpperCase()} hoàn tất`);
            console.log(`\n✅ ${analystName.toUpperCase()} analysis completed!`);
            
            if (result.resultFiles && result.resultFiles.length > 0) {
                console.log('\n--- 📄 Các file kết quả đã được tạo ---');
                result.resultFiles.forEach(file => console.log(`- ${file}`));
            }
        } else {
            throw new Error(result.message || 'Analysis failed');
        }
        
    } catch (error) {
        console.error(`\n❌ Đã xảy ra lỗi nghiêm trọng trong quá trình chạy ${analystName.toUpperCase()}.`);
        console.error('Chi tiết lỗi:', error.message);
        updateJobStatus(jobInfo.id, 'failed', `Lỗi ${analystName.toUpperCase()}: ${error.message}`);
    }
}

// Legacy function for backward compatibility (nên được deprecated)
async function runDockerAnalysis(fileInfo, database, jobInfo) {
    console.warn('⚠️ Using legacy runDockerAnalysis. Consider migrating to AnalystFactory.');
    return runAnalysisWithFactory(fileInfo, database, jobInfo, 'metontiime');
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
    
    // Display available analysts
    console.log('\n📊 Available Analysts:');
    const analysts = analystFactory.getAvailableAnalysts();
    analysts.forEach(analyst => {
        const info = analystFactory.getAnalystInfo(analyst);
        console.log(`  - ${info.name}: ${info.description}`);
    });
    
    console.log(`\n✅ System ready with ${analysts.length} analyst(s)`);
});

module.exports = app;
