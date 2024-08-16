import mongoose from "mongoose";

const { Schema, model, models, Types } = mongoose;

const activitiesSchema = new Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    task: { type: Types.ObjectId, ref: "Task", required: true },
    user: { type: Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Activity = models.Activity || model("Activity", activitiesSchema);
export default Activity;
