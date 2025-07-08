/**
 * ExampleAnalyst - Một analyst ví dụ để demo việc mở rộng hệ thống
 * Có thể sử dụng làm template cho các analyst mới
 */

const BaseAnalyst = require('./BaseAnalyst');
const fs = require('fs');
const path = require('path');

class ExampleAnalyst extends BaseAnalyst {
    constructor() {
        super(
            'Example',
            'Example Analyst for demonstration purposes - Template for new analysts',
            '1.0.0'
        );

        this.config = {
            // Cấu hình cho analyst này
            supportedFormats: ['.txt', '.csv', '.json'],
            outputFormat: 'json'
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
                description: 'Text, CSV hoặc JSON input file',
                extensions: ['.txt', '.csv', '.json'],
                required: true
            },
            {
                name: 'outputDir',
                type: 'directory',
                description: 'Thư mục lưu kết quả phân tích',
                required: true
            },
            {
                name: 'analysisType',
                type: 'string',
                description: 'Loại phân tích (word_count, line_count, size_analysis)',
                required: true,
                options: ['word_count', 'line_count', 'size_analysis']
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
                name: 'Built-in Dictionary',
                type: 'text_analysis',
                description: 'Built-in dictionary for text analysis',
                required: false
            }
        ];
    }

    /**
     * Implement phương thức analyze từ BaseAnalyst
     * @param {object} params - Tham số phân tích
     * @returns {Promise} - Promise của kết quả phân tích
     */
    async analyze(params) {
        this.log('info', 'Starting Example analysis...');
        
        // Validate parameters
        const paramValidation = this.validateParams(params);
        if (!paramValidation.valid) {
            throw new Error(`Invalid parameters: ${paramValidation.errors.join(', ')}`);
        }

        const { fileInfo, outputDir, analysisType } = params;

        try {
            this.log('info', `Input file: ${fileInfo.path}`);
            this.log('info', `Output directory: ${outputDir}`);
            this.log('info', `Analysis type: ${analysisType || 'word_count'}`);
            
            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Read input file
            const inputContent = fs.readFileSync(fileInfo.path, 'utf8');
            
            // Perform analysis based on type
            const analysisResult = this.performAnalysis(inputContent, analysisType || 'word_count');
            
            // Write results
            const resultFile = path.join(outputDir, 'example_analysis_result.json');
            const output = {
                analyst: this.name,
                version: this.version,
                inputFile: fileInfo.originalName,
                analysisType: analysisType || 'word_count',
                timestamp: new Date().toISOString(),
                results: analysisResult
            };
            
            fs.writeFileSync(resultFile, JSON.stringify(output, null, 2));
            
            this.log('info', 'Analysis completed successfully!');
            this.log('info', `Result saved to: ${resultFile}`);
            
            return {
                success: true,
                message: 'Example analysis completed successfully',
                resultFiles: ['example_analysis_result.json'],
                outputDirectory: outputDir,
                analysisResult: analysisResult
            };
            
        } catch (error) {
            this.log('error', `Analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Thực hiện phân tích dựa trên loại
     * @param {string} content - Nội dung file
     * @param {string} type - Loại phân tích
     * @returns {object} - Kết quả phân tích
     */
    performAnalysis(content, type) {
        switch (type) {
            case 'word_count':
                const words = content.trim().split(/\s+/);
                return {
                    totalWords: words.length,
                    uniqueWords: new Set(words.map(w => w.toLowerCase())).size,
                    averageWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length
                };
                
            case 'line_count':
                const lines = content.split('\n');
                return {
                    totalLines: lines.length,
                    nonEmptyLines: lines.filter(line => line.trim().length > 0).length,
                    averageLineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length
                };
                
            case 'size_analysis':
                return {
                    totalCharacters: content.length,
                    totalCharactersNoSpaces: content.replace(/\s/g, '').length,
                    totalBytes: Buffer.byteLength(content, 'utf8'),
                    encoding: 'utf8'
                };
                
            default:
                throw new Error(`Unknown analysis type: ${type}`);
        }
    }

    /**
     * Lấy thông tin cấu hình hiện tại
     * @returns {object} - Cấu hình hiện tại
     */
    getConfiguration() {
        return { ...this.config };
    }
}

module.exports = ExampleAnalyst;
