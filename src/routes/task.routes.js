import express from "express";
import {} from "../controllers/user.controllers.js";
import { isAuthenticated } from "../middleware/auth.js";
import {
    createTask,
    deleteSingleTask,
    getAllTasks,
    getSingleTask,
    updateSingleTask,
} from "../controllers/task.controllers.js";

const app = express();

app.post("/create", createTask);
app.route("/single/:taskId", isAuthenticated)
    .get(getSingleTask)
    .put(updateSingleTask)
    .delete(deleteSingleTask);

app.get("/all", isAuthenticated, getAllTasks);

export default app;
