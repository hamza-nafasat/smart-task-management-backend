import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const commentSchema = new Schema(
    {
        task: { type: Schema.Types.ObjectId, required: true, ref: "Task" },
        user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
        parentCommentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
        content: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

const Comment = models.Comment || model("Comment", commentSchema);
export default Comment;
