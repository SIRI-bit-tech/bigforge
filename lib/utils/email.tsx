// Email notification service for BidForge
// Sends transactional emails for bid events, invitations, and updates

interface EmailParams {
  to: string
  subject: string
  html: string
  from?: string
}

// Send email using configured service (SendGrid, Resend, etc.)
export async function sendEmail({ to, subject, html, from = "noreply@bidforge.com" }: EmailParams) {
  // In production, integrate with SendGrid or other email service
  // For now, silently handle email for development

  // Example with SendGrid (uncomment when API key is configured):
  /*
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  await sgMail.send({
    to,
    from,
    subject,
    html,
  })
  */

  return true
}

// Email templates for different events
export const emailTemplates = {
  // Invitation to bid on project
  projectInvitation: (data: {
    subcontractorName: string
    projectTitle: string
    deadline: Date
    contractorName: string
    projectUrl: string
  }) => ({
    subject: `Invitation to Bid: ${data.projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #708090;">New Project Invitation</h2>
        <p>Hi ${data.subcontractorName},</p>
        <p>You've been invited by <strong>${data.contractorName}</strong> to submit a bid for:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0;">${data.projectTitle}</h3>
          <p style="margin: 0;"><strong>Bid Deadline:</strong> ${data.deadline.toLocaleDateString()}</p>
        </div>
        <a href="${data.projectUrl}" style="display: inline-block; background: #FF8C42; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">View Project & Submit Bid</a>
        <p style="color: #666; font-size: 14px;">Don't miss this opportunity! Log in to BidForge to review the project details and submit your bid before the deadline.</p>
      </div>
    `,
  }),

  // Bid submitted notification to contractor
  bidSubmitted: (data: {
    contractorName: string
    projectTitle: string
    subcontractorCompany: string
    bidAmount: string
    projectUrl: string
  }) => ({
    subject: `New Bid Received: ${data.projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #708090;">New Bid Received</h2>
        <p>Hi ${data.contractorName},</p>
        <p>A new bid has been submitted for your project:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0;">${data.projectTitle}</h3>
          <p style="margin: 4px 0;"><strong>Subcontractor:</strong> ${data.subcontractorCompany}</p>
          <p style="margin: 4px 0;"><strong>Bid Amount:</strong> ${data.bidAmount}</p>
        </div>
        <a href="${data.projectUrl}" style="display: inline-block; background: #708090; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Review Bid</a>
      </div>
    `,
  }),

  // Bid awarded notification to winning subcontractor
  bidAwarded: (data: {
    subcontractorName: string
    projectTitle: string
    bidAmount: string
    contractorName: string
    contractorEmail: string
    projectUrl: string
  }) => ({
    subject: `Congratulations! Your Bid Was Awarded: ${data.projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF8C42;">Congratulations!</h2>
        <p>Hi ${data.subcontractorName},</p>
        <p>Great news! Your bid has been awarded for:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0;">${data.projectTitle}</h3>
          <p style="margin: 4px 0;"><strong>Contract Amount:</strong> ${data.bidAmount}</p>
          <p style="margin: 4px 0;"><strong>General Contractor:</strong> ${data.contractorName}</p>
          <p style="margin: 4px 0;"><strong>Contact:</strong> ${data.contractorEmail}</p>
        </div>
        <a href="${data.projectUrl}" style="display: inline-block; background: #FF8C42; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">View Project Details</a>
        <p>The contractor will be in touch soon to finalize the contract details. Congratulations on winning this project!</p>
      </div>
    `,
  }),

  // Bid not awarded notification
  bidNotAwarded: (data: { subcontractorName: string; projectTitle: string }) => ({
    subject: `Bid Status Update: ${data.projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #708090;">Bid Status Update</h2>
        <p>Hi ${data.subcontractorName},</p>
        <p>Thank you for submitting your bid for <strong>${data.projectTitle}</strong>.</p>
        <p>While your bid was not selected for this project, we appreciate the time and effort you put into your proposal. We encourage you to continue bidding on future opportunities through BidForge.</p>
        <p style="color: #666; font-size: 14px;">Keep refining your bids and we're confident you'll land the next one!</p>
      </div>
    `,
  }),

  // Deadline reminder (24 hours before)
  deadlineReminder: (data: {
    subcontractorName: string
    projectTitle: string
    deadline: Date
    projectUrl: string
  }) => ({
    subject: `Reminder: Bid Deadline Tomorrow - ${data.projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF8C42;">Bid Deadline Approaching</h2>
        <p>Hi ${data.subcontractorName},</p>
        <p>This is a friendly reminder that the bid deadline for <strong>${data.projectTitle}</strong> is tomorrow:</p>
        <div style="background: #fff3e0; border-left: 4px solid #FF8C42; padding: 16px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Deadline:</strong> ${data.deadline.toLocaleString()}</p>
        </div>
        <a href="${data.projectUrl}" style="display: inline-block; background: #FF8C42; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Submit Your Bid Now</a>
        <p>Don't miss out on this opportunity!</p>
      </div>
    `,
  }),

  // Document addendum notification
  documentAdded: (data: {
    recipientName: string
    projectTitle: string
    documentName: string
    documentType: string
    projectUrl: string
  }) => ({
    subject: `New Document Added: ${data.projectTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #708090;">Project Document Update</h2>
        <p>Hi ${data.recipientName},</p>
        <p>A new document has been added to <strong>${data.projectTitle}</strong>:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Document:</strong> ${data.documentName}</p>
          <p style="margin: 4px 0;"><strong>Type:</strong> ${data.documentType}</p>
        </div>
        <a href="${data.projectUrl}" style="display: inline-block; background: #708090; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">View Document</a>
        <p>Please review the new document as it may affect your bid.</p>
      </div>
    `,
  }),
}
