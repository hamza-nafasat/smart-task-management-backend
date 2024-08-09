import { isValidObjectId } from "mongoose";
import Task from "../models/task.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import CustomError from "../utils/customError.js";

// create new task
// ---------------
const createTask = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const { title, description, startDate, endDate, assignee = [], attachments = [] } = req.body;

  if (!title || !description || !startDate || !endDate)
    return next(new CustomError(400, "All fields are required"));
  if (assignee.length == 0) return next(new CustomError(400, "Atleast one assignee is required"));

  const newTask = await Task.create({
    title,
    description,
    startDate,
    endDate,
    creator: userId,
    assignee,
  });

  // add task to users tasks
  await Task.updateMany({ _id: { $in: assignee } }, { $push: { tasks: newTask._id } });

  if (!newTask) return next(new CustomError(500, "Failed to create task"));
  res.status(201).json({
    success: true,
    data: "Task created successfully",
  });
});

// get single task
// --------------
const getSingleTask = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const taskId = req.params?.taskId;
  const task = await Task.findById(taskId).populate("creator assignee");
  if (!task) return next(new CustomError(404, "Task not found"));
  res.status(200).json({
    success: true,
    data: task,
  });
});

// update single task
// -----------------
const updateSingleTask = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const taskId = req.params?.taskId;
  const { title, description, startDate, endDate, assignee = [] } = req.body;
  const task = await Task.findById(taskId);
  if (!task) return next(new CustomError(404, "Task not found"));
  if (task.creator.toString() !== userId) return next(new CustomError(403, "You are Not Not authorized"));
  const updatedTask = await Task.findByIdAndUpdate(
    taskId,
    { title, description, startDate, endDate, assignee },
    { new: true }
  );
  if (!updatedTask) return next(new CustomError(500, "Failed to update task"));
  res.status(200).json({
    success: true,
    data: "Task updated successfully",
  });
});

// delete single task
// -----------------
const deleteSingleTask = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const taskId = req.params?.taskId;
  const task = await Task.findById(taskId);
  if (!task) return next(new CustomError(404, "Task not found"));
  if (task.creator.toString() !== userId) return next(new CustomError(403, "You are Not Not authorized"));
  const deletedTask = await Task.findByIdAndDelete(taskId);
  if (!deletedTask) return next(new CustomError(500, "Failed to delete task"));
  res.status(200).json({
    success: true,
    data: "Task deleted successfully",
  });
});

// get all tasks
// -------------
const getAllTasks = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const tasks = await Task.find({ $or: [{ creator: userId }, { assignee: userId }] }).populate(
    "creator assignee"
  );
  if (!tasks) return next(new CustomError(404, "No tasks found"));
  res.status(200).json({
    success: true,
    data: tasks,
  });
});

// send feedBack to task assignee
// ------------------------------
const sendFeedBackToAssignee = asyncHandler(async (req, res, next) => {
  const { taskId, userId, feedback } = req.body;
  if (!isValidObjectId(taskId) || !isValidObjectId(userId))
    return next(new CustomError(400, "Invalid TaskId or UserId"));
  if (!feedback) return next(new CustomError(400, "Feedback is required"));

  const [task, assignee] = await Promise.all([Task.findById(taskId), User.findById(userId)]);
  if (!task) return next(new CustomError(404, "Task not found"));
  if (!assignee) return next(new CustomError(404, "Assignee not found"));
  const isUserExistInAssignee = task.assignee.Some((id) => String(id) === String(userId));
  if (!isUserExistInAssignee) return next(new CustomError(400, "User is not assigned to this task"));
  // add feedback in assignee modal
  assignee.rattingAsAssignee.push(feedback);
  await assignee.save();
  if (!updatedTask) return next(new CustomError(500, "Failed to send feedback"));
  res.status(200).json({
    success: true,
    data: `Feedback sent successfully to assignee ${assignee.name}`,
  });
});

export { createTask, getSingleTask, updateSingleTask, deleteSingleTask, getAllTasks };
