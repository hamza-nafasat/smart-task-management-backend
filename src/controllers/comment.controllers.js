import { isValidObjectId } from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import Comment from "../models/comment.model.js";
import Task from "../models/task.model.js";
import { createActivity } from "../utils/activities.js";

// create new comment
// ------------------
const createComment = asyncHandler(async (req, res, next) => {
  const { _id: userId, name: userName } = req.user;
  const { content, taskId } = req.body;

  if (!content || !isValidObjectId(taskId)) {
    return next(new CustomError(400, "Invalid Content Or TaskId"));
  }

  const newComment = await Comment.create({
    content,
    user: userId,
    task: taskId,
  });
  if (!newComment) return next(new CustomError(500, "Failed to create comment"));

  const task = await Task.findById(taskId);
  task.commentsCount = task.commentsCount ? task.commentsCount + 1 : 1;
  await task.save();

  // add activity
  const activity = await createActivity({
    title: "New Comment Added",
    user: userId,
    message: `${userName.toUpperCase()} added one comment [${content}] to this task.`,
    task: taskId,
    type: "comment",
  });
  if (!activity) return next(new CustomError(500, "Failed to create activity"));

  res.status(201).json({
    success: true,
    data: "Comment created successfully",
  });
});
// update comment
// --------------
const updateComment = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const commentId = req.params?.commentId;
  const { content } = req.body;

  if (!content || !isValidObjectId(commentId)) {
    return next(new CustomError(400, "Invalid Content or CommentId"));
  }

  const comment = await Comment.findById(commentId);
  if (!comment) return next(new CustomError(404, "Comment not found"));
  if (String(comment.user) !== String(userId)) {
    return next(new CustomError(403, "You are Not authorized to update this comment"));
  }

  const updatedComment = await Comment.findByIdAndUpdate(commentId, { content }, { new: true });
  if (!updatedComment) return next(new CustomError(500, "Failed to update comment"));
  res.status(200).json({
    success: true,
    data: "Comment updated successfully",
  });
});
// delete comment
// --------------
const deleteComment = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const commentId = req.params?.commentId;
  if (!isValidObjectId(commentId)) return next(new CustomError(400, "Invalid CommentId"));

  const comment = await Comment.findById(commentId);
  if (!comment) return next(new CustomError(404, "Comment not found"));
  if (String(comment.user) !== String(userId)) {
    return next(new CustomError(403, "You are Not authorized to delete this comment"));
  }
  await Comment.findByIdAndDelete(commentId, { new: true });

  res.status(200).json({
    success: true,
    data: "Comment deleted successfully",
  });
});
// get all Comments
// ------------------
const getAllComments = asyncHandler(async (req, res, next) => {
  const taskId = req.params?.taskId;
  const comments = await Comment.find({ task: taskId, parentCommentId: null })
    .populate("user")
    .populate("task");
  if (!comments) return next(new CustomError(404, "No comments found"));
  res.status(200).json({
    success: true,
    data: comments,
  });
});

// create comment reply
// -------------------------
const createCommentReply = asyncHandler(async (req, res, next) => {
  const { _id: userId, name: userName } = req.user;
  const { content, commentId } = req.body;
  if (!content || !isValidObjectId(commentId)) {
    return next(new CustomError(400, "Invalid Content or CommentId"));
  }
  // check comment exists
  const comment = await Comment.findById(commentId);
  if (!comment) return next(new CustomError(404, "Comment not found"));
  // create reply
  const newComment = await Comment.create({
    content,
    task: comment.task,
    user: userId,
    parentCommentId: comment._id,
  });
  if (!newComment) return next(new CustomError(500, "Failed to Add Reply"));
  // add activity
  const activity = await createActivity({
    title: "New Reply Added",
    user: userId,
    message: `${userName.toUpperCase()} add one reply [ ${content} ] to this comment [ ${comment.content} ].`,
    task: comment.task,
    type: "comment",
  });
  if (!activity) return next(new CustomError(500, "Failed to create activity"));
  res.status(201).json({
    success: true,
    data: "Reply Added successfully",
  });
});
// update comment reply
// ----------------------
const updateCommentReply = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const commentId = req.params?.commentId;
  const { content } = req.body;
  if (!content || !isValidObjectId(commentId)) {
    return next(new CustomError(400, "Invalid Content or CommentId"));
  }

  const comment = await Comment.find(commentId);
  if (!comment) return next(new CustomError(404, "Comment not found"));
  if (String(comment.user) !== String(userId)) {
    return next(new CustomError(403, "You are Not authorized to update this comment"));
  }

  const updatedComment = await Comment.findByIdAndUpdate(commentId, { content }, { new: true });
  if (!updatedComment) return next(new CustomError(500, "Failed to update comment"));
  res.status(200).json({
    success: true,
    data: "Reply updated successfully",
  });
});
// delete comment reply
// --------------------
const deleteCommentReply = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const commentId = req.params?.commentId;
  if (!isValidObjectId(commentId)) return next(new CustomError(400, "Invalid CommentId"));
  const comment = await Comment.findById(commentId);
  if (!comment) return next(new CustomError(404, "Comment not found"));
  if (String(comment.user) !== String(userId)) {
    return next(new CustomError(403, "You are Not authorized to delete this comment"));
  }
  await Comment.findByIdAndDelete(commentId, { new: true });

  res.status(200).json({
    success: true,
    data: "Reply deleted successfully",
  });
});

// get all replies of comment
// -------------------------
const getCommentReplies = asyncHandler(async (req, res, next) => {
  const commentId = req.params?.commentId;
  const replies = await Comment.find({ parentCommentId: commentId }).populate("user").populate("task");
  if (!replies) return next(new CustomError(404, "No replies found"));
  res.status(200).json({
    success: true,
    data: replies,
  });
});

export {
  createComment,
  updateComment,
  deleteComment,
  getAllComments,
  createCommentReply,
  updateCommentReply,
  deleteCommentReply,
  getCommentReplies,
};
