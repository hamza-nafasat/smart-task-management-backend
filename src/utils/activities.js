import Activity from "../models/activity.model.js";

const createActivity = async ({ title, type, message, task, user }) => {
  if (!title || !type || !message || !task || !user)
    throw new Error("All fields are required to create an activity");
  const activity = await Activity.create({ title, type, message, task, user });
  if (!activity) return null;
  else return activity;
};

export { createActivity };
