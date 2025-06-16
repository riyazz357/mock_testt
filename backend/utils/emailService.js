const nodemailer = require('nodemailer');

// Create transporter based on environment
const createTransporter = async () => {
    if (process.env.NODE_ENV === 'production') {
        // Production SMTP configuration
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        // Development: Use Ethereal Email
        try {
            const testAccount = await nodemailer.createTestAccount();
            console.log('Created Ethereal test account:', testAccount.user);
            return nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
        } catch (error) {
            console.error('Error creating test account:', error);
            throw error;
        }
    }
};

const sendVerificationEmail = async (email, token) => {
    try {
        // Create transporter
        const transporter = await createTransporter();
        
        // Get base URL from environment or use default
        const baseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5000';
        const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
        
        const mailOptions = {
            from: `"IOE/CEE Prep" <${process.env.SMTP_USER || 'noreply@ioeceeprep.com'}>`,
            to: email,
            subject: 'Verify Your Email - IOE/CEE Prep',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #4361ee; margin: 0;">IOE/CEE Prep</h1>
                        <p style="color: #666; margin-top: 10px;">Your Ultimate Exam Preparation Platform</p>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h2 style="color: #333; margin-top: 0;">Welcome to IOE/CEE Prep!</h2>
                        <p style="color: #666; line-height: 1.6;">Thank you for signing up. To complete your registration and access all features, please verify your email address by clicking the button below:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background-color: #4361ee; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                Verify Email Address
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="color: #4361ee; word-break: break-all; font-size: 14px;">${verificationUrl}</p>
                    </div>
                    
                    <div style="color: #666; font-size: 14px; text-align: center;">
                        <p>This verification link will expire in 24 hours.</p>
                        <p>If you didn't create an account, you can safely ignore this email.</p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
                        <p>© ${new Date().getFullYear()} IOE/CEE Prep. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        // Send mail
        const info = await transporter.sendMail(mailOptions);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        console.log('Verification email sent successfully to:', email);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};

module.exports = {
    sendVerificationEmail
}; 