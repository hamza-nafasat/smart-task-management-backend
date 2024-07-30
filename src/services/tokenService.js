import jwt from "jsonwebtoken";
import getenv from "../config/dotenv.js";
import { decryptPayload, encryptPayload } from "../utils/encryption.js";
import Token from "../models/token.model.js";

// factory function for jwt tokens
// ------------------------------
const tokenService = () => {
    return {
        // Access token : create and encrypt
        getAccessToken: async (id) => {
            try {
                if (!id) throw new Error("id is not provided in get access token");
                let token = jwt.sign({ id }, getenv("ACCESS_TOKEN_SECRET"), {
                    expiresIn: Number(getenv("ACCESS_TOKEN_EXPIRY")),
                });
                token = await encryptPayload(token);
                return token;
            } catch (error) {
                console.log("error while creating and encrypting access token", error);
                return null;
            }
        },
        // Access token decrypt and decode
        verifyAccessToken: async (token) => {
            try {
                if (!token) throw new Error("Token Not Provided in verifyAccessToken ");
                let decryptedToken = await decryptPayload(token);
                const decodedToken = jwt.verify(decryptedToken, getenv("ACCESS_TOKEN_SECRET"));
                if (decodedToken.id) return decodedToken.id;
                else return null;
            } catch (error) {
                console.log("error while verifying access token ", error);
                return null;
            }
        },
        // Refresh token : create, encrypt and store in database
        getRefreshToken: async (id) => {
            try {
                if (!id) throw new Error("id is not provided in get refresh token");
                let token = jwt.sign({ id }, getenv("REFRESH_TOKEN_SECRET"), {
                    expiresIn: Number(getenv("REFRESH_TOKEN_EXPIRY")),
                });
                let [encryptedToken, storedToken] = await Promise.all([
                    encryptPayload(token),
                    Token.findOneAndUpdate({ userId: id }, { token }, { upsert: true, new: true }),
                ]);
                if (!storedToken) throw new Error("Error While Storing Refresh Token in DB");
                return encryptedToken;
            } catch (error) {
                console.log("error while creating and encrypting refresh token", error);
                return null;
            }
        },
        // Refresh token : decrypt, check in db and decode
        verifyRefreshToken: async (token) => {
            try {
                if (!token) throw new Error("Token Not Provided in verifyRefreshToken ");
                const decryptedToken = await decryptPayload(token);
                const decodedToken = await jwt.verify(decryptedToken, getenv("REFRESH_TOKEN_SECRET"));
                let userId = decodedToken?.id;
                if (userId) {
                    const deleteOldToken = await Token.findOneAndDelete({ userId }, { token }, { new: true });
                    if (deleteOldToken) return userId;
                } else return null;
            } catch (error) {
                console.log("error while verifying refresh token", error);
                return null;
            }
        },
    };
};
// create and set cookies
// ----------------------
const createAndSetCookies = async (res, id) => {
    try {
        const options = { httpOnly: true, sameSite: "none", secure: true };
        const [accessToken, refreshToken] = await Promise.all([
            tokenService().getAccessToken(id),
            tokenService().getRefreshToken(id),
        ]);
        if (!accessToken || !refreshToken) throw new Error("Internal Server Error");
        res.cookie(getenv("ACCESS_TOKEN_NAME"), accessToken, {
            ...options,
            maxAge: getenv("ACCESS_TOKEN_EXPIRY"),
        });
        res.cookie(getenv("REFRESH_TOKEN_NAME"), refreshToken, {
            ...options,
            maxAge: getenv("REFRESH_TOKEN_EXPIRY"),
        });
        return true;
    } catch (error) {
        console.log("error while creating and setting cookies ", error);
        return false;
    }
};
// function for sending token in client side
// ----------------------------------------
const sendTokens = async (res, user, code, message) => {
    if (!user) {
        console.log("User Not Provided in sendToken Function");
        throw new Error("Internal Server Error");
    }
    const userId = user._id; //get user id
    const isSetCookies = await createAndSetCookies(res, userId);
    if (!isSetCookies) throw new Error("Interval Server Error");
    res.status(Number(code)).json({ success: true, message, user });
};

export { tokenService, sendTokens, createAndSetCookies };
