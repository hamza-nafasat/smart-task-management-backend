import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["in-progress", "completed", "scheduled"], default: "in-progress" },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignee: { type: [Schema.Types.ObjectId], ref: "User" },
    attachments: {
      type: [
        {
          public_id: String,
          url: String,
          name: String,
          size: Number,
        },
      ],
    },
    onDay: {
      type: String,
      enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      default: null,
    },
    startDate: { type: Date, default: null },
    commentsCount: { type: Number, default: 0 },
    isSubmitted: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const Task = models.Task || model("Task", taskSchema);
export default Task;
