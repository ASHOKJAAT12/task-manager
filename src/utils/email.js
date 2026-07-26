import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';
import { text } from 'express';


const HOST = process.env.MAILTRAP_SMTP_HOST;
const PORT = process.env.MAILTRAP_SMTP_PORT;
const USER = process.env.MAILTRAP_SMTP_USER;
const PASS = process.env.MAILTRAP_SMTP_PASS;

const sendMail = async  ( options ) => {
    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: "Task Manager",
            link: "https://taskmanagerlink.com"
        },
    });

    const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

    const emailHtml = mailGenerator.generate(options.mailgenContent);

    const transporter = nodemailer.createTransport({
        host: HOST,
        port: PORT,
        auth: {
            user: USER,
            pass: PASS
        }
    });

    const mail = {
        from: "taskmanager@gamil.com",
        to: options.email,
        subject: options.subject,
        text: emailTextual,
        html: emailHtml
    };

    try {
        await transporter.sendMail(mail);
    } catch (error) {
        console.error("Email service failed siliently. Make sure that you have provided your MAILTRAP credentials in the .env file");
        console.error("Error: ", error);
    }
}


const emailVerificationMailgenContent = ( username , verificationUrl ) => {
    return {
        body: {
            name: username,
            intro: "Welcome to our website.",
            action: {
                instructions: "email verification link.the link is below",
                button: {
                    color: "#f3f",
                    text: "email verification",
                    link: verificationUrl
                }
            },
            outro: "Need help, or have questions? Just reply to this email, we'd love to help"
        }
    }
}

const forgotPasswordMailgenContent = ( username, ResetPasswordUrl ) => {
    return {
        body: {
            name: username,
            intro: "Welcome to our website",
            action: {
                instructions: "Reset password link. link is below.",
                button: {
                    color: "#f3f",
                    text: "Reset Password",
                    link: ResetPasswordUrl
                }
            },
            outro: "Need help, or have questions? Just reply to this email, we'd love to help"
        }
    }
};



export {
    emailVerificationMailgenContent,
    forgotPasswordMailgenContent,
    sendMail
};