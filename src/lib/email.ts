import { Resend } from 'resend';

interface WaitlistSubmission {
  name: string;
  email: string;
  company: string;
  industry: string;
  dataSize: string;
  useCase: string;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@synoptic.dev';
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@synoptic.dev';
const SENDER_NAME = 'Synoptic';

let resendClient: Resend;

function getResendClient() {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not found in environment variables');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendWaitlistNotification(submission: WaitlistSubmission) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: `${SENDER_NAME} <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject: 'New Waitlist Submission',
      html: `
        <h2>New Waitlist Submission</h2>
        <p><strong>Name:</strong> ${submission.name}</p>
        <p><strong>Email:</strong> ${submission.email}</p>
        <p><strong>Company:</strong> ${submission.company}</p>
        <p><strong>Industry:</strong> ${submission.industry}</p>
        <p><strong>Data Size:</strong> ${submission.dataSize}</p>
        <p><strong>Use Case:</strong> ${submission.useCase}</p>
        <p><em>Submitted at: ${new Date().toLocaleString()}</em></p>
      `,
      replyTo: submission.email // Allow direct reply to the submitter
    });

    if (error) {
      console.error('Failed to send admin notification:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
}

export async function sendWaitlistConfirmation(submission: WaitlistSubmission) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: `${SENDER_NAME} <${FROM_EMAIL}>`,
      to: [submission.email],
      replyTo: ADMIN_EMAIL, // Allow users to reply to admin email
      subject: 'Welcome to the Synoptic Waitlist!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .content { background: #f9fafb; padding: 30px; border-radius: 10px; }
              .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #666; }
              .address { margin-top: 20px; font-size: 0.8em; color: #888; }
              .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="color: #2563eb;">Welcome to Synoptic!</h1>
              </div>
              <div class="content">
                <p>Hi ${submission.name},</p>
                
                <p>Thank you for joining the Synoptic waitlist! We're excited to have you on board and can't wait to show you how our synthetic data generation platform can transform your AI and machine learning projects.</p>
                
                <p>Here's what happens next:</p>
                <ul>
                  <li>You're now officially on our waitlist</li>
                  <li>We'll keep you updated on our progress</li>
                  <li>You'll be among the first to know when we launch</li>
                  <li>We'll provide early access to selected waitlist members</li>
                </ul>

                <p>We've noted your interest in using our platform for:</p>
                <p style="background: #f0f4ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  ${submission.useCase}
                </p>

                <p>If you have any questions in the meantime, feel free to reply to this email. We'd love to hear more about your synthetic data needs!</p>
              </div>
              <div class="footer">
                <p>Best regards,<br>The Synoptic Team</p>
                <p style="font-size: 0.8em; color: #888;">
                  This email was sent to ${submission.email} because you signed up for the Synoptic waitlist.
                </p>
                <div class="address">
                  <p>Synoptic</p>
                  <p>1111B S Governors Ave STE 26703</p>
                  <p>Dover, DE 19904</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send confirmation email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
}