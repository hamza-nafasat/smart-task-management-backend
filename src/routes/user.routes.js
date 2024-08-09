import express from "express";
import {
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
} from "../controllers/user.controllers.js";
import { isAdmin, isAuthenticated } from "../middleware/auth.js";
import { singleUpload } from "../middleware/multer.js";

const app = express();

// register login and logout
app.post("/create", singleUpload, registerUser);
app.post("/login", loginUser);
app.get("/logout", isAuthenticated, logoutUser);

// forget reset password
app.post("/forget-password", forgetPassword);
app.put("/reset-password/:resetToken", resetPassword);

// first login and change password
app.get("/first-login", isAuthenticated, firstLogin);
app.put("/change-password", isAuthenticated, changePassword);

// get and update my profile
app
  .route("/my-profile")
  .get(isAuthenticated, getMyProfile)
  .put(isAuthenticated, singleUpload, updateMyProfile);

app.get("/all-users", isAuthenticated, getAllUsers);
// only admin routes
app
  .route("/single/:userId")
  .get(isAuthenticated, isAdmin, getSingleUser)
  .put(isAuthenticated, isAdmin, singleUpload, editUser)
  .delete(isAuthenticated, isAdmin, deleteUser);

export default app;
