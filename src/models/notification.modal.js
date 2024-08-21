import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const notificationSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Notification = models.Notification || model("Notification", notificationSchema);
export default Notification;
