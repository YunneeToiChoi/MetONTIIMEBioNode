/**
 * MetontiimeAnalyst - Analyst implementation cho MetONTIIME pipeline
 * Kế thừa từ BaseAnalyst và implement các phương thức cần thiết
 */

const BaseAnalyst = require('./BaseAnalyst');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class MetontiimeAnalyst extends BaseAnalyst {
    constructor() {
        super(
            'MetONTIIME',
            'MetONTIIME: Metagenomic ONT amplIcons an Accurate Microbial taxonomic classification in real-TIME',
            '2.0.0'
        );

        // Configuration cứng cho MetONTIIME
        this.config = {
            dockerImageName: 'metontiime-image',
            cardFastaFile: 'nucleotide_fasta_protein_knockout_model.fasta',
            cardTsvFile: 'aro_index.tsv',
            cpuThreads: 8,
            metontiimeSrcHost: '/home/vannang/Documents/BioB/MetONTIIME',
            cardDbHost: path.resolve(__dirname, '../databases/card_db')
        };
    }

    /**
     * Implement phương thức getRequiredInputs từ BaseAnalyst
     * @returns {Array} - Danh sách input bắt buộc
     */
    getRequiredInputs() {
        return [
            {
                name: 'inputFile',
                type: 'file',
                description: 'FASTQ/FASTA input file (có thể nén .gz)',
                extensions: ['.fastq', '.fasta', '.fq', '.fa', '.gz'],
                required: true
            },
            {
                name: 'outputDir',
                type: 'directory',
                description: 'Thư mục lưu kết quả phân tích',
                required: true
            },
            {
                name: 'jobName',
                type: 'string',
                description: 'Tên job (tùy chọn)',
                required: false
            }
        ];
    }

    /**
     * Implement phương thức getSupportedDatabases từ BaseAnalyst
     * @returns {Array} - Danh sách database được hỗ trợ
     */
    getSupportedDatabases() {
        return [
            {
                name: 'CARD Database',
                type: 'antibiotic_resistance',
                description: 'Comprehensive Antibiotic Resistance Database',
                fastaFile: this.config.cardFastaFile,
                tsvFile: this.config.cardTsvFile,
                path: this.config.cardDbHost,
                required: true
            }
        ];
    }

    /**
     * Validate cấu hình MetONTIIME
     * @returns {object} - Kết quả validation
     */
    validateConfiguration() {
        const errors = [];
        
        const requiredPaths = [
            { path: path.join(this.config.cardDbHost, this.config.cardFastaFile), name: 'CARD FASTA file' },
            { path: path.join(this.config.cardDbHost, this.config.cardTsvFile), name: 'CARD TSV file' },
            { path: this.config.metontiimeSrcHost, name: 'MetONTIIME source directory' }
        ];
        
        for (const item of requiredPaths) {
            if (!fs.existsSync(item.path)) {
                errors.push(`Missing ${item.name}: ${item.path}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Implement phương thức analyze từ BaseAnalyst
     * @param {object} params - Tham số phân tích
     * @returns {Promise} - Promise của kết quả phân tích
     */
    async analyze(params) {
        this.log('info', 'Starting MetONTIIME analysis...');
        
        // Validate parameters
        const paramValidation = this.validateParams(params);
        if (!paramValidation.valid) {
            throw new Error(`Invalid parameters: ${paramValidation.errors.join(', ')}`);
        }

        // Validate configuration
        const configValidation = this.validateConfiguration();
        if (!configValidation.valid) {
            throw new Error(`Invalid configuration: ${configValidation.errors.join(', ')}`);
        }

        const { inputFile, outputDir, jobName, jobInfo, fileInfo } = params;
        
        // For backward compatibility, use inputFile or fallback to fileInfo
        const fileData = inputFile || fileInfo;

        try {
            this.log('info', `Input file: ${fileData.path}`);
            this.log('info', `Output directory: ${outputDir}`);
            
            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Determine input path for Docker
            let inputPath;
            if (fileData.isSystemFile) {
                inputPath = path.dirname(fileData.path);
            } else {
                inputPath = path.dirname(fileData.path);
            }

            // Build Docker command
            const dockerCommand = this.buildDockerCommand(inputPath, outputDir);
            
            this.log('info', 'Executing Docker command...');
            this.log('info', `Command: ${dockerCommand}`);
            
            // Execute Docker command
            execSync(dockerCommand, { stdio: 'inherit' });
            
            // Check results
            const resultFiles = fs.readdirSync(outputDir);
            
            this.log('info', 'Analysis completed successfully!');
            if (resultFiles.length > 0) {
                this.log('info', `Generated ${resultFiles.length} result files`);
                resultFiles.forEach(file => this.log('info', `- ${file}`));
            } else {
                this.log('warn', 'Analysis completed but no result files were generated');
            }
            
            return {
                success: true,
                message: 'MetONTIIME analysis completed successfully',
                resultFiles: resultFiles,
                outputDirectory: outputDir
            };
            
        } catch (error) {
            this.log('error', `Analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Build Docker command cho MetONTIIME
     * @param {string} inputPath - Đường dẫn input
     * @param {string} outputDir - Thư mục output
     * @returns {string} - Docker command
     */
    buildDockerCommand(inputPath, outputDir) {
        return `docker run --rm \
            -v "${inputPath}":/app/input \
            -v "${outputDir}":/app/output \
            -v "${this.config.cardDbHost}":/app/databases/card \
            -v "${this.config.metontiimeSrcHost}":/app/src \
            -v "/var/run/docker.sock":"/var/run/docker.sock" \
            ${this.config.dockerImageName} \
            nextflow run /app/src/metontiime2.nf -profile docker \
                --workDir /app/input \
                --resultsDir /app/output \
                --dbSequencesFasta "/app/databases/card/${this.config.cardFastaFile}" \
                --dbTaxonomyTsv "/app/databases/card/${this.config.cardTsvFile}" \
                --threads ${this.config.cpuThreads}`.replace(/\n/g, ' ');
    }

    /**
     * Lấy thông tin cấu hình hiện tại
     * @returns {object} - Cấu hình hiện tại
     */
    getConfiguration() {
        return { ...this.config };
    }

    /**
     * Cập nhật cấu hình
     * @param {object} newConfig - Cấu hình mới
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('info', 'Configuration updated');
    }
}

module.exports = MetontiimeAnalyst;
