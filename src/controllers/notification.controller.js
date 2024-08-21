import Notification from "../models/notification.modal.js";
import asyncHandler from "../utils/asyncHandler.js";

// create new notification function
// -------------------------------
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

// get all unread notifications action
// ----------------------
const getUnreadNotifications = asyncHandler(async (req, res, next) => {
  const { _id: userId } = req.user;
  const notifications = await Notification.find({ to: userId, read: false }).populate("from");
  res.status(200).json({
    success: true,
    data: notifications,
  });
});

export { createNotification, getUnreadNotifications };
