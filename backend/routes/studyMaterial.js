const express = require('express');
const router = express.Router();
const StudyMaterial = require('../models/StudyMaterial');
const { auth, adminAuth } = require('../middleware/auth');

// Upload study material (admin only)
router.post('/', adminAuth, async (req, res) => {
    try {
        const {
            title,
            description,
            fileUrl,
            fileType,
            subject,
            chapter,
            class: classLevel,
            examType
        } = req.body;

        const newMaterial = new StudyMaterial({
            title,
            description,
            fileUrl,
            fileType,
            subject,
            chapter,
            class: classLevel,
            examType,
            uploadedBy: req.user._id
        });

        await newMaterial.save();

        res.status(201).json({
            message: 'Study material uploaded successfully',
            material: newMaterial
        });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading study material', error: error.message });
    }
});

// Get study materials with filters
router.get('/', auth, async (req, res) => {
    try {
        const {
            subject,
            examType,
            class: classLevel,
            chapter,
            fileType,
            limit = 10,
            skip = 0
        } = req.query;

        const query = { isActive: true };

        if (subject) query.subject = subject;
        if (examType) query.examType = examType;
        if (classLevel) query.class = classLevel;
        if (chapter) query.chapter = chapter;
        if (fileType) query.fileType = fileType;

        const materials = await StudyMaterial.find(query)
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await StudyMaterial.countDocuments(query);

        res.json({
            materials,
            total,
            hasMore: total > (parseInt(skip) + materials.length)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching study materials', error: error.message });
    }
});

// Get study material by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const material = await StudyMaterial.findById(req.params.id)
            .populate('uploadedBy', 'name');

        if (!material) {
            return res.status(404).json({ message: 'Study material not found' });
        }

        res.json(material);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching study material', error: error.message });
    }
});

// Update study material (admin only)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const {
            title,
            description,
            fileUrl,
            fileType,
            subject,
            chapter,
            class: classLevel,
            examType,
            isActive
        } = req.body;

        const updatedMaterial = await StudyMaterial.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description,
                fileUrl,
                fileType,
                subject,
                chapter,
                class: classLevel,
                examType,
                isActive
            },
            { new: true }
        );

        if (!updatedMaterial) {
            return res.status(404).json({ message: 'Study material not found' });
        }

        res.json({
            message: 'Study material updated successfully',
            material: updatedMaterial
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating study material', error: error.message });
    }
});

// Delete study material (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const material = await StudyMaterial.findByIdAndDelete(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Study material not found' });
        }

        res.json({ message: 'Study material deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting study material', error: error.message });
    }
});

// Get study material statistics (admin only)
router.get('/stats/overview', adminAuth, async (req, res) => {
    try {
        const stats = await StudyMaterial.aggregate([
            {
                $group: {
                    _id: {
                        subject: '$subject',
                        examType: '$examType',
                        fileType: '$fileType'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.subject',
                    examTypes: {
                        $push: {
                            examType: '$_id.examType',
                            fileTypes: {
                                $push: {
                                    fileType: '$_id.fileType',
                                    count: '$count'
                                }
                            }
                        }
                    }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching study material statistics', error: error.message });
    }
});

module.exports = router; 