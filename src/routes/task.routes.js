import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import {
  completeTask,
  createTask,
  deleteSingleTask,
  getAllTasks,
  getSingleTask,
  removeAttachmentFromTask,
  submitTask,
  updateSingleTask,
} from "../controllers/task.controllers.js";
import {
  createComment,
  createCommentReply,
  deleteComment,
  deleteCommentReply,
  getAllComments,
  getCommentReplies,
  updateComment,
  updateCommentReply,
} from "../controllers/comment.controllers.js";
import { multipleUpload } from "../middleware/multer.js";

const app = express();

// create get update and delete task
app.post("/create", multipleUpload, isAuthenticated, createTask);
app
  .route("/single/:taskId")
  .get(isAuthenticated, getSingleTask)
  .put(isAuthenticated, multipleUpload, updateSingleTask)
  .delete(isAuthenticated, deleteSingleTask);

app.put("/remove-attachment", isAuthenticated, removeAttachmentFromTask);

// complete and submit task
app.put("/complete-task/:taskId", isAuthenticated, completeTask);

app.put("/submit-task/:taskId", isAuthenticated, submitTask);

//   get all tasks
app.get("/all", isAuthenticated, getAllTasks);

// add comment on task
app.post("/add-comment/create", isAuthenticated, createComment);

// get update and delete comment from task
app.route("/comment/:commentId", isAuthenticated).put(updateComment).delete(deleteComment);

// get all comment of task
app.get("/comments/all/:taskId", isAuthenticated, getAllComments);

// add reply on comment
app.post("/add-reply/create", isAuthenticated, createCommentReply);

// get update and delete reply from comment
app
  .route("/reply/:replyId")
  .put(isAuthenticated, updateCommentReply)
  .delete(isAuthenticated, deleteCommentReply);

// get all replies of comment
app.get("/replies/all/:commentId", isAuthenticated, getCommentReplies);

export default app;
