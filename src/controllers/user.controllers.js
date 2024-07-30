import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import CustomError from "../utils/customError.js";
import { sendTokens } from "../services/tokenService.js";
import getenv from "../config/dotenv.js";

// register a new user
// -------------------
const registerUser = asyncHandler(async (req, res, next) => {
    const { name, username, email, password, gender, position } = req.body;
    if (!name || !username || !email || !password || !gender || !position) {
        return next(new CustomError(400, "All fields are required"));
    }
    const newUser = await User.create({ name, email, password, gender, position, username });
    if (!newUser) return next(new CustomError(500, "Failed to create user"));
    await sendTokens(res, newUser, 201, "User Created Successfully");
});

// login user
// ---------
const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new CustomError(400, "Please provide email and password"));
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) return next(new CustomError(404, "User not found"));
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(new CustomError(400, "Invalid credentials"));
    await sendTokens(res, user, 201, "User Created Successfully");
});

// logout user
// -----------
const logoutUser = asyncHandler(async (req, res, next) => {
    console.log("req.user", req.user);
    res.clearCookie(getenv("ACCESS_TOKEN_NAME"));
    res.clearCookie(getenv("REFRESH_TOKEN_NAME"));
    res.status(200).json({
        success: true,
        message: "Logged Out Successfully",
    });
});
export { registerUser, loginUser, logoutUser };
