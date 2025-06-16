const express = require('express');
const router = express.Router();
const TestResult = require('../models/TestResult');
const Test = require('../models/Test');
const Question = require('../models/Question');
const { auth } = require('../middleware/auth');

// Start a test
router.post('/start/:testId', auth, async (req, res) => {
    try {
        const test = await Test.findById(req.params.testId);
        
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        if (!test.isActive) {
            return res.status(400).json({ message: 'Test is not active' });
        }

        // Check if user already has an in-progress test
        const existingTest = await TestResult.findOne({
            user: req.user._id,
            test: req.params.testId,
            status: 'in_progress'
        });

        if (existingTest) {
            return res.json({
                message: 'Resuming existing test',
                testResult: existingTest
            });
        }

        // Get questions for the test
        const questions = await Question.find({
            subject: test.subject,
            examType: test.examType
        }).select('-correctAnswer');

        const newTestResult = new TestResult({
            user: req.user._id,
            test: req.params.testId,
            startTime: new Date(),
            status: 'in_progress',
            answers: questions.map(q => ({
                question: q._id,
                selectedAnswer: null,
                isCorrect: false,
                timeSpent: 0,
                marks: 0
            }))
        });

        await newTestResult.save();

        res.status(201).json({
            message: 'Test started successfully',
            testResult: newTestResult
        });
    } catch (error) {
        res.status(500).json({ message: 'Error starting test', error: error.message });
    }
});

// Submit an answer
router.post('/:testResultId/answer', auth, async (req, res) => {
    try {
        const { questionId, selectedAnswer, timeSpent } = req.body;

        const testResult = await TestResult.findOne({
            _id: req.params.testResultId,
            user: req.user._id,
            status: 'in_progress'
        });

        if (!testResult) {
            return res.status(404).json({ message: 'Test result not found or already completed' });
        }

        // Get the question to check the correct answer
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Update the answer
        const answerIndex = testResult.answers.findIndex(a => a.question.toString() === questionId);
        if (answerIndex === -1) {
            return res.status(400).json({ message: 'Question not found in test' });
        }

        const isCorrect = selectedAnswer === question.correctAnswer;
        const marks = isCorrect ? question.marks : 0;

        testResult.answers[answerIndex] = {
            question: questionId,
            selectedAnswer,
            isCorrect,
            timeSpent,
            marks
        };

        await testResult.save();

        res.json({
            message: 'Answer submitted successfully',
            isCorrect,
            marks
        });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting answer', error: error.message });
    }
});

// Submit test
router.post('/:testResultId/submit', auth, async (req, res) => {
    try {
        const testResult = await TestResult.findOne({
            _id: req.params.testResultId,
            user: req.user._id,
            status: 'in_progress'
        });

        if (!testResult) {
            return res.status(404).json({ message: 'Test result not found or already completed' });
        }

        const test = await Test.findById(testResult.test);
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        // Calculate final scores
        const subjectResults = {};
        let totalMarks = 0;
        let totalTime = 0;

        for (const answer of testResult.answers) {
            const question = await Question.findById(answer.question);
            if (!question) continue;

            if (!subjectResults[question.subject]) {
                subjectResults[question.subject] = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    wrongAnswers: 0,
                    unattempted: 0,
                    marksObtained: 0,
                    totalMarks: 0,
                    timeSpent: 0
                };
            }

            const subjectResult = subjectResults[question.subject];
            subjectResult.totalQuestions++;
            subjectResult.totalMarks += question.marks;
            subjectResult.timeSpent += answer.timeSpent || 0;

            if (!answer.selectedAnswer) {
                subjectResult.unattempted++;
            } else if (answer.isCorrect) {
                subjectResult.correctAnswers++;
                subjectResult.marksObtained += answer.marks;
            } else {
                subjectResult.wrongAnswers++;
            }

            totalMarks += answer.marks;
            totalTime += answer.timeSpent || 0;
        }

        // Update test result
        testResult.status = 'completed';
        testResult.endTime = new Date();
        testResult.subjectResults = subjectResults;
        testResult.totalMarks = totalMarks;
        testResult.totalTime = totalTime;

        await testResult.save();

        res.json({
            message: 'Test submitted successfully',
            testResult
        });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting test', error: error.message });
    }
});

// Get user's test results
router.get('/user', auth, async (req, res) => {
    try {
        const { limit = 10, skip = 0 } = req.query;

        const testResults = await TestResult.find({ user: req.user._id })
            .populate('test', 'title subject examType')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await TestResult.countDocuments({ user: req.user._id });

        res.json({
            testResults,
            total,
            hasMore: total > (parseInt(skip) + testResults.length)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching test results', error: error.message });
    }
});

// Get specific test result
router.get('/:testResultId', auth, async (req, res) => {
    try {
        const testResult = await TestResult.findOne({
            _id: req.params.testResultId,
            user: req.user._id
        }).populate('test', 'title subject examType');

        if (!testResult) {
            return res.status(404).json({ message: 'Test result not found' });
        }

        res.json(testResult);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching test result', error: error.message });
    }
});

// Get user's performance analytics
router.get('/analytics/overview', auth, async (req, res) => {
    try {
        const analytics = await TestResult.aggregate([
            {
                $match: {
                    user: req.user._id,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: {
                        subject: '$test.subject',
                        examType: '$test.examType'
                    },
                    totalTests: { $sum: 1 },
                    totalMarks: { $sum: '$totalMarks' },
                    totalTime: { $sum: '$totalTime' },
                    avgScore: { $avg: '$totalMarks' }
                }
            },
            {
                $group: {
                    _id: '$_id.subject',
                    examTypes: {
                        $push: {
                            examType: '$_id.examType',
                            totalTests: '$totalTests',
                            totalMarks: '$totalMarks',
                            totalTime: '$totalTime',
                            avgScore: '$avgScore'
                        }
                    }
                }
            }
        ]);

        res.json(analytics);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics', error: error.message });
    }
});

module.exports = router; 