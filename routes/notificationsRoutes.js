const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const User = require("../schemas/UserSchema");
const Chat = require("../schemas/ChatSchema");
const mongoose = require("mongoose");

router.get("/", (req, res, next) => {
  let payload = {
    pageTitle: "notifications",
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };

  res.status(200).render("notificationsPage", payload);
});

module.exports = router;
