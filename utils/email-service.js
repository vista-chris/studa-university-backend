const nodemailer = require("nodemailer");

/**
 * Sending Account Creation/Onboarding Email
 */
const sendAccountCreationEmail = async (fname, email, link, type = 'student') => {
    try {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.GOOGLE_EMAIL,
                pass: process.env.GOOGLE_PASSWORD
            },
        });

        const subject = type === 'student' ? "Confirm your student account" : "Confirm your staff account";
        const greeting = `Hey ${fname},`;
        const bodyText = type === 'student'
            ? "Please click the link below to set up your new student portal password. The link expires after 15 minutes. If you did not authorise this activity, simply ignore this email."
            : "Please click the link below to set up your new staff portal password. The link expires after 15 minutes. If you did not authorise this activity, simply ignore this email.";

        // send mail with defined transport object
        await transporter.sendMail({
            from: `"University Support"<${process.env.GOOGLE_EMAIL}>`, // sender address
            to: email, // list of receivers
            subject: subject, // Subject line
            html: `
                <div style="font-family: 'Source Sans Pro', Arial, Tahoma, Geneva, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                    <h2 style="color: #1a1a1a;">${greeting}</h2>
                    <p style="color: #585858; font-size: 16px; line-height: 24px;">
                        ${bodyText}
                    </p>
                    <div style="margin: 30px 0;">
                        <a href="${link}" style="background: linear-gradient(310deg,#7928ca,#ff0080); color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Set Up Password</a>
                    </div>
                    <p style="color: #999; font-size: 14px;">
                        Alternatively, copy and paste this link into your browser:<br>
                        <span style="color: #7928ca;">${link}</span>
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #585858; font-size: 14px;">
                        Please do not reply to this email with your password. We will never ask for your password, and we strongly discourage you from sharing it with anyone.
                    </p>
                    <div style="margin-top: 30px;">
                        <span style="font-size: 24px; font-weight: bold; background: linear-gradient(310deg,#7928ca,#ff0080); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Studa University.</span>
                    </div>
                </div>
            `, // html body
        });

        console.log(`Onboarding email sent to: ${email}`);
    } catch (error) {
        console.error("Email Sending Error:", error);
        // We don't throw here to prevent account creation from failing if email fails, 
        // but in a real app, you might want to handle this more strictly.
    }
}

module.exports = { sendAccountCreationEmail };
