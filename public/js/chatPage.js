let typing = false;
let lastTypingTime;

// Load the Chat Title on the Message Page
$(document).ready(() => {
  socket.emit("join room", chatId);
  socket.on("typing", () => {
    $(".typingDots").show();
  });
  socket.on("stop typing", () => {
    $(".typingDots").hide();
  });

  $.get(`/api/chats/${chatId}`, (data) => {
    $("#chatName").text(getChatName(data));
  });

  $.get(`/api/chats/${chatId}/messages`, (data) => {
    let messages = [];
    let lastSenderId = "";

    data.forEach((message, index) => {
      lastSenderId = message.sender._id;
      let html = createMessageHtml(message, data[index + 1], lastSenderId);
      messages.push(html);
    });

    let messagesHtml = messages.join("");
    addMessagesHtmlToPage(messagesHtml);
    scrollToBottom(false);

    $(".loadingSpinnerContainer").remove();
    $(".chatContainer").css("visibility", "visible");
  });
});

function addMessagesHtmlToPage(html) {
  $(".chatMessages").append(html);
}

// Update the Chat Title from Message Page
$("#chatNameButton").click(() => {
  let name = $("#chatNameTextbox").val().trim();

  $.ajax({
    url: "/api/chats/" + chatId,
    type: "PUT",
    data: { chatName: name },
    success: (data, status, xhr) => {
      if (xhr.status != 204) {
        alert("could not update");
      } else {
        location.reload();
      }
    },
  });
});

// sending messages
$(".sendMessageButton").click(() => {
  messageSubmitted();
});

// when user is typing
$(".inputTextbox").keydown((event) => {
  updateTyping();

  // check if "enter" key is pressed
  if (event.which === 13) {
    messageSubmitted();
    return false; // return false stops the default action of when the enter key is pressed
  }
});

function updateTyping() {
  if (!connected) return;

  if (!typing) {
    typing = true;
    socket.emit("typing", chatId);
  }

  lastTypingTime = new Date().getTime();
  let timerLength = 3000;

  setTimeout(() => {
    let timeNow = new Date().getTime();
    let timeDiff = timeNow - lastTypingTime;

    if (timeDiff > timerLength && typing) {
      socket.emit("stop typing", chatId);
      typing = false;
    }
  }, timerLength);
}

function messageSubmitted() {
  let content = $(".inputTextbox").val().trim();
  if (content != "") {
    sendMessage(content);
    $(".inputTextbox").val("");
    socket.emit("stop typing", chatId);
    typing = false;
  }
}

function sendMessage(content) {
  $.post(
    "/api/messages",
    { content: content, chatId: chatId },
    (data, status, xhr) => {
      // if we receive any other code other than created, we do not continue
      if (xhr.status != 201) {
        alert("Could not send message");
        $(".inputTextbox").val(content);
        return;
      }

      addChatMessageHtml(data);

      if (connected) {
        socket.emit("new message", data);
      }
    }
  );
}

function addChatMessageHtml(message) {
  if (!message || !message._id) {
    alert("Message is not valid");
    return;
  }

  let messageDiv = createMessageHtml(message, null, "");

  addMessagesHtmlToPage(messageDiv);
  scrollToBottom(true);
}

function createMessageHtml(message, nextMessage, lastSenderId) {
  let sender = message.sender;
  let senderName = sender.firstName + " " + sender.lastName;

  let currentSenderId = sender._id;
  let nextSenderId = nextMessage != null ? nextMessage.sender._id : "";

  let isFirst = lastSenderId != currentSenderId;
  let isLast = nextSenderId != currentSenderId;

  // to figure out if the message is yours are not
  let isMine = message.sender._id == userLoggedIn._id;
  let liClassName = isMine ? "mine" : "theirs";

  let nameElement = "";

  if (isFirst) {
    liClassName += " first";

    if (!isMine) {
      nameElement = `<span class='senderName'>${senderName}</span>`;
    }
  }

  //If message is the last one in the chain, attach a profile Image

  let profileImage = "";
  if (isLast) {
    liClassName += " last";
    profileImage = `<img src="${sender.profilePic}" alt=""/>`;
  }

  let imageContainer = "";
  if (!isMine) {
    imageContainer = `<div class="imageContainer">
          ${profileImage}
        </div>`;
  }

  return `<li class="message ${liClassName}">
            ${imageContainer}
            <div class="messageContainer">
                
                ${nameElement}
                <span class="messageBody">
                    ${message.content}
                </span>
            </div>
        </li>`;
}

// determine whether to animate a scroll if you sent a message
function scrollToBottom(animated) {
  let container = $(".chatMessages");
  let scrollHeight = container[0].scrollHeight;

  if (animated) {
    container.animate({ scrollTop: scrollHeight }, "slow");
  } else {
    container.scrollTop(scrollHeight);
  }
}
