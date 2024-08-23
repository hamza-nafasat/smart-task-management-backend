import nodemailer from "nodemailer";
import getenv from "../config/dotenv.js";

export const transporter = nodemailer.createTransport({
  host: getenv("NODEMAILER_HOST"),
  port: parseInt(getenv("NODEMAILER_PORT")),
  auth: {
    user: getenv("NODEMAILER_USER"),
    pass: getenv("NODEMAILER_PASSWORD"),
  },
});

export const sendMail = async (to, subject, text, html = false) => {
  try {
    if (!to || !subject || !text) throw new Error("Please Provide To, Subject and Text");
    const myTransPorter = transporter;
    await myTransPorter.sendMail({
      from: getenv("NODEMAILER_FROM"),
      to,
      subject,
      text: html ? undefined : text,
      html: html ? text : undefined,
    });
    console.log("email sended successfully");
    return true;
  } catch (error) {
    console.log("error while sending mail", error);
    return false;
  }
};
export const sendMailWithAttachments = async (to, subject, text, attachment) => {
  try {
    if (!to || !subject || !text) throw new Error("Please Provide To, Subject and Text");
    const myTransPorter = transporter;
    await myTransPorter.sendMail({
      from: getenv("NODEMAILER_FROM"),
      to,
      subject,
      text,
      attachments: attachment,
    });
    return true;
  } catch (error) {
    console.log("error while sending file on mail", error);
  }
};
