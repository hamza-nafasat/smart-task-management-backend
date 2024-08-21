import Notification from "../models/notification.modal.js";
import asyncHandler from "../utils/asyncHandler.js";
import CustomError from "../utils/customError.js";

// create new notification function
// --------------------------------
const createNotification = async (title, description, from, to) => {
  if (!title) throw new Error("Title is required");
  if (!description) throw new Error("Description is required");
  if (!from) throw new Error("From is required");
  if (!Array.isArray(to) && !to.length) {
    throw new Error("To is required and should be an array");
  }

  const notificationsPromises = to?.map(async (user) => {
    console.log("data", user, title, description, from);
    return Notification.create({
      title,
      description,
      from,
      to: user,
    });
  });

  const notifications = await Promise.all(notificationsPromises);
  if (!notifications) {
    throw new Error("Error While creating notification ");
  }
};
// get all unread notifications
// ----------------------------
const getUnreadNotifications = asyncHandler(async (req, res, next) => {
  const { _id: userId } = req.user;
  const notifications = await Notification.find({ to: userId, read: false })
    .populate("from")
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: notifications,
  });
});
// read all notifications
// ----------------------
const readAllNotifications = asyncHandler(async (req, res, next) => {
  const { _id: userId } = req.user;
  await Notification.updateMany({ to: userId, read: false }, { read: true });
  res.status(200).json({
    success: true,
    data: "Notifications read successfully",
  });
});
// get all notifications
// ----------------------
const getAllNotifications = asyncHandler(async (req, res, next) => {
  const { _id: userId } = req.user;
  const notifications = await Notification.find({ to: userId }).populate("from").sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: notifications,
  });
});
// delete notification
// ----------------------
const deleteNotification = asyncHandler(async (req, res, next) => {
  const { notificationId } = req.params;
  const notification = await Notification.findByIdAndDelete(notificationId);
  if (!notification) return next(new CustomError(404, "Notification not found"));
  res.status(200).json({
    success: true,
    message: "Notification deleted successfully",
  });
});

export {
  createNotification,
  getUnreadNotifications,
  readAllNotifications,
  getAllNotifications,
  deleteNotification,
};
