import bcrypt from "bcrypt";
import getenv from "../config/dotenv.js";
import User from "../models/user.model.js";
import { sendMail } from "../services/nodemailer.js";
import { sendTokens, tokenService } from "../services/tokenService.js";
import asyncHandler from "../utils/asyncHandler.js";
import { removeFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import CustomError from "../utils/customError.js";
import Task from "../models/task.model.js";
import dotenv from "../config/dotenv.js";
import { returnWelcomeMessage } from "../config/constants.js";
import XLSX from "xlsx";

// register a new user
// -------------------
const registerUser = asyncHandler(async (req, res, next) => {
  const { name, username, email, password, gender, position } = req.body;
  const image = req.file;
  if (!image) return next(new CustomError(400, "Please provide a profile image"));
  if (!name || !username || !email || !password || !gender || !position) {
    return next(new CustomError(400, "All fields are required"));
  }
  const usernameRegex = /^[a-z0-9]+$/;
  if (!usernameRegex.test(username))
    return next(new CustomError(400, "Invalid username only lowercase latter numbers are allowed"));

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

  const mail = await sendMail(
    email,
    "Welcome To Smart Task",
    returnWelcomeMessage(name, dotenv("FRONTEND_URL")),
    true
  );
  if (!mail) {
    await removeFromCloudinary(myCloud.public_id);
    return next(new CustomError(400, "Email is Not Correct please try again"));
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

// register users from excel file
// ------------------------------
const registerUsersFromExcelFile = asyncHandler(async (req, res, next) => {
  const file = req.file;
  if (!file) return next(new CustomError(400, "Please provide a file"));
  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const usersToInsert = [];
  const existingUsers = [];
  const errors = [];
  const emailErrors = []; // Store emails with errors
  const successfulEmails = []; // Store successful email responses

  const hashPassword = await bcrypt.hash("12345678", 10);

  for (const row of worksheet) {
    // Check if all required fields are present
    if (!row.name || !row.username || !row.email || !row.gender || !row.position) {
      errors.push(`Missing fields in row: ${JSON.stringify(row)}`);
      continue;
    }

    // Validate username
    const usernameRegex = /^[a-z0-9]+$/;
    if (!usernameRegex.test(row.username)) {
      errors.push(`Invalid username in row: ${JSON.stringify(row)}`);
      continue;
    }

    // Check if the username or email already exists in the database
    const existingUser = await User.findOne({
      $or: [{ username: row.username }, { email: row.email }],
    });

    if (existingUser) {
      existingUsers.push(existingUser);
      continue;
    }

    // Prepare user object for insertion
    usersToInsert.push({
      name: row.name,
      username: row.username,
      email: row.email,
      gender: row.gender?.toLowerCase(),
      position: row.position,
      password: hashPassword,
    });

    // Send email to the user
    const emailSent = await sendMail(
      row.email,
      "Welcome!",
      returnWelcomeMessage(row.name, dotenv("FRONTEND_URL"))
    );

    if (!emailSent) {
      emailErrors.push(`Failed to send email to ${row.email}`);
    } else {
      successfulEmails.push(row.email);
    }
  }

  // Insert valid users into the database
  const insertedUsers = await User.insertMany(usersToInsert);
  const message = `Successfully inserted ${insertedUsers.length || 0} users. ${
    existingUsers.length || 0
  } users already exist.`;
  if (emailErrors.length > 0)
    message += ` ${emailErrors.length} emails failed to send. bcz thy are not valid.`;

  // Send success response
  res.status(200).json({
    success: true,
    message: message,
    insertedUsersCount: insertedUsers.length,
    existingUsersCount: existingUsers.length,
    emailErrors,
  });
});

//  get all users
// ---------------
const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find().select("-password").populate("tasks").sort({ createdAt: -1 });
  const modifiedUsers = users.map((user) => {
    let feedbackArr = user.feedback?.map((feed) => Number(feed?.feedback));
    let averageRating = feedbackArr?.reduce((a, b) => a + b, 0) / feedbackArr?.length;
    let rating = Math.min(averageRating, 5.0).toFixed(1);
    return {
      ...user.toObject(),
      inProgressTasks: user.tasks.filter((task) => task.status == "in-progress").length || 0,
      completedTasks: user.tasks.filter((task) => task.status == "completed").length || 0,
      scheduledTasks: user.tasks.filter((task) => task.status == "scheduled").length || 0,
      rating,
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
  const deletedUser = await User.findByIdAndDelete(userId);
  if (!deletedUser) return next(new CustomError(404, "User not found"));
  // remove user image if exist
  if (user?.image?.public_id) {
    await removeFromCloudinary(user.image.public_id, "auto");
  }
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
    const remove = await removeFromCloudinary(user?.image?.public_id);
    if (!remove) console.log("Error while removing image from cloudinary");
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
  const user = await User.findById(userId).select("-password").populate({
    path: "feedback.task",
  });
  if (!user) return next(new CustomError(404, "User not found"));
  let feedbackArr = [];
  user.feedback?.forEach((feed) => {
    if (feed?.task?.status) feedbackArr.push(feed?.feedback);
  });
  const maxRating = 5;
  const totalRatings = feedbackArr.length;
  const maxPossibleSum = maxRating * totalRatings;
  const efficiency = (feedbackArr?.reduce((a, b) => a + b, 0) / maxPossibleSum) * 100;
  let modifiedUser = {
    ...user._doc,
    efficiency: isNaN(efficiency) ? 0 : Number(efficiency),
  };
  res.status(200).json({
    success: true,
    data: modifiedUser,
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
    message: "Profile Updated SuccessFully",
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

// single user extra details
// -------------------------
const getSingleUserExtraDetails = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select("-password").populate("tasks").populate({
    path: "feedback.task",
    select: "status",
  });
  if (!user) return next(new CustomError(404, "User not found"));
  let feedbackArr = [];
  user.feedback?.forEach((feed) => {
    if (feed?.task?.status) {
      feedbackArr.push(Number(feed?.feedback));
    }
  });
  let averageRating = feedbackArr?.reduce((a, b) => a + b, 0) / feedbackArr?.length;
  // making rating of user ===++==++==
  let rating = Math.min(averageRating, 5.0).toFixed(1);
  if (isNaN(rating)) rating = 0.0;
  // checking that how much 1 and how much 2 in this feedback array ===++==++==
  const groupedArrays = feedbackArr.reduce((acc, val) => {
    if (!acc[val]) {
      acc[val] = [];
    }
    acc[val].push(val);
    return acc;
  }, {});
  const result = Object.values(groupedArrays);
  // finding efficiency of rating ===++==++==
  const maxRating = 5;
  const totalRatings = feedbackArr.length;
  const maxPossibleSum = maxRating * totalRatings;
  const efficiency = (feedbackArr?.reduce((a, b) => a + b, 0) / maxPossibleSum) * 100;

  // chart data ===++==++==

  const inProgressTasksFeedBackArray = [];
  const completedTasksFeedBackArray = [];
  const scheduledTasksFeedBackArray = [];
  user.feedback?.forEach((feed) => {
    if (feed?.task?.status === "in-progress") {
      inProgressTasksFeedBackArray.push(feed?.feedback);
    } else if (feed?.task?.status === "completed") {
      completedTasksFeedBackArray.push(feed?.feedback);
    } else if (feed?.task?.status === "scheduled") {
      scheduledTasksFeedBackArray.push(feed?.feedback);
    }
  });

  // Total number of accurate feedback items
  const totalFeedbackCount = feedbackArr.length;

  // Calculate the number of feedbacks for each status
  const inProgressCount = inProgressTasksFeedBackArray.length;
  const completedCount = completedTasksFeedBackArray.length;
  const scheduledCount = scheduledTasksFeedBackArray.length;

  // Calculate the percentage for each status
  const inProgressPercentage = (inProgressCount / totalFeedbackCount) * 100;
  const completedPercentage = (completedCount / totalFeedbackCount) * 100;
  const scheduledPercentage = (scheduledCount / totalFeedbackCount) * 100;

  const chartData = [
    { label: "Completed", value: isNaN(completedPercentage) ? 0 : completedPercentage.toFixed(1) },
    { label: "In Progress", value: isNaN(inProgressPercentage) ? 0 : inProgressPercentage.toFixed(1) },
    { label: "Schedule", value: isNaN(scheduledPercentage) ? 0 : scheduledPercentage.toFixed(1) },
  ];

  // find all tasks where this user is assignee or creator
  const tasksOfUser = await Task.find({ $or: [{ creator: userId }, { assignee: userId }] }).populate({
    path: "creator",
    select: "name",
  });

  const modifiedTasksOfUser = tasksOfUser.map((task) => {
    return {
      ...task._doc,
      creator: task.creator?.name,
      rattingForMe:
        user?.feedback?.find((feed) => String(feed?.task?._id) === String(task?._id))?.feedback || "Not Yet",
    };
  });

  let userWithRating = {
    ...user._doc,
    rating,
    rattingArrays: result,
    ratingEfficiency: isNaN(efficiency) ? 0 : efficiency.toFixed(1),
    chartData,
    tasks: modifiedTasksOfUser,
  };
  res.status(200).json({ success: true, data: userWithRating });
});

export {
  changePassword,
  deleteUser,
  editUser,
  firstLogin,
  forgetPassword,
  getAllUsers,
  getMyProfile,
  getSingleUser,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateMyProfile,
  getSingleUserExtraDetails,
  registerUsersFromExcelFile,
};
