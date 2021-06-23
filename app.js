const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("./database");

const app = express();
const middleware = require("./middleware");
const path = require("path");
const session = require("express-session");

app.set("view engine", "pug");
app.set("views", "views");
app.use(bodyparser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "ello mate",
    resave: true,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 },
  })
);

const server = app.listen(3000, () => {
  console.log("server is listening on port 3000");
});

const io = require("socket.io")(server, { pingTimeout: 60000 });

const loginRoute = require("./routes/loginRoutes");
const registerRoute = require("./routes/registerRoutes");
const logoutRoute = require("./routes/logoutRoutes");
const postRoute = require("./routes/postRoutes");
const profileRoute = require("./routes/profileRoutes");
const uploadRoute = require("./routes/uploadRoutes");
const searchRoute = require("./routes/searchRoutes");
const messagesRoute = require("./routes/messagesRoutes");
const notificationsRoute = require("./routes/notificationsRoutes");

//Api Routes
const postsApiRoute = require("./routes/api/posts");
const usersApiRoute = require("./routes/api/users");
const chatsApiRoute = require("./routes/api/chats");
const messagesApiRoute = require("./routes/api/messages");
const notificationsApiRoute = require("./routes/api/notifications");

app.use("/login", loginRoute);
app.use("/register", registerRoute);
app.use("/logout", logoutRoute);
app.use("/posts", middleware.requireLogin, postRoute);
app.use("/profile", middleware.requireLogin, profileRoute);
app.use("/uploads", uploadRoute);
app.use("/search", middleware.requireLogin, searchRoute);
app.use("/messages", middleware.requireLogin, messagesRoute);
app.use("/notifications", middleware.requireLogin, notificationsRoute);

app.use("/api/posts", postsApiRoute);
app.use("/api/users", usersApiRoute);
app.use("/api/chats", chatsApiRoute);
app.use("/api/messages", messagesApiRoute);
app.use("/api/notifications", notificationsApiRoute);

app.get("/", middleware.requireLogin, (req, res, next) => {
  let payload = {
    pageTitle: "Home",
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user), //do this allows us to actually access the user object in our javascript files.  See the script we created on the main layout page. Bc we assign this to a variable in the script, we can access the logged in user properties in our JS files.
  };
  res.render("home", payload);
});

// for when client side socket.io makes the connection
io.on("connection", (socket) => {
  // hear we setup an "event" called "setup" (can name it anything) for which the client can call by using "setup" to fire it.
  socket.on("setup", (userData) => {
    // join is essentially a way to create "chat rooms", and everyone is joining with their user id.
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join room", (room) => {
    socket.join(room);
  });
  socket.on("typing", (chatId) => {
    // the second "typing" event will only fire in the chatId "room"
    // shows the user is typing in chat
    socket.in(chatId).emit("typing");
  });
  socket.on("stop typing", (chatId) => {
    // shows the user stops typing
    socket.in(chatId).emit("stop typing");
  });

  socket.on("new message", (newMessage) => {
    let chat = newMessage.chat;

    if (!chat.users) return console.log("Chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessage.sender._id) return; // this is to make sure we dont send the notification to ourselves.
      socket.in(user._id).emit("message received", newMessage);
    });
  });
});
