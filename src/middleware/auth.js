import asyncHandler from "../utils/asyncHandler.js";
import CustomError from "../utils/customError.js";
import { createAndSetCookies, tokenService } from "../services/tokenService.js";
import User from "../models/user.model.js";
import getenv from "../config/dotenv.js";

const isAuthenticated = asyncHandler(async (req, res, next) => {
    const accessToken = req.cookies?.[getenv("ACCESS_TOKEN_NAME")];
    let userId;
    let user;
    if (accessToken) userId = await tokenService().verifyAccessToken(accessToken);
    if (!userId) {
        // get new access and refresh token
        const refreshToken = req.cookies?.[getenv("REFRESH_TOKEN_NAME")];
        if (!refreshToken) return next(new CustomError(400, "please Login again"));
        userId = await tokenService().verifyRefreshToken(refreshToken);
        user = await User.findById(userId).select("_id role");
        if (!user) return next(new CustomError(400, "please Login again"));
        const isSet = await createAndSetCookies(res, userId);
        if (!isSet) return next(new CustomError(500, "Error While creating and setting Tokens"));
    } else {
        // validate user
        user = await User.findById(userId).select("_id role");
        if (!user) return next(new CustomError(400, "please Login again"));
    }
    req.user = user;
    next();
});

export { isAuthenticated };
