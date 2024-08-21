import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import morgan from "morgan";
import { Server } from "socket.io";
import customErrorHandler from "./middleware/errorHandler.js";
import taskRoutes from "./routes/task.routes.js";
import userRoutes from "./routes/user.routes.js";
import { isSocketAuth } from "./middleware/auth.js";
import { liveSockets } from "./config/constants.js";

const app = express();

// middlewares --------------
app.use(morgan("dev"));

let corsOptions = {
  credentials: true,
  origin: ["http://localhost:5173", "https://smart-task-management-frontend.vercel.app"],
};

app.use(cors(corsOptions));

const server = createServer(app);
const io = new Server(server, { cors: corsOptions });
app.set("io", io);
io.use(async (socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await isSocketAuth(err, socket, next);
  });
});

io.on("connection", (socket) => {
  console.log(" Socket connected successfully");
  liveSockets.set(String(socket.user?._id), socket.id);
  console.log("liveSockets", liveSockets);

  socket.on("disconnect", () => {
    console.log("disconnected");
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => res.send("Hello World!"));

// add routes ---------------
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/tasks", taskRoutes);

// error handler ------------
app.use(customErrorHandler);

export { app, io, server };
