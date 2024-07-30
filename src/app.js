import express from "express";
import cookieParser from "cookie-parser";
import customErrorHandler from "./middleware/errorHandler.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

// middlewares --------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => res.send("Hello World!"));

// add routes ---------------
app.use("/api/v1/users", userRoutes);

// error handler ------------
app.use(customErrorHandler);

export { app };
