const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ======================= CẤU HÌNH =======================

const DOCKER_IMAGE_NAME = 'metontiime-image';
const INPUT_FILE = 'Zymo-GridION-EVEN-BB-SN_sup_pass_filtered_27F_1492Rw_1000_reads.fastq.gz';
const CARD_FASTA_FILE = 'nucleotide_fasta_protein_knockout_model.fasta';
const CARD_TSV_FILE = 'aro_index.tsv';
const CPU_THREADS = 8;

const inputDirHost = path.resolve(__dirname, 'input_data');
const outputDirHost = path.resolve(__dirname, 'output_results');
const cardDbHost = path.resolve(__dirname, 'databases/card_db');
const metontiimeSrcHost = '/home/vannang/Documents/BioB/MetONTIIME';

// ======================= KẾT THÚC CẤU HÌNH =======================


// --- Phần logic thực thi ---

console.log('Bắt đầu kiểm tra cấu hình...');

const requiredPaths = [
    { path: path.join(inputDirHost, INPUT_FILE), name: 'File input' },
    { path: path.join(cardDbHost, CARD_FASTA_FILE), name: 'File CARD FASTA' },
    { path: path.join(cardDbHost, CARD_TSV_FILE), name: 'File CARD TSV' },
    { path: metontiimeSrcHost, name: 'Thư mục mã nguồn MetONTIIME' }
];

for (const item of requiredPaths) {
    if (!fs.existsSync(item.path)) {
        console.error(`❌ Lỗi: Không tìm thấy ${item.name} tại: ${item.path}`);
        process.exit(1);
    }
}

console.log('✅ Cấu hình hợp lệ. Bắt đầu xây dựng lệnh Docker...');

// ---> LỆNH DOCKER ĐÃ ĐƯỢC SỬA LẠI HOÀN TOÀN DỰA TRÊN TÀI LIỆU <---
const dockerCommand = `
docker run --rm \
    -v "${inputDirHost}":/app/input \
    -v "${outputDirHost}":/app/output \
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
console.log(`\nLệnh được thực thi:\n${dockerCommand}\n`);

try {
    execSync(dockerCommand, { stdio: 'inherit' });
    
    console.log('\n✅ Phân tích hoàn tất!');

    const resultFiles = fs.readdirSync(outputDirHost);
    if (resultFiles.length > 0) {
        console.log('\n--- 📄 Các file kết quả đã được tạo ---');
        resultFiles.forEach(file => console.log(`- ${file}`));
    } else {
        console.warn('⚠️ Phân tích chạy xong nhưng không tạo ra file kết quả nào.');
    }

} catch (error) {
    console.error('\n❌ Đã xảy ra lỗi nghiêm trọng trong quá trình chạy Docker.');
    console.error('Vui lòng xem lại log lỗi ở trên để xác định nguyên nhân.');
}

// LEGACY SCRIPT - REPLACED WITH WEB INTERFACE
// This script has been replaced with a modern web interface
// Run: npm install && npm start
// Then open: http://localhost:3000

// Web interface features implemented:
// ✅ User-friendly upload interface  
// ✅ Database selection from local databases
// ✅ File upload with progress tracking
// ✅ Upload history with file management
// ✅ Job history with status tracking
// ✅ Results download functionality
// ✅ Modern responsive UI with Bootstrap