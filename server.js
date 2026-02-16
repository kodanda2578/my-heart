const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'content.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Multer Setup for Image Uploads
const multer = require('multer');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// API: Upload Image
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
});

// API: Upload Audio
app.post('/api/upload-audio', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
});

// Helper to read data
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        return {};
    }
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
};

// Helper to write data
const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// API: Get Content
app.get('/api/content', (req, res) => {
    const data = readData();
    res.json(data);
});

// API: Update Content
app.post('/api/content', (req, res) => {
    const newData = req.body;
    writeData(newData);
    res.json({ message: 'Content updated successfully!', data: newData });
});

// Serve Admin Page (Optional specific route, though static serves it too)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start Server
app.listen(PORT, () => {
    // Colors for terminal
    const cyan = '\x1b[36m';
    const green = '\x1b[32m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const blue = '\x1b[34m';

    console.clear();
    console.log(`\n  ${green}${bold}LOVE STORY SERVER${reset}  ${green}v1.0.0${reset}\n`);
    console.log(`  ${green}➜${reset}  ${bold}Local:${reset}   ${cyan}http://localhost:${PORT}/${reset}`);
    console.log(`  ${green}➜${reset}  ${bold}Admin:${reset}   ${blue}http://localhost:${PORT}/admin${reset}\n`);

    // Auto-open browser
    const { exec } = require('child_process');
    exec(`start http://localhost:${PORT}/admin`);
});
