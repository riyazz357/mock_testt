// API Configuration
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// EmailJS configuration
const EMAILJS_CONFIG = {
    serviceID: 'YOUR_SERVICE_ID',
    templateID: 'YOUR_TEMPLATE_ID',
    userID: 'YOUR_USER_ID'
};

// Add EmailJS script
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
document.head.appendChild(script);

// Initialize EmailJS
script.onload = () => {
    emailjs.init(EMAILJS_CONFIG.userID);
};

// Helper function to handle API requests
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        console.log(`Making API request to: ${API_BASE_URL}${endpoint}`);
        console.log('Request options:', { ...options, headers: { ...headers, Authorization: headers.Authorization ? '[REDACTED]' : undefined } });

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
            console.error('API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                data
            });
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Unable to connect to the server. Please check if the server is running.');
        }
        throw error;
    }
}

// API Service
window.api = {
    // Authentication
    auth: {
        login: async (email, password) => {
            return apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
        },
        register: async (userData) => {
            console.log('Sending registration request:', { ...userData, password: '[REDACTED]' });
            return apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },
        getCurrentUser: async () => {
            return apiRequest('/auth/me');
        },
        updatePreferences: async (preferences) => {
            return apiRequest('/auth/preferences', {
                method: 'PUT',
                body: JSON.stringify(preferences)
            });
        },
        verifyEmail: async (token) => {
            const response = await fetch(`${API_BASE_URL}/auth/verify-email/${token}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to verify email');
            }
            return response.json();
        },
        sendVerificationEmail: async (email, token) => {
            try {
                const templateParams = {
                    to_email: email,
                    verification_link: `${window.location.origin}/verify-email?token=${token}`,
                    user_name: email.split('@')[0]
                };

                const response = await emailjs.send(
                    EMAILJS_CONFIG.serviceID,
                    EMAILJS_CONFIG.templateID,
                    templateParams
                );

                console.log('Email sent successfully:', response);
                return true;
            } catch (error) {
                console.error('Failed to send email:', error);
                throw new Error('Failed to send verification email');
            }
        }
    },

    // Questions
    questions: {
        getAll: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            return apiRequest(`/questions?${queryParams}`);
        },
        getById: async (id) => {
            return apiRequest(`/questions/${id}`);
        },
        create: async (question) => {
            return apiRequest('/questions', {
                method: 'POST',
                body: JSON.stringify(question)
            });
        }
    },

    // Tests
    tests: {
        getAll: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            return apiRequest(`/tests?${queryParams}`);
        },
        getById: async (id) => {
            return apiRequest(`/tests/${id}`);
        },
        getQuestions: async (id) => {
            return apiRequest(`/tests/${id}/questions`);
        }
    },

    // Test Results
    testResults: {
        start: async (testId) => {
            return apiRequest(`/test-results/start/${testId}`, {
                method: 'POST'
            });
        },
        submitAnswer: async (testResultId, answer) => {
            return apiRequest(`/test-results/${testResultId}/answer`, {
                method: 'POST',
                body: JSON.stringify(answer)
            });
        },
        submit: async (testResultId) => {
            return apiRequest(`/test-results/${testResultId}/submit`, {
                method: 'POST'
            });
        },
        getUserResults: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            return apiRequest(`/test-results/user?${queryParams}`);
        },
        getById: async (id) => {
            return apiRequest(`/test-results/${id}`);
        },
        getAnalytics: async () => {
            return apiRequest('/test-results/analytics/overview');
        }
    },

    // Study Materials
    studyMaterials: {
        getAll: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            return apiRequest(`/study-materials?${queryParams}`);
        },
        getById: async (id) => {
            return apiRequest(`/study-materials/${id}`);
        },
        upload: async (formData) => {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/study-materials`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }
            return data;
        },
        delete: async (id) => {
            return apiRequest(`/study-materials/${id}`, {
                method: 'DELETE'
            });
        }
    }
}; 