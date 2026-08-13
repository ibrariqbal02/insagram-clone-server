import transporter from "./nodemailer";

const sendEmail = async (to: string, subject: string, text: string) => {
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    text,
  });
};

export default sendEmail;
