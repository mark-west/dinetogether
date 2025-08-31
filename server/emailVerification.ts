import { MailService } from '@sendgrid/mail';
import { nanoid } from 'nanoid';

// Store pending verifications in memory (in production, use Redis or database)
const pendingVerifications = new Map<string, {
  email: string;
  firstName: string;
  lastName: string;
  hashedPassword: string;
  expiresAt: Date;
}>();

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64');
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  return Buffer.from(password).toString('base64') === hashedPassword;
}

export async function sendVerificationEmail(
  email: string, 
  firstName: string, 
  lastName: string, 
  password: string
): Promise<string> {
  const verificationToken = nanoid(32);
  const hashedPassword = hashPassword(password);
  
  // Store verification data (expires in 24 hours)
  pendingVerifications.set(verificationToken, {
    email,
    firstName,
    lastName,
    hashedPassword,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  const verificationUrl = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
  
  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY!);
  
  await mailService.send({
    to: email,
    from: 'noreply@dinetogether.app', // Use your verified sender
    subject: 'Verify Your DineTogether Account',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to DineTogether!</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin-top: 0;">Hi ${firstName}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Thanks for joining DineTogether! Click the button below to verify your email address and complete your account setup.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold;
                      display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; line-height: 1.4;">
            If you didn't create an account with DineTogether, you can safely ignore this email.
            This verification link will expire in 24 hours.
          </p>
          
          <p style="color: #999; font-size: 12px;">
            If the button doesn't work, copy and paste this link: <br>
            <a href="${verificationUrl}" style="color: #8B5CF6;">${verificationUrl}</a>
          </p>
        </div>
      </div>
    `,
    text: `
      Welcome to DineTogether!
      
      Hi ${firstName},
      
      Thanks for joining DineTogether! Please verify your email address by clicking this link:
      ${verificationUrl}
      
      This link will expire in 24 hours for security.
      
      If you didn't create an account, you can safely ignore this email.
    `
  });

  return verificationToken;
}

export function verifyEmailToken(token: string): { email: string; firstName: string; lastName: string; hashedPassword: string } | null {
  const verification = pendingVerifications.get(token);
  
  if (!verification) {
    return null;
  }
  
  // Check if expired
  if (new Date() > verification.expiresAt) {
    pendingVerifications.delete(token);
    return null;
  }
  
  // Clean up used token
  pendingVerifications.delete(token);
  
  return verification;
}

export function findUserByEmailAndPassword(email: string, password: string): { email: string; id: string } | null {
  // This is a simple demo - in production, you'd query the database
  // For now, just create a user session
  return {
    email,
    id: `email-user-${email.replace('@', '-').replace('.', '-')}`
  };
}

export { hashPassword, verifyPassword };