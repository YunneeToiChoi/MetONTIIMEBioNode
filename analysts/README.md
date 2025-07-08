# Analyst Factory System

Hệ thống Factory Pattern cho việc quản lý các loại analyst khác nhau trong MetONTIIME Web Interface.

## Cấu trúc

```
analysts/
├── AnalystFactory.js      # Factory chính để quản lý analysts
├── BaseAnalyst.js         # Abstract base class cho tất cả analysts
├── MetontiimeAnalyst.js   # Implementation cho MetONTIIME
├── ExampleAnalyst.js      # Example analyst (demo/template)
└── README.md             # File này
```

## Kiến trúc

### AnalystFactory

- Sử dụng HashMap (Map) để lưu trữ và quản lý các analyst
- Cung cấp interface thống nhất để đăng ký, truy xuất và chạy analysts
- Hỗ trợ động việc thêm analyst mới

### BaseAnalyst

- Abstract base class định nghĩa interface chung
- Các phương thức bắt buộc:
  - `analyze(params)`: Thực hiện phân tích
  - `getRequiredInputs()`: Trả về danh sách input cần thiết
  - `getSupportedDatabases()`: Trả về database được hỗ trợ
- Cung cấp utility methods cho logging và validation

### MetontiimeAnalyst

- Implementation cụ thể cho MetONTIIME pipeline
- Quản lý cấu hình Docker và Nextflow
- Hỗ trợ CARD database

## Cách sử dụng

### 1. Lấy danh sách analysts có sẵn

```bash
GET /api/analysts
```

### 2. Lấy thông tin chi tiết của một analyst

```bash
GET /api/analysts/:name
```

### 3. Lấy databases cho analyst cụ thể

```bash
GET /api/databases?analyst=metontiime
```

### 4. Chạy phân tích với analyst

```bash
POST /api/analyze
{
  "fileId": "file-id",
  "database": "CARD Database",
  "analyst": "metontiime",
  "jobName": "My Analysis",
  "customOutputPath": "/path/to/output"
}
```

## Thêm Analyst Mới

### Bước 1: Tạo class mới kế thừa BaseAnalyst

```javascript
const BaseAnalyst = require("./BaseAnalyst");

class MyNewAnalyst extends BaseAnalyst {
  constructor() {
    super("MyAnalyst", "Description", "1.0.0");
  }

  getRequiredInputs() {
    return [
      {
        name: "inputFile",
        type: "file",
        description: "Input file description",
        extensions: [".ext"],
        required: true,
      },
    ];
  }

  getSupportedDatabases() {
    return [
      {
        name: "My Database",
        type: "custom",
        description: "Custom database",
        required: true,
      },
    ];
  }

  async analyze(params) {
    // Implementation
    return {
      success: true,
      message: "Analysis completed",
      resultFiles: [],
      outputDirectory: params.outputDir,
    };
  }
}

module.exports = MyNewAnalyst;
```

### Bước 2: Đăng ký trong AnalystFactory

```javascript
// Trong AnalystFactory.js, thêm vào initializeAnalysts():
const MyNewAnalyst = require("./MyNewAnalyst");
this.registerAnalyst("mynew", new MyNewAnalyst());
```

## API Endpoints Mới

### GET /api/analysts

Trả về danh sách tất cả analyst có sẵn với thông tin chi tiết

### GET /api/analysts/:name

Trả về thông tin chi tiết của analyst cụ thể

### GET /api/databases?analyst=name

Trả về database được hỗ trợ bởi analyst cụ thể

### POST /api/analyze (updated)

Bây giờ yêu cầu thêm field `analyst` để chỉ định analyst sử dụng

## Lợi ích

1. **Mở rộng dễ dàng**: Thêm analyst mới chỉ cần tạo class và đăng ký
2. **Tách biệt logic**: Mỗi analyst có logic riêng biệt
3. **Interface thống nhất**: Tất cả analyst đều follow cùng interface
4. **Quản lý tập trung**: Factory pattern giúp quản lý tất cả analyst ở một nơi
5. **Type safety**: Validation tự động cho parameters và configuration
6. **Logging chuẩn**: Mỗi analyst có logging riêng với format thống nhất

## Backward Compatibility

Hệ thống được thiết kế để tương thích ngược với API cũ:

- `/api/databases` vẫn hoạt động như trước (mặc định trả về tất cả databases)
- `/api/analyze` vẫn hoạt động với MetONTIIME nếu không chỉ định analyst

## Example Analyst

File `ExampleAnalyst.js` cung cấp một template đơn giản cho việc tạo analyst mới. Nó thực hiện các phân tích cơ bản trên text files như đếm từ, đếm dòng, v.v.
