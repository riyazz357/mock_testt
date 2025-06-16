const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const Question = require('../models/Question');
const { auth, adminAuth } = require('../middleware/auth');

// Create new test (admin only)
router.post('/', adminAuth, async (req, res) => {
    try {
        const {
            title,
            description,
            duration,
            totalMarks,
            passingMarks,
            subject,
            examType,
            instructions,
            numberOfQuestions,
            isActive
        } = req.body;

        const newTest = new Test({
            title,
            description,
            duration,
            totalMarks,
            passingMarks,
            subject,
            examType,
            instructions,
            numberOfQuestions: numberOfQuestions || 10,
            isActive,
            createdBy: req.user._id
        });

        await newTest.save();

        res.status(201).json({
            message: 'Test created successfully',
            test: newTest
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating test', error: error.message });
    }
});

// Get all tests with filters
router.get('/', auth, async (req, res) => {
    try {
        const {
            subject,
            examType,
            isActive,
            limit = 10,
            skip = 0
        } = req.query;

        const query = {};

        if (subject) query.subject = subject;
        if (examType) query.examType = examType;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const tests = await Test.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await Test.countDocuments(query);

        res.json({
            tests,
            total,
            hasMore: total > (parseInt(skip) + tests.length)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tests', error: error.message });
    }
});

// Get test by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        res.json(test);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching test', error: error.message });
    }
});

// Update test (admin only)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const {
            title,
            description,
            duration,
            totalMarks,
            passingMarks,
            subject,
            examType,
            instructions,
            isActive
        } = req.body;

        const updatedTest = await Test.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description,
                duration,
                totalMarks,
                passingMarks,
                subject,
                examType,
                instructions,
                isActive
            },
            { new: true }
        );

        if (!updatedTest) {
            return res.status(404).json({ message: 'Test not found' });
        }

        res.json({
            message: 'Test updated successfully',
            test: updatedTest
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating test', error: error.message });
    }
});

// Delete test (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const test = await Test.findByIdAndDelete(req.params.id);

        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        res.json({ message: 'Test deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting test', error: error.message });
    }
});

// Get test questions
router.get('/:id/questions', auth, async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        // Get random questions based on subject and exam type
        const questions = await Question.aggregate([
            {
                $match: {
                    subject: test.subject,
                    examType: test.examType
                }
            },
            {
                $sample: { size: test.numberOfQuestions } // Get random questions based on test configuration
            },
            {
                $project: {
                    correctAnswer: 0 // Exclude correct answer from response
                }
            }
        ]);

        if (questions.length === 0) {
            return res.status(404).json({ message: 'No questions found for this test' });
        }

        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching test questions', error: error.message });
    }
});

// Get test statistics (admin only)
router.get('/stats/overview', adminAuth, async (req, res) => {
    try {
        const stats = await Test.aggregate([
            {
                $group: {
                    _id: {
                        subject: '$subject',
                        examType: '$examType'
                    },
                    count: { $sum: 1 },
                    totalMarks: { $sum: '$totalMarks' },
                    avgDuration: { $avg: '$duration' }
                }
            },
            {
                $group: {
                    _id: '$_id.subject',
                    examTypes: {
                        $push: {
                            examType: '$_id.examType',
                            count: '$count',
                            totalMarks: '$totalMarks',
                            avgDuration: '$avgDuration'
                        }
                    }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching test statistics', error: error.message });
    }
});

module.exports = router; 