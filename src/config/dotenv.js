import { config } from "dotenv";

config();

const _config = Object.freeze({
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI,
    DB_NAME: process.env.DB_NAME,

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
});

const getenv = (key) => {
    const value = _config[key];
    if (!value) throw new Error(`Env ${key} not found`);
    return value;
};

export default getenv;
