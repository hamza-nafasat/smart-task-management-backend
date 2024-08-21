import asyncHandler from "../utils/asyncHandler.js";
import CustomError from "../utils/customError.js";
import { createAndSetCookies, tokenService } from "../services/tokenService.js";
import User from "../models/user.model.js";
import getenv from "../config/dotenv.js";
import { decryptPayload } from "../utils/encryption.js";

const isAuthenticated = asyncHandler(async (req, res, next) => {
  const accessToken = req.cookies?.[getenv("ACCESS_TOKEN_NAME")];
  let userId;
  let user;
  if (accessToken) userId = await tokenService().verifyAccessToken(accessToken);
  if (!userId) {
    // get new access and refresh token
    const refreshToken = req.cookies?.[getenv("REFRESH_TOKEN_NAME")];
    console.log(refreshToken, "fjaslkdfjasldf");
    if (!refreshToken) return next(new CustomError(400, "please Login again"));
    userId = await tokenService().verifyRefreshToken(refreshToken);
    user = await User.findById(userId).select("_id name role");
    console.log(user, userId);
    if (!user) return next(new CustomError(400, "please Login again"));
    const isSet = await createAndSetCookies(res, userId);
    if (!isSet) return next(new CustomError(500, "Error While creating and setting Tokens"));
  } else {
    // validate user
    user = await User.findById(userId).select("_id name role");
    if (!user) return next(new CustomError(400, "please Login again"));
  }
  req.user = user;
  next();
});

const isSocketAuth = asyncHandler(async (err, socket, next) => {
  const accessToken = socket.request.cookies?.[getenv("ACCESS_TOKEN_NAME")];
  let userId;
  let user;
  if (accessToken) userId = await tokenService().verifyAccessToken(accessToken);
  if (!userId) {
    // get new access and refresh token
    const refreshToken = socket.request.cookies?.[getenv("REFRESH_TOKEN_NAME")];
    if (!refreshToken) return next(new CustomError(400, "please Login again"));
    const decryptedToken = await decryptPayload(refreshToken);
    const decodedToken = await jwt.verify(decryptedToken, getenv("REFRESH_TOKEN_SECRET"));
    userId = decodedToken?.id;
    console.log(userId, "userId");
    user = await User.findById(userId).select("_id name role");
    if (!user) return next(new CustomError(400, "please Login again"));
  } else {
    // validate user
    user = await User.findById(userId).select("_id name role");
    if (!user) return next(new CustomError(400, "please Login again"));
  }
  socket.user = user;
  next();
});

const isAdmin = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin") return next(new CustomError(403, "You are not Authorized for this"));
  next();
});

export { isAuthenticated, isAdmin, isSocketAuth };
