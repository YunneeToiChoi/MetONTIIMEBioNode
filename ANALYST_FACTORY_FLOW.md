# Luồng hoạt động từ Giao diện Web đến Analyst Factory

## Sơ đồ tổng quan

```
[Web Interface] → [Server.js] → [AnalystFactory] → [Specific Analyst] → [Analysis Result]
     ↓              ↓              ↓                    ↓                   ↓
  index.html    Express API     HashMap Storage    MetontiimeAnalyst    Docker Pipeline
   app.js       REST endpoints   Analyst instances  ExampleAnalyst       Result files
```

## Chi tiết từng bước:

### 1. 🌐 Web Interface (Frontend)

**Files**: `public/index.html`, `public/app.js`

#### Khởi tạo:

```javascript
// app.js - Constructor
constructor() {
    this.selectedFile = null;
    this.loadAnalysts();        // ← Gọi API để load analysts
    this.loadDatabases();
    this.setupEventListeners();
}
```

#### Load danh sách Analysts:

```javascript
// app.js - Gọi API để lấy danh sách analysts
async loadAnalysts() {
    const response = await fetch('/api/analysts');  // ← API call
    const data = await response.json();

    // Populate analyst dropdown
    data.analysts.forEach(analyst => {
        const option = document.createElement('option');
        option.value = analyst.name;
        option.textContent = `${analyst.displayName} - ${analyst.description}`;
        select.appendChild(option);
    });
}
```

#### Khi user chọn analyst:

```javascript
// app.js - Load databases theo analyst được chọn
document.getElementById("analyst").addEventListener("change", (e) => {
  this.loadDatabasesForAnalyst(e.target.value); // ← Load DB cho analyst
});
```

#### Khi user bấm "Start Analysis":

```javascript
// app.js - Gửi request phân tích
async startAnalysis() {
    const analysisData = {
        fileId: fileId,
        database: JSON.parse(databaseSelect.value),
        analyst: analystSelect.value,           // ← Analyst được chọn
        jobName: jobNameInput.value,
        customOutputPath: outputPathInput.value
    };

    // POST request đến server
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)      // ← Gửi data
    });
}
```

### 2. 🖥️ Server Layer (Backend)

**File**: `server.js`

#### Khởi tạo AnalystFactory:

```javascript
// server.js - Khởi tạo factory
const AnalystFactory = require("./analysts/AnalystFactory");
const app = express();

// Initialize AnalystFactory
const analystFactory = new AnalystFactory(); // ← Tạo factory instance
```

#### API endpoint `/api/analysts`:

```javascript
// server.js - Trả về danh sách analysts
app.get("/api/analysts", (req, res) => {
  const analystsInfo = analystFactory.getAllAnalystsInfo(); // ← Từ factory
  res.json({ analysts: analystsInfo });
});
```

#### API endpoint `/api/databases`:

```javascript
// server.js - Trả về databases theo analyst
app.get("/api/databases", (req, res) => {
  const { analyst } = req.query;

  if (analyst) {
    const analystInfo = analystFactory.getAnalystInfo(analyst); // ← Từ factory
    res.json({ databases: analystInfo.supportedDatabases });
  }
});
```

#### API endpoint `/api/analyze` (Chính):

```javascript
// server.js - Xử lý request phân tích
app.post("/api/analyze", (req, res) => {
  const { fileId, database, jobName, customOutputPath, analyst } = req.body;

  // Validation
  if (!analystFactory.hasAnalyst(analyst)) {
    // ← Kiểm tra analyst
    return res.status(400).json({
      error: `Analyst ${analyst} không được hỗ trợ`,
    });
  }

  // Chạy analysis trong background
  setTimeout(() => {
    runAnalysisWithFactory(fileInfo, database, jobInfo, analyst); // ← Gọi factory
  }, 100);
});
```

#### Hàm chạy analysis:

