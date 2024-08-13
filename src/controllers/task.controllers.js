import { isValidObjectId } from "mongoose";
import Task from "../models/task.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import CustomError from "../utils/customError.js";
import { removeFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import Comment from "../models/comment.model.js";

// create new task
// ---------------
const createTask = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  let { title, description, startDate, endDate, assignee = [], onDay, status } = req.body;
  let attachments = req.files;

  // validation
  if (!attachments.length) return next(new CustomError(400, "No Attachments found"));
  if (assignee) {
    assignee = new Set(assignee?.split(","));
    assignee = [...assignee];
  }
  if (!title) return next(new CustomError(400, "Title is required"));
  if (!description) return next(new CustomError(400, "Description is required"));
  if (!onDay && !startDate && !endDate) {
    return next(new CustomError(400, "Start date and end date is required"));
  }
  if (assignee.length == 0) return next(new CustomError(400, "Atleast one assignee is required"));
  if (onDay) {
    startDate = null;
    endDate = null;
    status = "scheduled";
  }

  // if attachments then send them in cloudinary
  let myClouds = [];
  if (attachments.length > 0) {
    for (let i = 0; i < attachments.length; i++) {
      const myCloud = await uploadOnCloudinary(attachments[i], "tasks", "auto");
      if (!myCloud?.public_id || !myCloud?.secure_url) {
        return next(createHttpError(400, "Error While Uploading Task Attachments on Cloudinary"));
      }
      myClouds.push({
        url: myCloud.secure_url,
        public_id: myCloud.public_id,
        name: attachments[i].originalname.split("<>")[0],
        size: attachments[i].size,
      });
    }
  }

  // create task
  // -----------
  const createTaskDate = {
    title,
    description,
    creator: userId,
    assignee,
  };
  if (onDay) createTaskDate.onDay = onDay.toLowerCase();
  if (startDate) createTaskDate.startDate = startDate;
  if (endDate) createTaskDate.endDate = endDate;
  if (status) createTaskDate.status = status;
  if (myClouds.length > 0) {
    createTaskDate.attachments = myClouds;
  }
  const newTask = await Task.create(createTaskDate);
  if (!newTask) return next(new CustomError(500, "Failed to create task"));
  // add task to assignees model
  await Task.updateMany({ _id: { $in: assignee } }, { $push: { tasks: newTask._id } });
  res.status(201).json({
    success: true,
    message: "Task created successfully",
  });
});

// get single task
// --------------
const getSingleTask = asyncHandler(async (req, res, next) => {
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
  const attachments = req.files;
  console.log("attachments", attachments);
  let { title, description, startDate, endDate, assignee, onDay } = req.body;
  console.log(assignee);
  if (assignee?.length < 1) {
    return next(new CustomError(400, "Atleast one assignee is required"));
  }
  if (assignee && assignee != "removed") {
    assignee = assignee.split(",");
    assignee = new Set(assignee);
    assignee = [...assignee];
  }
  const task = await Task.findById(taskId);
  if (!task) return next(new CustomError(404, "Task not found"));
  if (String(task.creator) !== String(userId)) return next(new CustomError(403, "You are Not authorized"));
  // update fields
  if (assignee) task.assignee = assignee;
  if (title) task.title = title;
  if (description) task.description = description;
  if (onDay) {
    task.onDay = onDay.toLowerCase();
    task.startDate = null;
    task.endDate = null;
    task.status = "scheduled";
  } else if (startDate && endDate) {
    task.startDate = startDate;
    task.endDate = endDate;
    task.status = "in-progress";
    task.onDay = null;
  }

  let myClouds = [];
  if (attachments && attachments?.length > 0) {
    for (let i = 0; i < attachments.length; i++) {
      const myCloud = await uploadOnCloudinary(attachments[i], "tasks", "auto");
      if (!myCloud?.public_id || !myCloud?.secure_url) {
        return next(createHttpError(400, "Error While Uploading Task Attachments on Cloudinary"));
      }
      myClouds.push({
        url: myCloud.secure_url,
        public_id: myCloud.public_id,
        name: attachments[i].originalname.split("<>")[0],
        size: attachments[i].size,
      });
    }
  }

  task.attachments.push(...myClouds);
  const updatedTask = await task.save();

  if (!updatedTask) return next(new CustomError(500, "Failed to update task"));
  res.status(200).json({
    success: true,
    data: "Task updated successfully",
  });
});

// remove attachment from task
// ---------------------------
const removeAttachmentFromTask = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const { taskId, public_id } = req.body;
  if (!isValidObjectId(taskId)) return next(new CustomError(400, "Invalid Task Id"));
  if (!public_id) return next(new CustomError(400, "Invalid Attachment Id"));
  const task = await Task.findById(taskId);
  if (!task) return next(new CustomError(404, "Task not found"));
  if (String(task.creator) !== String(userId)) {
    return next(new CustomError(403, "You Can't remove this attachment"));
  }
  task.attachments = task.attachments.filter((attachment) => attachment.public_id !== public_id);
  // remove image from cloudinary
  await removeFromCloudinary(public_id, "auto");
  const updatedTask = await task.save();
  if (!updatedTask) return next(new CustomError(500, "Failed to update task"));
  res.status(200).json({
    success: true,
    data: "File removed successfully",
  });
});
// delete single task
// -----------------
const deleteSingleTask = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const taskId = req.params?.taskId;
  const task = await Task.findById(taskId);
  if (!task) return next(new CustomError(404, "Task not found"));
  if (String(task.creator) !== String(userId))
    return next(new CustomError(403, "You Can't delete this task"));
  const deletedTask = await Task.findByIdAndDelete(taskId);
  if (!deletedTask) return next(new CustomError(500, "Failed to delete task"));
  // delete all attachments from cloudinary
  if (task.attachments?.length > 0) {
    for (let i = 0; i < task.attachments.length; i++) {
      await removeFromCloudinary(task.attachments[i].public_id, "auto");
    }
  }
  // remove all comments of task
  await Comment.deleteMany({ task: deletedTask._id });
  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
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

export {
  createTask,
  getSingleTask,
  updateSingleTask,
  removeAttachmentFromTask,
  deleteSingleTask,
  getAllTasks,
};
