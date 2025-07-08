class MetONTIIMEApp {
    constructor() {
        this.selectedFile = null;
        this.currentBrowsePath = null;
        this.modalCurrentPath = null;
        this.init();
        this.loadAnalysts();
        this.loadDatabases();
        this.setupEventListeners();
        this.loadCommonDirectories();
    }

    init() {
        // Load initial data when tabs are switched
        document.addEventListener('shown.bs.tab', (event) => {
            if (event.target.id === 'upload-history-tab') {
                this.loadUploadHistory();
            } else if (event.target.id === 'job-history-tab') {
                this.loadJobHistory();
            }
        });
    }

    setupEventListeners() {
        // Input method selection
        document.querySelectorAll('input[name="inputMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleInputMethod(e.target.value);
            });
        });

        // File upload form
        document.getElementById('uploadForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFileUpload();
        });

        // File input change
        document.getElementById('inputFile').addEventListener('change', (e) => {
            if (this.validateFile(e.target.files[0])) {
                this.selectedFile = {
                    type: 'upload',
                    file: e.target.files[0]
                };
                this.showAnalysisConfig();
            }
        });

        // Start analysis button
        document.getElementById('startAnalysisBtn').addEventListener('click', () => {
            this.startAnalysis();
        });

        // Analyst selection change
        document.getElementById('analyst').addEventListener('change', (e) => {
            this.loadDatabasesForAnalyst(e.target.value);
        });

        // Browse navigation
        document.getElementById('goUpButton').addEventListener('click', () => {
            this.navigateUp();
        });

        // Output directory browser
        document.getElementById('browseOutputButton').addEventListener('click', () => {
            this.openDirectoryModal();
        });

        // Modal navigation
        document.getElementById('modalGoUpButton').addEventListener('click', () => {
            this.modalNavigateUp();
        });

        document.getElementById('selectDirectoryButton').addEventListener('click', () => {
            this.selectOutputDirectory();
        });
    }

    toggleInputMethod(method) {
        const uploadSection = document.getElementById('uploadSection');
        const browseSection = document.getElementById('browseSection');
        const analysisConfig = document.getElementById('analysisConfig');

        if (method === 'upload') {
            uploadSection.style.display = 'block';
            browseSection.style.display = 'none';
        } else {
            uploadSection.style.display = 'none';
            browseSection.style.display = 'block';
            if (!this.currentBrowsePath) {
                this.loadCommonDirectories();
                this.browsePath(process.env.HOME || '/home');
            }
        }
        
        analysisConfig.style.display = 'none';
        this.selectedFile = null;
    }

    showAnalysisConfig() {
        document.getElementById('analysisConfig').style.display = 'block';
    }

    async loadCommonDirectories() {
        try {
            const response = await fetch('/api/common-directories');
            
            if (!response.ok) {
                console.warn('Failed to load common directories, using fallback');
                return;
            }
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('Non-JSON response from common directories');
                return;
            }
            
            const data = await response.json();
            
            const container = document.getElementById('commonDirectories');
            container.innerHTML = '';
            
            if (data.directories && data.directories.length > 0) {
                data.directories.forEach(dir => {
                    const button = document.createElement('button');
                    button.className = 'btn btn-outline-secondary btn-sm mb-1 w-100 text-start';
                    button.innerHTML = `<i class="fas fa-folder me-2"></i>${dir.name}`;
                    button.onclick = () => this.browsePath(dir.path);
                    container.appendChild(button);
                });
            } else {
                container.innerHTML = '<p class="text-muted small">No quick access directories available</p>';
            }
        } catch (error) {
            console.error('Failed to load common directories:', error);
            const container = document.getElementById('commonDirectories');
            container.innerHTML = '<p class="text-muted small">Quick access not available</p>';
        }
    }

    async browsePath(path) {
        try {
            const response = await fetch(`/api/browse-directory?path=${encodeURIComponent(path)}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            
            this.currentBrowsePath = data.currentPath;
            document.getElementById('currentPath').value = data.currentPath;
            
            const browser = document.getElementById('fileBrowser');
            browser.innerHTML = '';
            
            // Add parent directory option if not at root
            if (data.parentPath !== data.currentPath) {
                const parentItem = this.createBrowserItem({
                    name: '..',
                    path: data.parentPath,
                    isDirectory: true
                }, true);
                browser.appendChild(parentItem);
            }
            
            // Add directories and files
            data.items.forEach(item => {
                const browserItem = this.createBrowserItem(item);
                browser.appendChild(browserItem);
            });
            
        } catch (error) {
            this.showAlert('error', 'Failed to browse directory: ' + error.message);
        }
    }

    createBrowserItem(item, isParent = false) {
        const div = document.createElement('div');
        div.className = 'border-bottom p-2 browser-item';
        div.style.cursor = 'pointer';
        
        const icon = item.isDirectory ? 'fas fa-folder text-warning' : 'fas fa-file text-primary';
        const size = item.isDirectory ? '' : ` (${this.formatFileSize(item.size)})`;
        
        div.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="${icon} me-2"></i>
                <span class="flex-grow-1">${item.name}${size}</span>
                ${!item.isDirectory ? '<i class="fas fa-mouse-pointer text-muted"></i>' : ''}
            </div>
        `;
        
        div.addEventListener('click', () => {
            if (item.isDirectory || isParent) {
                this.browsePath(item.path);
            } else {
                this.selectSystemFile(item);
            }
        });
        
        // Hover effect
        div.addEventListener('mouseenter', () => {
            div.style.backgroundColor = '#f8f9fa';
        });
        div.addEventListener('mouseleave', () => {
            div.style.backgroundColor = '';
        });
        
        return div;
    }

    async selectSystemFile(fileItem) {
        try {
            const response = await fetch('/api/select-input-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filePath: fileItem.path })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.selectedFile = {
                    type: 'system',
                    fileInfo: result.file
                };
                
                document.getElementById('selectedFilePath').value = fileItem.path;
                this.showAlert('success', result.message);
                this.showAnalysisConfig();
            } else {
                this.showAlert('error', result.error);
            }
        } catch (error) {
            this.showAlert('error', 'Failed to select file: ' + error.message);
        }
    }

    navigateUp() {
        if (this.currentBrowsePath) {
            const parentPath = this.currentBrowsePath.split('/').slice(0, -1).join('/') || '/';
            this.browsePath(parentPath);
        }
    }

    async loadAnalysts() {
        try {
            console.log('Loading available analysts...');
            const response = await fetch('/api/analysts');
            
            if (!response.ok) {
                throw new Error(`Failed to load analysts: ${response.status}`);
            }
            
            const data = await response.json();
            const select = document.getElementById('analyst');
            select.innerHTML = '<option value="">Select an analysis method...</option>';
            
            data.analysts.forEach(analyst => {
                const option = document.createElement('option');
                option.value = analyst.name;
                option.textContent = `${analyst.displayName} - ${analyst.description}`;
                select.appendChild(option);
            });
            
            // Auto-select MetONTIIME if available
            const metontiimeOption = select.querySelector('option[value="metontiime"]');
            if (metontiimeOption) {
                select.value = 'metontiime';
                this.loadDatabasesForAnalyst('metontiime');
            }
            
            console.log('Analysts loaded successfully');
            
        } catch (error) {
            console.error('Failed to load analysts:', error);
            this.showAlert('warning', 'Failed to load analysts. Using default MetONTIIME.');
            
            // Fallback to MetONTIIME
            const select = document.getElementById('analyst');
            select.innerHTML = '<option value="metontiime">MetONTIIME - Metagenomics Analysis Pipeline</option>';
            select.value = 'metontiime';
            this.loadDatabases(); // Load default databases
        }
    }

    async loadDatabasesForAnalyst(analystName) {
        if (!analystName) {
            const select = document.getElementById('database');
            select.innerHTML = '<option value="">Select analyst first...</option>';
            return;
        }
        
        try {
            console.log(`Loading databases for analyst: ${analystName}`);
            const response = await fetch(`/api/databases?analyst=${encodeURIComponent(analystName)}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load databases: ${response.status}`);
            }
            
            const data = await response.json();
            const select = document.getElementById('database');
            select.innerHTML = '<option value="">Select a database...</option>';
            
            data.databases.forEach(database => {
                const option = document.createElement('option');
                option.value = JSON.stringify(database);
                option.textContent = `${database.name} - ${database.description}`;
                select.appendChild(option);
            });
            
            // Auto-select first database if only one available
            if (data.databases.length === 1) {
                select.value = JSON.stringify(data.databases[0]);
            }
            
            console.log(`Databases loaded for ${analystName}:`, data.databases.length);
            
        } catch (error) {
            console.error(`Failed to load databases for ${analystName}:`, error);
            this.showAlert('warning', `Failed to load databases for ${analystName}. Using default.`);
            this.loadDatabases(); // Fallback to default
        }
    }

    async loadDatabases() {
        console.log('Loading hardcoded CARD database...');
        
        // Hardcode CARD database để tránh lỗi từ server
        const select = document.getElementById('database');
        select.innerHTML = '<option value="">Select a database...</option>';
        
        // CARD Database cố định theo cấu hình gốc
        const cardDatabase = {
            name: "CARD Database",
            fastaFile: "nucleotide_fasta_protein_knockout_model.fasta", 
            tsvFile: "aro_index.tsv",
            jsonFile: "card.json",
            path: "databases/card_db",
            description: "Comprehensive Antibiotic Resistance Database"
        };
        
        const option = document.createElement('option');
        option.value = JSON.stringify(cardDatabase);
        option.textContent = `${cardDatabase.name} (FASTA: ${cardDatabase.fastaFile}, TSV: ${cardDatabase.tsvFile})`;
        select.appendChild(option);
        
        // Tự động chọn database duy nhất
        select.value = JSON.stringify(cardDatabase);
        
        console.log('CARD database loaded successfully (hardcoded)');
        this.showAlert('success', 'Database loaded: CARD (Comprehensive Antibiotic Resistance Database)');
    }

    loadFallbackDatabases() {
        // Không cần fallback nữa vì đã hardcode
        console.log('Using hardcoded database, no fallback needed');
    }

    validateFile(file) {
        if (!file) return;
        
        const allowedExtensions = ['.fastq', '.fasta', '.fq', '.fa'];
        const fileName = file.name.toLowerCase();
        const isValidExtension = allowedExtensions.some(ext => 
            fileName.includes(ext)) || fileName.endsWith('.gz');
        
        if (!isValidExtension) {
            this.showAlert('warning', 'Please select a valid FASTQ or FASTA file');
            document.getElementById('inputFile').value = '';
            return false;
        }
        
        // Show file info
        const fileSize = this.formatFileSize(file.size);
        this.showAlert('info', `Selected file: ${file.name} (${fileSize})`);
        return true;
    }

    async handleFileUpload() {
        // This method is now handled by startAnalysis()
        // Keeping for backward compatibility
        this.startAnalysis();
    }

    async loadUploadHistory() {
        const container = document.getElementById('uploadHistoryContent');
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border" role="status"></div></div>';
        
        try {
            const response = await fetch('/api/upload-history');
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.uploads.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5 text-muted">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <h5>No uploads yet</h5>
                        <p>Upload your first file to get started</p>
                    </div>
                `;
                return;
            }
            
            let html = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Size</th>
                                <th>Upload Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.uploads.forEach(upload => {
                const uploadTime = new Date(upload.uploadTime).toLocaleString();
                const fileSize = this.formatFileSize(upload.size);
                
                html += `
                    <tr>
                        <td>
                            <i class="fas fa-file-alt me-2 text-primary"></i>
                            ${upload.originalName}
                        </td>
                        <td class="file-size">${fileSize}</td>
                        <td>${uploadTime}</td>
                        <td>
                            <button class="btn btn-outline-primary btn-sm" 
                                    onclick="app.useFileForAnalysis('${upload.id}', '${upload.originalName}')">
                                <i class="fas fa-play me-1"></i>
                                Use for Analysis
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
            
        } catch (error) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load upload history: ${error.message}
                </div>
            `;
        }
    }

    async loadJobHistory() {
        const container = document.getElementById('jobHistoryContent');
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border" role="status"></div></div>';
        
        try {
            const response = await fetch('/api/job-history');
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.jobs.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5 text-muted">
                        <i class="fas fa-tasks fa-3x mb-3"></i>
                        <h5>No analysis jobs yet</h5>
                        <p>Start your first analysis to see results here</p>
                    </div>
                `;
                return;
            }
            
            let html = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Job Name</th>
                                <th>File</th>
                                <th>Database</th>
                                <th>Status</th>
                                <th>Started</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.jobs.forEach(job => {
                const startTime = new Date(job.startTime).toLocaleString();
                const statusClass = this.getStatusClass(job.status);
                const statusIcon = this.getStatusIcon(job.status);
                
                html += `
                    <tr>
                        <td>
                            <strong>${job.name}</strong><br>
                            <small class="text-muted">ID: ${job.id}</small>
                        </td>
                        <td>
                            <i class="fas fa-file-alt me-1 text-primary"></i>
                            ${job.fileName}
                        </td>
                        <td>
                            <i class="fas fa-database me-1 text-info"></i>
                            ${job.database.name}
                        </td>
                        <td>
                            <span class="badge ${statusClass}">
                                <i class="${statusIcon} me-1"></i>
                                ${job.status.toUpperCase()}
                            </span>
                            ${job.message ? `<br><small class="text-muted">${job.message}</small>` : ''}
                        </td>
                        <td>${startTime}</td>
                        <td>
                            ${job.status === 'completed' ? 
                                `<button class="btn btn-outline-success btn-sm" 
                                         onclick="app.showJobResults('${job.id}', '${job.name}')">
                                    <i class="fas fa-download me-1"></i>
                                    Results
                                </button>` : 
                                job.status === 'running' ?
                                `<button class="btn btn-outline-warning btn-sm" disabled>
                                    <i class="fas fa-spinner fa-spin me-1"></i>
                                    Running
                                </button>` :
                                `<button class="btn btn-outline-danger btn-sm" disabled>
                                    <i class="fas fa-times me-1"></i>
                                    Failed
                                </button>`
                            }
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
            
        } catch (error) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load job history: ${error.message}
                </div>
            `;
        }
    }

    async showJobResults(jobId, jobName) {
        const modal = new bootstrap.Modal(document.getElementById('resultsModal'));
        const modalTitle = document.querySelector('#resultsModal .modal-title');
        const resultsContent = document.getElementById('resultsContent');
        
        modalTitle.innerHTML = `<i class="fas fa-download me-2"></i>Results: ${jobName}`;
        resultsContent.innerHTML = '<div class="text-center py-4"><div class="spinner-border" role="status"></div></div>';
        
        modal.show();
        
        try {
            const response = await fetch(`/api/job-results/${jobId}`);
            const data = await response.json();
            
            if (data.files.length === 0) {
                resultsContent.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        No result files found for this job
                    </div>
                `;
                return;
            }
            
            let html = `
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Size</th>
                                <th>Modified</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.files.forEach(file => {
                const modifiedTime = new Date(file.modified).toLocaleString();
                const fileSize = this.formatFileSize(file.size);
                
                html += `
                    <tr>
                        <td>
                            <i class="fas fa-file me-1 text-primary"></i>
                            ${file.name}
                        </td>
                        <td class="file-size">${fileSize}</td>
                        <td>${modifiedTime}</td>
                        <td>
                            <a href="/api/download/${jobId}/${file.name}" 
                               class="btn btn-outline-primary btn-sm" 
                               download="${file.name}">
                                <i class="fas fa-download me-1"></i>
                                Download
                            </a>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            resultsContent.innerHTML = html;
            
        } catch (error) {
            resultsContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load results: ${error.message}
                </div>
            `;
        }
    }

    useFileForAnalysis(fileId, fileName) {
        // Switch to upload tab
        const uploadTab = new bootstrap.Tab(document.getElementById('upload-tab'));
        uploadTab.show();
        
        // Show info about using existing file
        this.showAlert('info', `Selected existing file: ${fileName}`);
        
        // You could implement logic here to pre-select this file for analysis
        // For now, just inform the user
        this.showAlert('info', 'Please select a database and job name, then click "Start Analysis with Existing File"');
    }

    getStatusClass(status) {
        switch (status) {
            case 'running': return 'bg-warning text-dark';
            case 'completed': return 'bg-success';
            case 'failed': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'running': return 'fas fa-spinner fa-spin';
            case 'completed': return 'fas fa-check';
            case 'failed': return 'fas fa-times';
            default: return 'fas fa-question';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showAlert(type, message) {
        const alertContainer = document.getElementById('alertContainer');
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';
        
        const alertIcon = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-triangle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        }[type] || 'fas fa-info-circle';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="${alertIcon} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.innerHTML = alertHtml;
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    // Directory Modal Functions
    async openDirectoryModal() {
        const modal = new bootstrap.Modal(document.getElementById('directoryModal'));
        modal.show();
        this.modalBrowsePath(process.env.HOME || '/home');
    }

    async modalBrowsePath(path) {
        try {
            const response = await fetch(`/api/browse-directory?path=${encodeURIComponent(path)}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            
            this.modalCurrentPath = data.currentPath;
            document.getElementById('modalCurrentPath').value = data.currentPath;
            
            const browser = document.getElementById('modalDirectoryBrowser');
            browser.innerHTML = '';
            
            // Add parent directory option if not at root
            if (data.parentPath !== data.currentPath) {
                const parentItem = this.createModalBrowserItem({
                    name: '..',
                    path: data.parentPath,
                    isDirectory: true
                }, true);
                browser.appendChild(parentItem);
            }
            
            // Add only directories
            data.items.filter(item => item.isDirectory).forEach(item => {
                const browserItem = this.createModalBrowserItem(item);
                browser.appendChild(browserItem);
            });
            
        } catch (error) {
            this.showAlert('error', 'Failed to browse directory: ' + error.message);
        }
    }

    createModalBrowserItem(item, isParent = false) {
        const div = document.createElement('div');
        div.className = 'border-bottom p-2 browser-item';
        div.style.cursor = 'pointer';
        
        div.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-folder text-warning me-2"></i>
                <span class="flex-grow-1">${item.name}</span>
            </div>
        `;
        
        div.addEventListener('click', () => {
            this.modalBrowsePath(item.path);
        });
        
        // Hover effect
        div.addEventListener('mouseenter', () => {
            div.style.backgroundColor = '#f8f9fa';
        });
        div.addEventListener('mouseleave', () => {
            div.style.backgroundColor = '';
        });
        
        return div;
    }

    modalNavigateUp() {
        if (this.modalCurrentPath) {
            const parentPath = this.modalCurrentPath.split('/').slice(0, -1).join('/') || '/';
            this.modalBrowsePath(parentPath);
        }
    }

    selectOutputDirectory() {
        document.getElementById('outputPath').value = this.modalCurrentPath;
        const modal = bootstrap.Modal.getInstance(document.getElementById('directoryModal'));
        modal.hide();
        this.showAlert('success', `Selected output directory: ${this.modalCurrentPath}`);
    }

    async startAnalysis() {
        const jobNameInput = document.getElementById('jobName');
        const databaseSelect = document.getElementById('database');
        const analystSelect = document.getElementById('analyst');
        const outputPathInput = document.getElementById('outputPath');
        const startBtn = document.getElementById('startAnalysisBtn');
        
        if (!this.selectedFile) {
            this.showAlert('warning', 'Please select an input file');
            return;
        }
        
        if (!analystSelect.value) {
            this.showAlert('warning', 'Please select an analysis method');
            return;
        }
        
        if (!databaseSelect.value) {
            this.showAlert('warning', 'Please select a database');
            return;
        }
        
        if (!outputPathInput.value.trim()) {
            this.showAlert('warning', 'Please select an output directory where results will be saved');
            return;
        }
        
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Starting Analysis...';
        
        try {
            let fileId;
            
            if (this.selectedFile.type === 'upload') {
                // Upload file first
                const uploadResult = await this.uploadFile();
                if (!uploadResult.success) {
                    throw new Error('File upload failed');
                }
                fileId = uploadResult.file.id;
            } else {
                // Use system file
                fileId = this.selectedFile.fileInfo.id;
            }
            
            // Start analysis
            const analysisData = {
                fileId: fileId,
                database: JSON.parse(databaseSelect.value),
                analyst: analystSelect.value,
                jobName: jobNameInput.value || `Analysis_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
                customOutputPath: outputPathInput.value.trim()
            };
            
            const analysisResponse = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(analysisData)
            });
            
            if (!analysisResponse.ok) {
                let errorData;
                try {
                    errorData = await analysisResponse.json();
                } catch (jsonError) {
                    // If response isn't JSON, get as text
                    const errorText = await analysisResponse.text();
                    throw new Error(`Analysis failed: ${analysisResponse.status} - ${errorText}`);
                }
                throw new Error(errorData.error || 'Analysis failed to start');
            }
            
            const analysisResult = await analysisResponse.json();
            
            this.showAlert('success', `Analysis started successfully! Job ID: ${analysisResult.jobId}. Results will be saved to: ${outputPathInput.value}`);
            
            // Reset form
            this.resetForm();
            
            // Switch to job history tab
            const jobTab = new bootstrap.Tab(document.getElementById('job-history-tab'));
            jobTab.show();
            
        } catch (error) {
            this.showAlert('error', 'Failed to start analysis: ' + error.message);
        } finally {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Analysis';
        }
    }

    async uploadFile() {
        const formData = new FormData();
        formData.append('inputFile', this.selectedFile.file);
        
        const progressContainer = document.getElementById('uploadProgress');
        const progressBar = progressContainer.querySelector('.progress-bar');
        progressContainer.style.display = 'block';
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                let errorText;
                try {
                    const errorData = await response.json();
                    errorText = errorData.error || 'Upload failed';
                } catch (jsonError) {
                    errorText = await response.text() || 'Upload failed';
                }
                throw new Error(errorText);
            }
            
            const result = await response.json();
            progressBar.style.width = '100%';
            
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 1000);
            
            return result;
        } catch (error) {
            progressContainer.style.display = 'none';
            throw error;
        }
    }

    resetForm() {
        // Reset all form elements
        document.getElementById('uploadForm').reset();
        document.getElementById('jobName').value = '';
        document.getElementById('outputPath').value = '';
        document.getElementById('selectedFilePath').value = '';
        document.getElementById('analysisConfig').style.display = 'none';
        
        // Reset selected file
        this.selectedFile = null;
        
        // Reset to upload method
        document.getElementById('uploadMethod').checked = true;
        this.toggleInputMethod('upload');
    }
}

// Global functions for onclick handlers
window.loadUploadHistory = function() {
    app.loadUploadHistory();
};

window.loadJobHistory = function() {
    app.loadJobHistory();
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MetONTIIMEApp();
});
