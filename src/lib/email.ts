import nodemailer from 'nodemailer';

// Buat transporter untuk Gmail SMTP
const transporter = process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // true untuk port 465, false untuk 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export async function sendResetPasswordEmail(email: string, resetUrl: string, name?: string) {
  // Jika tidak ada SMTP config, log saja (untuk development)
  if (!transporter || !process.env.SMTP_USER) {
    console.log('='.repeat(80));
    console.log('📧 RESET PASSWORD EMAIL (Development Mode - Email not sent)');
    console.log('='.repeat(80));
    console.log('To:', email);
    console.log('Subject: Reset Password');
    console.log('Reset URL:', resetUrl);
    console.log('='.repeat(80));
    return { success: true, error: null };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Magang UBIG" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Password - Magang UBIG',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px; width: 100%;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 48px 48px 0 48px;">
                      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #000000; letter-spacing: -0.3px;">Reset Password</h1>
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">Permintaan reset password akun Anda</p>
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="padding: 24px 48px 0 48px;">
                      <div style="border-top: 1px solid #e5e7eb;"></div>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px 48px;">
                      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                        Halo <strong style="color: #000000;">${name || 'Pengguna'}</strong>,
                      </p>
                      
                      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                        Kami menerima permintaan untuk mereset password akun Anda. Silakan klik tombol di bawah ini untuk melanjutkan.
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0 32px 0;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 500; font-size: 15px; letter-spacing: 0.2px;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Alternative Link -->
                      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; font-weight: 500;">
                          Atau salin link berikut:
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #9ca3af; word-break: break-all; line-height: 1.5;">
                          ${resetUrl}
                        </p>
                      </div>
                      
                      <!-- Security Notice -->
                      <div style="border-left: 3px solid #000000; padding: 16px 20px; background-color: #f9fafb; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #000000; font-weight: 600;">
                          Informasi Keamanan
                        </p>
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">
                          Link ini berlaku selama 1 jam. Jika Anda tidak melakukan permintaan ini, abaikan email ini.
                        </p>
                      </div>

                      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                        Terima kasih,<br>
                        <strong style="color: #000000;">Tim Magang UBIG</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 32px 48px; background-color: #fafafa; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">
                        Email otomatis, mohon tidak membalas.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                        © 2024 Magang UBIG. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Reset Password - Magang UBIG

Halo ${name || 'Pengguna'},

Kami menerima permintaan untuk mereset password akun Anda. 
Klik link berikut untuk mereset password:

${resetUrl}

Penting: Link ini hanya berlaku selama 1 jam. 
Jika Anda tidak meminta reset password, abaikan email ini.

Terima kasih,
Tim Magang UBIG

---
Email otomatis, mohon tidak membalas.
© 2024 Magang UBIG. All rights reserved.
      `.trim(),
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, error: null, data: info };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}










