const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { auth, adminAuth } = require('../middleware/auth');

// Add new question (admin only)
router.post('/', adminAuth, async (req, res) => {
    try {
        console.log('Received question submission:', JSON.stringify(req.body, null, 2));
        console.log('User:', JSON.stringify(req.user, null, 2));

        const {
            question,
            options,
            correctAnswer,
            explanation,
            subject,
            chapter,
            topic,
            difficulty,
            examType
        } = req.body;

        // Validate required fields
        if (!question || !options || !correctAnswer || !subject || !difficulty || !examType) {
            console.error('Missing required fields:', { question, options, correctAnswer, subject, difficulty, examType });
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newQuestion = new Question({
            question,
            options,
            correctAnswer,
            explanation,
            subject,
            chapter,
            topic,
            difficulty,
            examType,
            createdBy: req.user._id
        });

        console.log('Created question object:', JSON.stringify(newQuestion, null, 2));

        // Validate the question object
        const validationError = newQuestion.validateSync();
        if (validationError) {
            console.error('Validation error:', validationError);
            return res.status(400).json({ message: 'Validation error', error: validationError.message });
        }

        const savedQuestion = await newQuestion.save();
        console.log('Question saved successfully:', JSON.stringify(savedQuestion, null, 2));

        res.status(201).json({
            message: 'Question added successfully',
            question: savedQuestion
        });
    } catch (error) {
        console.error('Error saving question:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Error adding question', error: error.message });
    }
});

// Get questions with filters
router.get('/', auth, async (req, res) => {
    try {
        const {
            subject,
            examType,
            difficulty,
            chapter,
            topic,
            limit = 10,
            skip = 0
        } = req.query;

        const query = {};

        if (subject) query.subject = subject;
        if (examType) query.examType = examType;
        if (difficulty) query.difficulty = difficulty;
        if (chapter) query.chapter = chapter;
        if (topic) query.topic = topic;

        const questions = await Question.find(query)
            .select('-correctAnswer')  // Don't send correct answer to client
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await Question.countDocuments(query);

        res.json({
            questions,
            total,
            hasMore: total > (parseInt(skip) + questions.length)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching questions', error: error.message });
    }
});

// Get question by ID (with correct answer for admin)
router.get('/:id', auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Only send correct answer to admin
        if (req.user.role !== 'admin') {
            question.correctAnswer = undefined;
        }

        res.json(question);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching question', error: error.message });
    }
});

// Update question (admin only)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const {
            question,
            options,
            correctAnswer,
            explanation,
            subject,
            chapter,
            topic,
            difficulty,
            examType
        } = req.body;

        const updatedQuestion = await Question.findByIdAndUpdate(
            req.params.id,
            {
                question,
                options,
                correctAnswer,
                explanation,
                subject,
                chapter,
                topic,
                difficulty,
                examType
            },
            { new: true }
        );

        if (!updatedQuestion) {
            return res.status(404).json({ message: 'Question not found' });
        }

        res.json({
            message: 'Question updated successfully',
            question: updatedQuestion
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating question', error: error.message });
    }
});

// Delete question (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting question', error: error.message });
    }
});

// Get question statistics (admin only)
router.get('/stats/overview', adminAuth, async (req, res) => {
    try {
        const stats = await Question.aggregate([
            {
                $group: {
                    _id: {
                        subject: '$subject',
                        examType: '$examType',
                        difficulty: '$difficulty'
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
                            difficulties: {
                                $push: {
                                    difficulty: '$_id.difficulty',
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
        res.status(500).json({ message: 'Error fetching question statistics', error: error.message });
    }
});

module.exports = router; 