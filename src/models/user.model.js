import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    image: {
      type: {
        url: String,
        public_id: String,
      },
    },
    tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    firstLogin: { type: Boolean, default: true },
    position: { type: String, default: "" },
    feedback: [
      {
        feedback: { type: String, required: true },
        from: { type: Schema.Types.ObjectId, ref: "User", required: true },
        task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
      },
    ],
  },
  { timestamps: true }
);

const User = models.User || model("User", userSchema);
export default User;
