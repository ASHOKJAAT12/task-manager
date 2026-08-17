import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';

const HOST = process.env.MAILTRAP_SMTP_HOST;
const PORT = process.env.MAILTRAP_SMTP_PORT;
const USER = process.env.MAILTRAP_SMTP_USER;
const PASS = process.env.MAILTRAP_SMTP_PASS;

const sendMail = async (options) => {
    if (!HOST || !PORT || !USER || !PASS) {
        console.warn("Skipping email send – SMTP credentials are not configured.");
        return;
    }

    const transporter = nodemailer.createTransport({
        host: HOST,
        port: Number(PORT),
        auth: { user: USER, pass: PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
    });

    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: "Task Manager",
            link: "https://taskmanagerlink.com",
        },
    });

    const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
    const emailHtml = mailGenerator.generate(options.mailgenContent);

    const mail = {
        from: "taskmanager@gmail.com",
        to: options.email,
        subject: options.subject,
        text: emailTextual,
        html: emailHtml,
    };

    try {
        await transporter.sendMail(mail);
    } catch (error) {
        console.error("Email service failed silently. Check your MAILTRAP credentials in .env");
        console.error("Error:", error.message);
    }
};

const emailVerificationMailgenContent = (username, verificationUrl) => {
    return {
        body: {
            name: username,
            intro: "Welcome to Task Manager! Please verify your email address.",
            action: {
                instructions: "Click the button below to verify your email:",
                button: {
                    color: "#22BC66",
                    text: "Verify Email",
                    link: verificationUrl,
                },
            },
            outro: "Need help, or have questions? Just reply to this email, we'd love to help.",
        },
    };
};

const forgotPasswordMailgenContent = (username, resetPasswordUrl) => {
    return {
        body: {
            name: username,
            intro: "You have requested to reset your password.",
            action: {
                instructions: "Click the button below to reset your password. This link expires in 20 minutes:",
                button: {
                    color: "#FF6B6B",
                    text: "Reset Password",
                    link: resetPasswordUrl,
                },
            },
            outro: "If you did not request a password reset, please ignore this email.",
        },
    };
};

export { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendMail };