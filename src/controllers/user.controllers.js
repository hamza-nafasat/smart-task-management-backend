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
    let [uniqueUsername, isUniqueEmail] = await Promise.all([
        User.exists({ username }),
        User.exists({ email }),
    ]);
    if (uniqueUsername) return next(new CustomError(400, "Username already exists"));
    if (isUniqueEmail) return next(new CustomError(400, "Email already exists"));
    // hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword, gender, position, username });
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

// first login done
// ----------------
const firstLogin = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    const updatedUser = User.findByIdAndUpdate(userId, { firstLogin: true }, { new: true });
    if (!updatedUser) return next(new CustomError(500, "Failed to update user"));
    res.status(200).json({
        success: true,
        message: "First Login Done",
    });
});

// logout user
// -----------
const logoutUser = asyncHandler(async (req, res, next) => {
    res.clearCookie(getenv("ACCESS_TOKEN_NAME"));
    res.clearCookie(getenv("REFRESH_TOKEN_NAME"));
    res.status(200).json({
        success: true,
        message: "Logged Out Successfully",
    });
});

// get my profile
// -------------
const getMyProfile = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    const user = await User.findById(userId).select("-password");
    if (!user) return next(new CustomError(404, "User not found"));
    res.status(200).json({
        success: true,
        data: user,
    });
});

// update my profile
// ----------------
const updateMyProfile = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    const { name, username, password, gender, position } = req.body;
    if (!name && !username && !email && !password && !gender && !position) {
        return next(new CustomError(400, "Please provide at least one field"));
    }
    let isUsernameExist;
    let isEmailExist;
    let hashedPassword;
    if (username) isUsernameExist = await User.exists({ username });
    if (isUsernameExist) return next(new CustomError(400, "Please Enter a Unique Username"));
    if (password) hashedPassword = await bcrypt.hash(password, 10);
    // find the user and update fields
    const user = await User.findById(userId).select("+password");
    if (!user) return next(new CustomError(404, "User not found"));
    if (name) user.name = name;
    if (username) user.username = username;
    if (password) user.password = hashedPassword;
    if (gender) user.gender = gender;
    if (position) user.position = position;
    const updatedUser = await user.save();
    if (!updatedUser) return next(new CustomError(500, "Failed to update user"));
    res.status(200).json({
        success: true,
        data: updatedUser,
    });
});

// change password
// ---------------
const changePassword = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return next(new CustomError(400, "Please provide old and new password"));
    }
    const user = await User.findById(userId).select("+password");
    if (!user) return next(new CustomError(404, "User not found"));
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return next(new CustomError(400, "Invalid old password"));
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    const updatedUser = await user.save();
    if (!updatedUser) return next(new CustomError(500, "Failed to update user"));
    res.status(200).json({
        success: true,
        message: "Password Changed Successfully",
    });
});

export { registerUser, loginUser, firstLogin, logoutUser, getMyProfile, updateMyProfile, changePassword };
