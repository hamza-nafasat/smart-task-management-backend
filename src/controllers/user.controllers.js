import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import CustomError from "../utils/customError.js";
import { sendTokens, tokenService } from "../services/tokenService.js";
import getenv from "../config/dotenv.js";
import { removeFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendMail } from "../services/nodemailer.js";
import mongoose, { isValidObjectId, Schema } from "mongoose";

// register a new user
// -------------------
const registerUser = asyncHandler(async (req, res, next) => {
  const { name, username, email, password, gender, position } = req.body;
  const image = req.file;
  if (!image) return next(new CustomError(400, "Please provide a profile image"));
  if (!name || !username || !email || !password || !gender || !position) {
    return next(new CustomError(400, "All fields are required"));
  }

  // check that username and email are unique
  let [uniqueUsername, isUniqueEmail] = await Promise.all([
    User.exists({ username }),
    User.exists({ email }),
  ]);
  if (uniqueUsername) return next(new CustomError(400, "Username already exists"));
  if (isUniqueEmail) return next(new CustomError(400, "Email already exists"));

  // hash password and create user
  const hashedPassword = await bcrypt.hash(password, 10);

  // upload image on cloudinary then create user
  const myCloud = await uploadOnCloudinary(image, "users", "image");
  if (!myCloud?.public_id || !myCloud?.secure_url) {
    return next(createHttpError(400, "Error While Uploading User Image on Cloudinary"));
  }
  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    gender,
    position,
    username,
    image: {
      url: myCloud.secure_url,
      public_id: myCloud.public_id,
    },
  });
  if (!newUser) return next(new CustomError(500, "Failed to create user"));
  res.status(201).json({
    success: true,
    message: "User created successfully",
  });
});

//  get all users
// ---------------
const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find().select("-password").populate("tasks");
  const modifiedUsers = users.map((user) => {
    return {
      ...user.toObject(),
      inProgressTasks: user.tasks.filter((task) => task.status == "in-progress").length || 0,
      completedTasks: user.tasks.filter((task) => task.status == "completed").length || 0,
      scheduledTasks: user.tasks.filter((task) => task.status == "pending").length || 0,
    };
  });

  res.status(200).json({
    success: true,
    data: modifiedUsers,
  });
});

// delete user
// -----------
const deleteUser = asyncHandler(async (req, res, next) => {
  const myId = req.user._id;
  const userId = req.params.userId;
  if (String(userId) === String(myId)) {
    return next(new CustomError(400, "You can't delete yourself"));
  }
  const user = await User.findById(userId);
  if (!user) return next(new CustomError(404, "User not found"));
  if (String(user._id) === "66b4bbff049ce7259b05fa75") {
    return next(new CustomError(400, "Don't delete Me I Am Working On Backend"));
  }
  if (String(user._id == "66b5c37dd27be1d293b82d6c")) {
    return next(new CustomError(400, "Don't delete Me I Am Working On Frontend"));
  }
  const deletedUser = await User.findByIdAndDelete(userId);
  if (!deletedUser) return next(new CustomError(404, "User not found"));
  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

// Edit user
// ----------------
const editUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;
  const file = req.file;
  const { name, username, email, password, gender, position, role } = req.body;
  if (!name && !username && !email && !password && !gender && !position && !file && !role) {
    return next(new CustomError(400, "Please provide at least one field"));
  }
  let isUsernameExist;
  let isEmailExist;
  let hashedPassword;
  if (username) isUsernameExist = await User.exists({ username });
  if (email) isEmailExist = await User.exists({ email });
  if (isEmailExist) return next(new CustomError(400, "Please Enter a Unique Email"));
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
  if (role) user.role = role;
  if (file) {
    const remove = await removeFromCloudinary(user.image.public_id);
    if (!remove) {
      console.log("Error while removing image from cloudinary");
    }
    const myCloud = await uploadOnCloudinary(file, "users", "image");
    if (!myCloud?.public_id || !myCloud?.secure_url) {
      return next(createHttpError(400, "Error While Uploading User Image on Cloudinary"));
    }
    user.image = {
      url: myCloud.secure_url,
      public_id: myCloud.public_id,
    };
  }
  const updatedUser = await user.save();
  if (!updatedUser) return next(new CustomError(500, "Failed to update user"));
  res.status(200).json({
    success: true,
    data: updatedUser,
    message: "User updated successfully",
  });
});

