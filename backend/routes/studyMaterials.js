const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const StudyMaterial = require('../models/StudyMaterial');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/study-materials';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Get all study materials
router.get('/', async (req, res) => {
    try {
        const { class: classFilter, subject } = req.query;
        const query = {};
        
        if (classFilter) query.class = classFilter;
        if (subject) query.subject = subject;
        
        const materials = await StudyMaterial.find(query)
            .sort({ uploadDate: -1 })
            .populate('uploadedBy', 'name email');
            
        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching study materials', error: error.message });
    }
});

// Get study material by ID
router.get('/:id', async (req, res) => {
    try {
        const material = await StudyMaterial.findById(req.params.id)
            .populate('uploadedBy', 'name email');
            
        if (!material) {
            return res.status(404).json({ message: 'Study material not found' });
        }
        
        res.json(material);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching study material', error: error.message });
    }
});

// Upload new study material
router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const material = new StudyMaterial({
            class: req.body.class,
            subject: req.body.subject,
            unit: req.body.unit,
            topic: req.body.topic,
            description: req.body.description,
            fileUrl: `/uploads/study-materials/${req.file.filename}`,
            fileName: req.file.originalname,
            fileType: path.extname(req.file.originalname).toLowerCase(),
            uploadedBy: req.user._id
        });

        await material.save();
        res.status(201).json(material);
    } catch (error) {
        // Delete uploaded file if there's an error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Error uploading study material', error: error.message });
    }
});

// Delete study material
router.delete('/:id', auth, async (req, res) => {
    try {
        const material = await StudyMaterial.findById(req.params.id);
        
        if (!material) {
            return res.status(404).json({ message: 'Study material not found' });
        }
        
        // Delete the file
        const filePath = path.join(__dirname, '..', material.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        await material.remove();
        res.json({ message: 'Study material deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting study material', error: error.message });
    }
});

module.exports = router; 