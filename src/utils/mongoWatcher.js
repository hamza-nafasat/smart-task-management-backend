import mongoose from "mongoose";
import Notification from "../models/notification.modal.js";
import { emitEvent, socketEvent } from "../config/constants.js";

const notificationWatcher = () => {
  const sensorsCollection = mongoose.connection.collection("notifications");
  const changeStream = sensorsCollection.watch();
  changeStream.on("change", async (change) => {
    if (change.operationType === "insert") {
      const document = change.fullDocument;
      let toId = document?.to;
      // find all new notifications of to
      const allUnreadNotifications = await Notification.find({ to: toId, read: false }).populate("from");
      await emitEvent(socketEvent.SEND_NOTIFICATION, toId, allUnreadNotifications);
    }
  });
};

export { notificationWatcher };
