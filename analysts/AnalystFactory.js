/**
 * AnalystFactory - Factory pattern để quản lý các loại analyst khác nhau
 * Sử dụng HashMap để lưu trữ và truy xuất các analyst
 */

class AnalystFactory {
    constructor() {
        // HashMap để lưu trữ các analyst
        this.analysts = new Map();
        this.initializeAnalysts();
    }

    /**
     * Khởi tạo các analyst có sẵn
     */
    initializeAnalysts() {
        const MetontiimeAnalyst = require('./MetontiimeAnalyst');
        
        // Đăng ký MetONTIIME analyst (primary)
        this.registerAnalyst('metontiime', new MetontiimeAnalyst());
        
        // Đăng ký Example analyst (optional - for demo/development)
        try {
            const ExampleAnalyst = require('./ExampleAnalyst');
            this.registerAnalyst('example', new ExampleAnalyst());
            console.log('📊 Example analyst registered (demo mode)');
        } catch (error) {
            console.log('ℹ️ Example analyst not available (production mode)');
        }
        
        console.log('✅ AnalystFactory initialized with analysts:', Array.from(this.analysts.keys()));
    }

    /**
     * Đăng ký một analyst mới
     * @param {string} name - Tên của analyst
     * @param {object} analyst - Instance của analyst
     */
    registerAnalyst(name, analyst) {
        if (!analyst.analyze || typeof analyst.analyze !== 'function') {
            throw new Error(`Analyst ${name} must implement analyze() method`);
        }
        
        if (!analyst.getRequiredInputs || typeof analyst.getRequiredInputs !== 'function') {
            throw new Error(`Analyst ${name} must implement getRequiredInputs() method`);
        }

        if (!analyst.getSupportedDatabases || typeof analyst.getSupportedDatabases !== 'function') {
            throw new Error(`Analyst ${name} must implement getSupportedDatabases() method`);
        }

        this.analysts.set(name.toLowerCase(), analyst);
        console.log(`📊 Registered analyst: ${name}`);
    }

    /**
     * Lấy analyst theo tên
     * @param {string} name - Tên analyst
     * @returns {object|null} - Instance của analyst hoặc null nếu không tìm thấy
     */
    getAnalyst(name) {
        return this.analysts.get(name.toLowerCase()) || null;
    }

    /**
     * Lấy danh sách tất cả analyst có sẵn
     * @returns {Array} - Danh sách tên các analyst
     */
    getAvailableAnalysts() {
        return Array.from(this.analysts.keys());
    }

    /**
     * Kiểm tra xem analyst có tồn tại không
     * @param {string} name - Tên analyst
     * @returns {boolean}
     */
    hasAnalyst(name) {
        return this.analysts.has(name.toLowerCase());
    }

    /**
     * Lấy thông tin chi tiết về analyst
     * @param {string} name - Tên analyst
     * @returns {object|null} - Thông tin analyst
     */
    getAnalystInfo(name) {
        const analyst = this.getAnalyst(name);
        if (!analyst) return null;

        return {
            name: name,
            description: analyst.description || 'No description available',
            requiredInputs: analyst.getRequiredInputs(),
            supportedDatabases: analyst.getSupportedDatabases(),
            version: analyst.version || '1.0.0'
        };
    }

    /**
     * Lấy thông tin tất cả analyst
     * @returns {Array} - Danh sách thông tin các analyst
     */
    getAllAnalystsInfo() {
        const analystsInfo = [];
        
        for (const [name, analyst] of this.analysts) {
            analystsInfo.push({
                name: name,
                description: analyst.description || 'No description available',
                requiredInputs: analyst.getRequiredInputs(),
                supportedDatabases: analyst.getSupportedDatabases(),
                version: analyst.version || '1.0.0'
            });
        }
        
        return analystsInfo;
    }

    /**
     * Chạy phân tích với analyst được chỉ định
     * @param {string} analystName - Tên analyst
     * @param {object} params - Tham số cho phân tích
     * @returns {Promise} - Promise của kết quả phân tích
     */
    async runAnalysis(analystName, params) {
        const analyst = this.getAnalyst(analystName);
        if (!analyst) {
            throw new Error(`Analyst ${analystName} not found`);
        }

        console.log(`🔬 Running analysis with ${analystName} analyst...`);
        return await analyst.analyze(params);
    }
}

module.exports = AnalystFactory;
