// make sure you install socket io cdn in main-layout

let connect = false;

// make the connection the server socket IO
let socket = io("http://localhost:3000");

// use emit to fire the "event" you setup on the server side
socket.emit("setup", userLoggedIn);

socket.on("connected", () => {
  connected = true;
});

socket.on("message received", (newMessage) => {
  messageReceived(newMessage);
});
