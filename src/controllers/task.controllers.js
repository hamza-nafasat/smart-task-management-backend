import { isValidObjectId } from "mongoose";
import Task from "../models/task.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import CustomError from "../utils/customError.js";
import { removeFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";
import { createActivity } from "../utils/activities.js";
import Activity from "../models/activity.model.js";

// create new task
// ---------------
const createTask = asyncHandler(async (req, res, next) => {
  const { _id: userId, name: userName } = req.user;
  let { title, description, startDate, endDate, assignee = [], onDay, status } = req.body;
  let attachments = req.files;

  // validation
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
  const createTaskDate = {
    title,
    description,
    creator: userId,
    creatorName: userName,
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
  // activity......................................
  const activity = await createActivity({
    title: `This Task Created by ${userName?.toUpperCase()}`,
    user: userId,
    message: `${userName.toUpperCase()} created this task.`,
    task: newTask._id,
    type: "task",
  });
  if (!activity) return next(new CustomError(500, "Failed to create activity"));
  // add task to assignees model
  await User.updateMany({ _id: { $in: assignee } }, { $push: { tasks: newTask._id } });
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
  const { _id: userId, name: userName } = req.user;
  const taskId = req.params?.taskId;
  const attachments = req.files;
  let { title, description, startDate, endDate, assignee, onDay } = req.body;
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
  let oldTask = structuredClone(task.toObject());
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

  // -----------------------
  // add activities in task
  // -----------------------
  // title
  if (title && oldTask.title != title) {
    const activity = await createActivity({
      title: `Task Title Updated by ${userName?.toUpperCase()}`,
      user: userId,
      message: `${userName.toUpperCase()} Update task title from [ ${oldTask.title.toUpperCase()} ] To [ ${title.toUpperCase()} ]`,
      task: task._id,
      type: "task",
    });
    if (!activity) return next(new CustomError(500, "Failed to create title activity"));
  }
  // description
  if (description && description != oldTask.description) {
    const activity = await createActivity({
      title: `Task Description Updated by ${userName?.toUpperCase()}`,
      user: userId,
      message: `${userName.toUpperCase()} update task description From [ ${oldTask.description.toUpperCase()} ] To [ ${description.toUpperCase()} ]`,
      task: task._id,
      type: "task",
    });
    if (!activity) return next(new CustomError(500, "Failed to create activity"));
  }
  // assignee added
  if (assignee && typeof assignee == "object" && assignee.length > oldTask.assignee.length) {
    const newAssigneeLength = assignee.length - oldTask.assignee.length;
    const activity = await createActivity({
      title: `Task Assignee Added by ${userName?.toUpperCase()}`,
      user: userId,
      message: `${userName.toUpperCase()} add ${newAssigneeLength} new assignee `,
      task: task._id,
      type: "task",
    });
    if (!activity) return next(new CustomError(500, "Failed to create activity"));
  }
  // assignee removed
  if (assignee && typeof assignee == "object" && assignee.length < oldTask.assignee.length) {
    const removedAssigneeLength = oldTask.assignee.length - assignee.length;
    const activity = await createActivity({
      title: `Task Assignee Removed by ${userName?.toUpperCase()}`,
      user: userId,
      message: `${userName.toUpperCase()} remove ${removedAssigneeLength} assignee`,
      task: task._id,
      type: "task",
    });
    if (!activity) return next(new CustomError(500, "Failed to create activity"));
  }
  // add attachments
  if (myClouds.length > 0) {
    let attachmentsNames = myClouds.map((a) => a.name).join(", ");
    const activity = await createActivity({
      title: `Task Attachments Added by ${userName?.toUpperCase()}`,
      user: userId,
      message: `${myClouds.length} new attachments ${attachmentsNames} added in this task`,
      task: task._id,
      type: "task",
    });
    if (!activity) return next(new CustomError(500, "Failed to create activity"));
  }

  const updatedTask = await task.save();
  if (!updatedTask) return next(new CustomError(500, "Failed to update task"));
  res.status(200).json({
    success: true,
    data: "Task updated successfully",
  });
});

// Submit task status
// --------------------
const submitTask = asyncHandler(async (req, res, next) => {
  const { _id: userId, name: userName } = req.user;
  const taskId = req.params?.taskId;
  if (!isValidObjectId(taskId)) return next(new CustomError(400, "Invalid Task Id"));
  const { feedback } = req.body;
  if (!feedback) return next(new CustomError(400, "Feedback is required"));
  const task = await Task.findOne({ _id: taskId, assignee: userId });
  if (!task) return next(new CustomError(404, "Task not found"));
  if (task.status === "scheduled") {
    await createActivity({
      title: `Task Submitted by ${userName?.toUpperCase()}`,
      user: userId,
      message: `${userName.toUpperCase()} submit this task.`,
      task: task._id,
      type: "task",
    });
    return res.status(200).json({ success: true, message: "Task Submitted for Today" });
  }
  if (task.isSubmitted) return next(new CustomError(400, "Task Already Submitted"));
  task.isSubmitted = true;
  task.submittedAt = Date.now();
  // update feedback to creator
  const updateCreator = await User.findByIdAndUpdate(
    task.creator,
    { $push: { feedback: { feedback, task: task._id, from: userId } } },
    { new: true }
  );
  if (!updateCreator) return next(new CustomError(500, "Failed to update task"));
  // now update task status
  const updatedTask = await task.save();
  if (!updatedTask) return next(new CustomError(500, "Failed to update task"));
  // create activity
  const [activity1, activity2] = await Promise.all([
    createActivity({
      title: `Task Submitted by ${userName?.toUpperCase()}`,
      user: userId,
      message: `${userName.toUpperCase()} submit this task.`,
      task: task._id,
      type: "task",
    }),
    createActivity({
      title: `Feedback Sent by ${userName?.toUpperCase()} To Creator`,
      user: userId,
      message: `${userName.toUpperCase()} submitted feedback.`,
      task: task._id,
      type: "feedback",
    }),
  ]);
  if (!activity1 || !activity2) return next(new CustomError(500, "Failed to create Submit activity"));
  res.status(200).json({
    success: true,
    message: "Task submitted successfully",
  });
});
// complete task status
// --------------------

const completeTask = asyncHandler(async (req, res, next) => {
  const { _id: userId, name: userName } = req.user;
  const taskId = req.params?.taskId;
  if (!isValidObjectId(taskId)) return next(new CustomError(400, "Invalid Task Id"));
  const { feedback } = req.body;
  if (!feedback) return next(new CustomError(400, "Feedback is required"));
  const task = await Task.findOne({ _id: taskId, creator: userId });
  if (!task) return next(new CustomError(404, "Task not found"));
  if (!task.isSubmitted) return next(new CustomError(400, "Task is not yet submitted. Please submit first"));
  task.isCompleted = true;
  task.status = "completed";
  task.completedAt = Date.now();
  const updateUsers = await User.updateMany(
    { _id: { $in: task.assignee } },
    { $push: { feedback: { feedback: feedback, task: taskId, from: userId } } },
    { new: true }
  );
  const updatedTask = await task.save();
  if (!updatedTask) return next(new CustomError(500, "Failed to update task"));
  // create activity
  const [activity1, activity2] = await Promise.all([
    createActivity({
      title: `Task Completed by ${userName?.toUpperCase()}`,
      user: userId,
      message: `${userName.toUpperCase()} completed this task.`,
      task: task._id,
      type: "task",
    }),
    createActivity({
      title: `Feedback Sent by ${userName?.toUpperCase()} To All Assignees`,
      user: userId,
      message: `${userName.toUpperCase()} submitted feedback to assignee of this task.`,
      task: task._id,
      type: "feedback",
    }),
  ]);
  if (!activity1 || !activity2) return next(new CustomError(500, "Failed to create Submit activity"));
  res.status(200).json({
    success: true,
    message: "Task completed successfully",
  });
});

// remove attachment from task
// ---------------------------
const removeAttachmentFromTask = asyncHandler(async (req, res, next) => {
  const { _id: userId, name: userName } = req.user;
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
  // create activity
  const activity = await createActivity({
    title: `Attachment Removed by ${userName.toUpperCase()}`,
    user: userId,
    message: `${userName.toUpperCase()} remove one attachment from this task.`,
    task: task._id,
    type: "task",
  });
  if (!activity) return next(new CustomError(500, "Failed to create activity"));

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
  const tasks = await Task.find({ $or: [{ creator: userId }, { assignee: userId }] })
    .populate("creator assignee")
    .sort({ createdAt: -1 });
  if (!tasks) return next(new CustomError(404, "No tasks found"));
  res.status(200).json({
    success: true,
    data: tasks,
  });
});

// get single task activities
// --------------------------
const getSingleTaskActivities = asyncHandler(async (req, res, next) => {
  const taskId = req.params?.taskId;
  const activities = await Activity.find({ task: taskId }).populate("user").sort({ createdAt: -1 });
  if (!activities) return next(new CustomError(404, "No activities found"));
  res.status(200).json({
    success: true,
    data: activities,
  });
});

// filter all tasks
// ----------------
const filterAllTasks = asyncHandler(async (req, res, next) => {
  const { status, startDate, endDate, creatorName } = req.query;
  const taskFilteredData = {};
  if (status) taskFilteredData.status = status;
  if (creatorName) taskFilteredData.creatorName = { $regex: creatorName, $options: "i" };
  if (startDate) taskFilteredData.startDate = { $gte: new Date(startDate) };
  if (endDate) taskFilteredData.endDate = { $lte: new Date(endDate) };
  const tasks = await Task.find(taskFilteredData).populate("creator", "name").populate("assignee", "name");
  res.status(200).json({
    success: true,
    data: tasks,
  });
});

export {
  createTask,
  getSingleTask,
  updateSingleTask,
  submitTask,
  completeTask,
  removeAttachmentFromTask,
  deleteSingleTask,
  getAllTasks,
  getSingleTaskActivities,
  filterAllTasks,
};
