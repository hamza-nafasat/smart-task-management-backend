import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const taskSchema = new Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        status: { type: String, enum: ["pending", "completed"], default: "pending" },
        creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
        creatorFeedback: { type: Number },
        assignee: { type: [Schema.Types.ObjectId], ref: "User" },
        assigneeFeedback: { type: Number },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
    },
    { timestamps: true }
);

const Task = models.Task || model("Task", taskSchema);
export default Task;
