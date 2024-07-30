import express from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controllers.js";
import { isAuthenticated } from "../middleware/auth.js";

const app = express();

app.post("/create", registerUser);
app.post("/login", loginUser);
app.get("/logout", isAuthenticated, logoutUser);

export default app;
