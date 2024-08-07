import { config } from "dotenv";

config();

const _config = Object.freeze({
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  DB_NAME: process.env.DB_NAME,
  FRONTEND_URL: process.env.FRONTEND_URL,

  // access and refresh token variables
  ACCESS_TOKEN_NAME: process.env.ACCESS_TOKEN_NAME,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_NAME: process.env.REFRESH_TOKEN_NAME,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,

  // encryption & decryption variables
  PUBLIC_KEY_FOR_ENCRYPTION: process.env.PUBLIC_KEY_FOR_ENCRYPTION,
  PRIVATE_KEY_FOR_ENCRYPTION: process.env.PRIVATE_KEY_FOR_ENCRYPTION,

  // cloudinary variables
  CLOUDINARY_CLIENT_KEY: process.env.CLOUDINARY_CLIENT_KEY,
  CLOUDINARY_CLIENT_NAME: process.env.CLOUDINARY_CLIENT_NAME,
  CLOUDINARY_CLIENT_SECRET: process.env.CLOUDINARY_CLIENT_SECRET,

  //   nodemailer variables
  NODEMAILER_HOST: process.env.NODEMAILER_HOST,
  NODEMAILER_PORT: process.env.NODEMAILER_PORT,
  NODEMAILER_USER: process.env.NODEMAILER_USER,
  NODEMAILER_FROM: process.env.NODEMAILER_FROM,
  NODEMAILER_PASSWORD: process.env.NODEMAILER_PASSWORD,
});

const getenv = (key) => {
  const value = _config[key];
  if (!value) throw new Error(`Env ${key} not found`);
  return value;
};

export default getenv;
