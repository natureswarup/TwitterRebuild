const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
  {
    userTo: { type: Schema.Types.ObjectId, ref: "User" },
    userFrom: { type: Schema.Types.ObjectId, ref: "User" },
    notificationType: String,
    opened: { type: Boolean, default: false },
    entityId: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

// This is creating a method on the schema that we can call from anywhere
NotificationSchema.statics.insertNotification = async (
  userTo,
  userFrom,
  notificationType,
  entityId
) => {
  let data = {
    userTo: userTo,
    userFrom: userFrom,
    notificationType: notificationType,
    entityId: entityId,
  };

  // delete notification if it exists... ex) you liked a posts, unlike it, and liked it again... stops it from sending multiple notifications for same event
  await Notification.deleteOne(data).catch((error) => console.log(error));

  return Notification.create(data);
};

let Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