```javascript
// server.js - Chạy analysis qua factory
async function runAnalysisWithFactory(
  fileInfo,
  database,
  jobInfo,
  analystName
) {
  try {
    const analysisParams = {
      inputFile: fileInfo,
      outputDir: jobInfo.outputDir,
      jobName: jobInfo.name,
      database: database,
    };

    // Gọi factory để chạy analysis
    const result = await analystFactory.runAnalysis(
      analystName,
      analysisParams
    ); // ← Chính

    if (result.success) {
      updateJobStatus(jobInfo.id, "completed", "Analysis completed");
    }
  } catch (error) {
    updateJobStatus(jobInfo.id, "failed", error.message);
  }
}
```

### 3. 🏭 AnalystFactory (Core Factory)

**File**: `analysts/AnalystFactory.js`

#### Khởi tạo và đăng ký analysts:

```javascript
// AnalystFactory.js - Constructor
constructor() {
    this.analysts = new Map();  // ← HashMap storage
    this.initializeAnalysts();
}

initializeAnalysts() {
    const MetontiimeAnalyst = require('./MetontiimeAnalyst');

    // Đăng ký analysts vào HashMap
    this.registerAnalyst('metontiime', new MetontiimeAnalyst());  // ← Đăng ký

    // Có thể đăng ký thêm analysts khác
    try {
        const ExampleAnalyst = require('./ExampleAnalyst');
        this.registerAnalyst('example', new ExampleAnalyst());
    } catch (error) {
        // Optional analyst
    }
}
```

#### Phương thức chính - runAnalysis:

```javascript
// AnalystFactory.js - Chạy analysis
async runAnalysis(analystName, params) {
    const analyst = this.getAnalyst(analystName);  // ← Lấy từ HashMap
    if (!analyst) {
        throw new Error(`Analyst ${analystName} not found`);
    }

    console.log(`🔬 Running analysis with ${analystName} analyst...`);
    return await analyst.analyze(params);  // ← Gọi analyze() của analyst
}

getAnalyst(name) {
    return this.analysts.get(name.toLowerCase()) || null;  // ← HashMap lookup
}
```

### 4. 🧬 Specific Analyst (Implementation)

**File**: `analysts/MetontiimeAnalyst.js`

#### Implementation cụ thể:

```javascript
// MetontiimeAnalyst.js - Implement BaseAnalyst
class MetontiimeAnalyst extends BaseAnalyst {
  constructor() {
    super();
    this.name = "metontiime";
    this.description = "MetONTIIME taxonomic classification pipeline";
  }

  // Phương thức chính được gọi từ factory
  async analyze(params) {
    const { inputFile, outputDir, jobName, database } = params;

    // Tạo Docker command
    const dockerCommand = this.buildDockerCommand(
      inputFile,
      outputDir,
      database
    );

    // Chạy Docker container
    const result = await this.runDockerCommand(dockerCommand);

    return {
      success: result.success,
      message: result.message,
      resultFiles: result.files,
    };
  }
}
```

## Luồng dữ liệu chi tiết:

### 🔄 Request Flow:

1. **User Action**: Click "Start Analysis" button
2. **Frontend**: `app.js` gửi POST `/api/analyze`
3. **Server**: `server.js` nhận request
4. **Validation**: Kiểm tra analyst có tồn tại
5. **Factory Call**: `analystFactory.runAnalysis(analystName, params)`
6. **HashMap Lookup**: Factory tìm analyst trong Map
7. **Analyst Execution**: Gọi `analyst.analyze(params)`
8. **Docker Run**: Analyst chạy Docker container
9. **Result Return**: Kết quả trả về qua các layers

### 🗂️ Data Structure Flow:

```javascript
// Frontend data
{
    analyst: "metontiime",
    database: {...},
    fileId: "uuid",
    outputPath: "/path"
}
    ↓
// Server processing
{
    inputFile: fileInfo,
    outputDir: outputPath,
    jobName: name,
    database: dbConfig
}
    ↓
// Analyst execution
Docker container → Analysis pipeline → Result files
```

### 🔧 Factory Pattern Benefits:

1. **Extensibility**: Dễ thêm analysts mới
2. **Isolation**: Mỗi analyst độc lập
3. **Consistency**: Interface thống nhất
4. **Management**: Quản lý tập trung
5. **Discovery**: Tự động phát hiện analysts

Luồng này cho phép hệ thống linh hoạt hỗ trợ nhiều công cụ phân tích khác nhau thông qua một interface thống nhất!
