const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const User = require("../../schemas/UserSchema");
const Post = require("../../schemas/PostSchema");
const Notification = require("../../schemas/NotificationSchema");

app.use(bodyParser.urlencoded({ extended: false }));

router.get("/", async (req, res, next) => {
  let searchObj = req.query;

  if (searchObj.isReply !== undefined) {
    let isReply = searchObj.isReply == "true";
    searchObj.replyTo = { $exists: isReply }; //$exists is mongo operator
    delete searchObj.isReply;
  }
  // for searching posts... call coming from search.js
  if (searchObj.search !== undefined) {
    searchObj.content = { $regex: searchObj.search, $options: "i" };
    delete searchObj.search;
  }

  //getting only the posts from users that you are following.
  if (searchObj.followingOnly !== undefined) {
    let followingOnly = searchObj.followingOnly == "true";

    if (followingOnly) {
      let objectIds = [];

      if (!req.session.user.following) {
        req.session.user.following = [];
      }
      req.session.user.following.forEach((user) => {
        objectIds.push(user);
      });

      objectIds.push(req.session.user._id); //this will show your own posts on the newsfeed

      searchObj.postedBy = { $in: objectIds };
    }

    delete searchObj.followingOnly;
  }
  let results = await getPosts(searchObj);
  res.status(200).send(results);
});

router.get("/:id", async (req, res, next) => {
  let postId = req.params.id;
  let postData = await getPosts({ _id: postId });
  postData = postData[0];

  let results = {
    postData: postData,
  };

  if (postData.replyTo !== undefined) {
    results.replyTo = postData.replyTo;
  }

  //getting the reply posts
  results.replies = await getPosts({ replyTo: postId });

  res.status(200).send(results);
});

router.post("/", async (req, res, next) => {
  if (!req.body.content) {
    console.log("Content param not sent with request");
    return res.sendStatus(400);
  }
  let postData = {
    content: req.body.content,
    postedBy: req.session.user,
  };

  if (req.body.replyTo) {
    postData.replyTo = req.body.replyTo;
  }

  Post.create(postData)
    .then(async (newPost) => {
      newPost = await User.populate(newPost, { path: "postedBy" });
      newPost = await Post.populate(newPost, { path: "replyTo" });

      if (newPost.replyTo !== undefined) {
        await Notification.insertNotification(
          newPost.replyTo.postedBy,
          req.session.user._id,
          "reply",
          newPost._id
        );
      }

      res.status(201).send(newPost);
    })
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.put("/:id/like", async (req, res, next) => {
  let postId = req.params.id;
  let userId = req.session.user._id;

  let isLiked =
    req.session.user.likes && req.session.user.likes.includes(postId); //this checks first if the user has any likes and if it does, then it sees if it has the id of the post to see whether we will like or unlike the post.

  let option = isLiked ? "$pull" : "$addToSet";
  //*****************Insert User like*****************
  //to use the option variable inside the mongoose function, you need use square brackets
  // we are setting the query req.sess.user so it saves it to the session.
  req.session.user = await User.findByIdAndUpdate(
    userId,
    {
      [option]: { likes: postId },
    },
    { new: true } //this gives back the updated item
  ).catch((error) => {
    console.log(err);
    res.sendStatus(400);
  });

  //******************Insert Post like******************
  let post = await Post.findByIdAndUpdate(
    postId,
    {
      [option]: { likes: userId },
    },
    { new: true }
  ).catch((error) => {
    console.log(err);
    res.sendStatus(400);
  });

  if (!isLiked) {
    await Notification.insertNotification(
      post.postedBy,
      req.session.user._id,
      "postLike",
      post._id
    );
  }

  res.status(200).send(post);
});

router.post("/:id/retweet", async (req, res, next) => {
  let postId = req.params.id;
  let userId = req.session.user._id;

  //Try and delete retweet
  let deletedPost = await Post.findOneAndDelete({
    postedBy: userId,
    retweetData: postId,
  }).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  let option = deletedPost != null ? "$pull" : "$addToSet";

  let repost = deletedPost;

  if (repost === null) {
    repost = await Post.create({
      postedBy: userId,
      retweetData: postId,
    }).catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
  }

  req.session.user = await User.findByIdAndUpdate(
    userId,
    {
      [option]: { retweets: repost._id },
    },
    { new: true }
  ).catch((error) => {
    console.log(err);
    res.sendStatus(400);
  });

  //*****************Insert User like*****************

  //   req.session.user = await User.findByIdAndUpdate(
  //     userId,
  //     {
  //       [option]: { likes: postId },
  //     },
  //     { new: true } //this gives back the updated item
  //   ).catch((error) => {
  //     console.log(err);
  //     res.sendStatus(400);
  //   });

  //******************Insert Post like******************
  let post = await Post.findByIdAndUpdate(
    postId,
    {
      [option]: { retweetUsers: userId },
    },
    { new: true }
  ).catch((error) => {
    console.log(err);
    res.sendStatus(400);
  });

  if (!deletedPost) {
    await Notification.insertNotification(
      post.postedBy,
      req.session.user._id,
      "retweet",
      post._id
    );
  }

  res.status(200).send(post);
});

router.delete("/:id", (req, res, next) => {
  Post.findByIdAndDelete(req.params.id)
    .then(() => res.sendStatus(202))
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

async function getPosts(filter) {
  let results = await Post.find(filter)
    .populate("postedBy") //this fills in the User info
    .populate("retweetData")
    .populate("replyTo")
    .sort({ createdAt: -1 }) //this makes the posts appear in reverse order
    .catch((error) => {
      console.log(error);
    });
  results = await User.populate(results, { path: "replyTo.postedBy" });
  return await User.populate(results, { path: "retweetData.postedBy" });
}

module.exports = router;
