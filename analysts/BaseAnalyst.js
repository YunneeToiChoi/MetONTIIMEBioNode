/**
 * BaseAnalyst - Abstract base class cho tất cả các analyst
 * Định nghĩa interface chung mà các analyst cần implement
 */

class BaseAnalyst {
    constructor(name, description, version = '1.0.0') {
        this.name = name;
        this.description = description;
        this.version = version;
    }

    /**
     * Phương thức analyze - PHẢI được override bởi subclass
     * @param {object} params - Tham số phân tích
     * @returns {Promise} - Promise của kết quả phân tích
     */
    async analyze(params) {
        throw new Error('analyze() method must be implemented by subclass');
    }

    /**
     * Lấy danh sách input bắt buộc - PHẢI được override bởi subclass
     * @returns {Array} - Danh sách các input cần thiết
     */
    getRequiredInputs() {
        throw new Error('getRequiredInputs() method must be implemented by subclass');
    }

    /**
     * Lấy danh sách database được hỗ trợ - PHẢI được override bởi subclass
     * @returns {Array} - Danh sách database được hỗ trợ
     */
    getSupportedDatabases() {
        throw new Error('getSupportedDatabases() method must be implemented by subclass');
    }

    /**
     * Validate input parameters
     * @param {object} params - Tham số cần validate
     * @returns {object} - Kết quả validation { valid: boolean, errors: Array }
     */
    validateParams(params) {
        const errors = [];
        const requiredInputs = this.getRequiredInputs();

        for (const input of requiredInputs) {
            if (!params[input.name]) {
                errors.push(`Missing required input: ${input.name}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Lấy thông tin chi tiết về analyst
     * @returns {object} - Thông tin analyst
     */
    getInfo() {
        return {
            name: this.name,
            description: this.description,
            version: this.version,
            requiredInputs: this.getRequiredInputs(),
            supportedDatabases: this.getSupportedDatabases()
        };
    }

    /**
     * Log message với prefix của analyst
     * @param {string} level - Log level (info, warn, error)
     * @param {string} message - Message to log
     */
    log(level, message) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.name.toUpperCase()}]`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ⚠️ ${message}`);
                break;
            case 'info':
            default:
                console.log(`${prefix} ℹ️ ${message}`);
                break;
        }
    }
}

module.exports = BaseAnalyst;