// get Single user
// ----------------
const getSingleUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;
  const user = await User.findById(userId).select("-password");
  if (!user) return next(new CustomError(404, "User not found"));
  res.status(200).json({
    success: true,
    data: user,
  });
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
  await sendTokens(res, user, 200, "You Logged In Successfully");
});

// first login done
// ----------------
const firstLogin = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const user = await User.findById(userId);
  if (!user) return next(new CustomError(404, "User not found"));
  user.firstLogin = false;
  const updatedUser = await user.save();
  console.log("update user", updatedUser);
  if (!updatedUser) return next(new CustomError(500, "Failed to update user"));
  res.status(200).json({
    success: true,
    message: "First Login Done",
  });
});

// logout user
// -----------
const logoutUser = asyncHandler(async (req, res, next) => {
  const options = {
    httpOnly: true,
    sameSite: getenv("NODE_ENV") !== "development" ? "none" : "lax",
    secure: getenv("NODE_ENV") !== "development",
  };
  res.cookie(getenv("ACCESS_TOKEN_NAME"), null, {
    ...options,
    maxAge: Date.now(),
  });
  res.cookie(getenv("REFRESH_TOKEN_NAME"), null, {
    ...options,
    maxAge: Date.now(),
  });
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
  const file = req.file;
  const { name, username, email, password, gender, position } = req.body;
  if (!name && !username && !email && !password && !gender && !position && !file) {
    return next(new CustomError(400, "Please provide at least one field"));
  }
  let isUsernameExist;
  let isEmailExist;
  let hashedPassword;
  if (username) isUsernameExist = await User.exists({ username });
  if (isUsernameExist) return next(new CustomError(400, "Please Enter a Unique Username"));
  if (email) isEmailExist = await User.exists({ email });
  if (isEmailExist) return next(new CustomError(400, "Please Enter a Unique Email"));
  if (password) hashedPassword = await bcrypt.hash(password, 10);
  // find the user and update fields
  const user = await User.findById(userId).select("+password");
  if (!user) return next(new CustomError(404, "User not found"));
  if (name) user.name = name;
  if (username) user.username = username;
  if (password) user.password = hashedPassword;
  if (gender) user.gender = gender;
  if (position) user.position = position;
  if (file) {
    const remove = await removeFromCloudinary(user.image.public_id);
    if (!remove) {
      console.log("Error while removing image from cloudinary");
    }
    const myCloud = await uploadOnCloudinary(file, "users", "image");
    if (!myCloud?.public_id || !myCloud?.secure_url) {
      return next(createHttpError(400, "Error While Uploading User Image on Cloudinary"));
    }
    user.image = {
      url: myCloud.secure_url,
      public_id: myCloud.public_id,
    };
  }
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

// forget password
// ---------------
const forgetPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new CustomError(400, "Please Provide Email"));
  // find user
  const user = await User.findOne({ email });
  if (!user) return next(new CustomError(404, "Please Provide Correct Email"));
  // send mail
  const resetPasswordUrl = getenv("FRONTEND_URL") + "/reset-password";
  const resetToken = await tokenService().getAccessToken(user._id);
  const message = `Your Reset Password Link: ${resetPasswordUrl}/${resetToken}`;
  const isMailSent = await sendMail(email, "Reset Password", message);
  if (!isMailSent) return next(new CustomError(500, "Some Error Occurred While Sending Mail"));
  res.status(200).json({
    success: true,
    message: "Reset Password url sent to your email",
  });
});

// reset password
// ---------------
const resetPassword = asyncHandler(async (req, res, next) => {
  const resetToken = req.params.resetToken;
  const { newPassword } = req.body;
  if (!resetToken || !newPassword) return next(new CustomError(400, "Token and New Password are required"));
  let verifiedToken;
  try {
    verifiedToken = await tokenService().verifyAccessToken(resetToken);
    if (!verifiedToken) return next(new CustomError(400, "Invalid or Expired Token"));
  } catch (err) {
    return next(new CustomError(400, "Invalid or Expired Token"));
  }
  const user = await User.findById(verifiedToken).select("+password");
  if (!user) return next(new CustomError(404, "Invalid or Expired Token"));
  const hashPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashPassword;
  await user.save();
  res.status(200).json({ success: true, message: "Password Reset Successfully" });
});

export {
  registerUser,
  deleteUser,
  editUser,
  getSingleUser,
  loginUser,
  firstLogin,
  logoutUser,
  getAllUsers,
  getMyProfile,
  updateMyProfile,
  changePassword,
  forgetPassword,
  resetPassword,
};
