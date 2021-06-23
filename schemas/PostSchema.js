const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PostSchema = new Schema(
  {
    content: String,
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
    pinned: Boolean,
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    retweetUsers: [{ type: Schema.Types.ObjectId, ref: "User" }], //this will keep try of how many users retweeted the post
    retweetData: { type: Schema.Types.ObjectId, ref: "Post" },
    replyTo: { type: Schema.Types.ObjectId, ref: "Post" },
  },
  { timestamps: true }
);

let Post = mongoose.model("Post", PostSchema);

module.exports = Post;
