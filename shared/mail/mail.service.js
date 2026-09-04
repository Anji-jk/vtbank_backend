import { transporter } from '../config/mail.config.js';

const FROM_ADDRESS = process.env.EMAIL_FROM || 'TestBank <no-reply@testbank.local>';

export const sendMail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({ from: FROM_ADDRESS, to, subject, html });
    console.log('email sent successfully', info);
  }
  catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
  }
}

export const sendRegistrationReceivedEmail = async (toEmail, firstName) => {
  await sendMail({
    to: toEmail,
    subject: 'VTBank — Registration Received',
    html: `<p>Hi ${firstName},</p>
     <p>We've received your registration request. It's now awaiting review by bank manager.
     You'll receive another email once a decision has been made.</p>
     <p>— VTBank</p>`
  });
}

export const sendRegistrationApprovedEmail = async (toEmail, firstName, { customerCode, accountNumber, temporaryPassword }) => {
  await sendMail({
    to: toEmail,
    subject: 'VTBank — Registration Approved',
    html: `<p>Hi ${firstName},</p>
     <p>Your registration has been approved. Here are your account details:</p>
     <ul>
       <li><strong>Customer ID:</strong> ${customerCode}</li>
       <li><strong>Account Number:</strong> ${accountNumber}</li>
       <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
     </ul>
     <p>Please log in and change your password on first login — this temporary password can only be used once.</p>
     <p>—  VTBank</p>`
  });
}

export const sendRegistrationRejectedEmail = async (toEmail, firstName, reason) => {
  await sendMail({
    to: toEmail,
    subject: 'VTBank — Registration Not Approved',
    html: `<p>Hi ${firstName},</p>
     <p>Unfortunately, your registration request was not approved.</p>
     <p><strong>Reason:</strong> ${reason}</p>
     <p>You're welcome to correct the issue and register again.</p>
     <p>— VTBank</p>`
  });
};


export const sendAccountCreatedEmail = async (toEmail, firstName, accountNumber, accountType) => {
  const formattedType = accountType.charAt(0).toUpperCase() + accountType.slice(1);

  await sendMail({
    to: toEmail,
    subject: `VTBank — Your New ${formattedType} Account Has Been Created`,
    html: `<p>Hi ${firstName},</p>
     <p>Your new <strong>${formattedType} Account</strong> has been successfully opened and is now active.</p>
     <p><strong>Account Number:</strong> ${accountNumber}</p>
     <p>You can now manage your new account and perform transactions through your dashboard.</p>
     <p>Thank you for banking with us!</p>
     <p>— VTBank</p>`
  });
};