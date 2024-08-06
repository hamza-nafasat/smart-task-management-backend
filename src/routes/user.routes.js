import express from "express";
import {
  changePassword,
  firstLogin,
  getMyProfile,
  loginUser,
  logoutUser,
  registerUser,
  updateMyProfile,
} from "../controllers/user.controllers.js";
import { isAuthenticated } from "../middleware/auth.js";

const app = express();

app.post("/create", registerUser);
app.post("/login", loginUser);
app.post("/forget-password");
app.put("/reset-password");
app.get("/first-login", isAuthenticated, firstLogin);
app.get("/logout", isAuthenticated, logoutUser);
app.get("/my-profile", isAuthenticated, getMyProfile);
app.put("/change-password", isAuthenticated, changePassword);
app.put("/update-profile", isAuthenticated, updateMyProfile);

export default app;
