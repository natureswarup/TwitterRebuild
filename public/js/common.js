//Global vars
let cropper;
let timer;
let selectedUsers = [];

$(document).ready(() => {
  refreshMessagesBadge();
  refreshNotificationsBadge();
});

$("#postTextarea, #replyTextarea").keyup((event) => {
  let textbox = $(event.target);
  let value = textbox.val().trim();

  let isModal = textbox.parents(".modal").length == 1;

  let submitButton = isModal ? $("#submitReplyButton") : $("#submitPostButton");

  if (submitButton.length == 0) {
    return alert("No submit button found");
  }

  if (value == "") {
    submitButton.prop("disabled", true);
    return;
  }

  submitButton.prop("disabled", false);
});

$("#submitPostButton, #submitReplyButton").click((event) => {
  let button = $(event.target);

  let isModal = button.parents(".modal").length == 1;

  let textbox = isModal ? $("#replyTextarea") : $("#postTextarea");

  let data = {
    content: textbox.val(),
  };

  if (isModal) {
    let id = button.data().id;
    if (id === null) {
      return alert("Button id is null");
    }
    data.replyTo = id;
  }

  $.post("/api/posts", data, (postData) => {
    if (postData.replyTo) {
      //if the data is a reply to post, just reload the page.
      location.reload();
    } else {
      let html = createPostHtml(postData);
      $(".postsContainer").prepend(html);
      textbox.val("");
      button.prop("disabled", true);
    }
  });
});

// to get the message you are replying to when hitting the message button
$("#replyModal").on("shown.bs.modal", function (event) {
  let button = $(event.relatedTarget);
  let postId = getPostIdFromElement(button);
  $("#submitReplyButton").data("id", postId); //this add a data-id=postID to the submit button when the modal is opened

  $.get("/api/posts/" + postId, (results) => {
    outputPosts(results.postData, $("#originalPostContainer"));
  });
});

$("#replyModal").on("hidden.bs.modal", function () {
  $("#originalPostContainer").text("");
});

$("#deletePostModal").on("shown.bs.modal", function (event) {
  let button = $(event.relatedTarget);
  let postId = getPostIdFromElement(button);
  $("#deletePostButton").data("id", postId);

  console.log($("#deletePostButton").data().id);
});

$("#deletePostButton").click(function () {
  let postId = $(this).data("id");

  $.ajax({
    url: `/api/posts/${postId}`,
    method: "DELETE",
    success: (post) => {
      location.reload();
    },
  });
});

//uploading profile photo and adding cropper in modal
$("#filePhoto").change(function () {
  if (this.files && this.files[0]) {
    let reader = new FileReader();
    reader.onload = (e) => {
      let image = document.getElementById("imagePreview");

      image.src = e.target.result;

      if (cropper !== undefined) {
        cropper.destroy();
      }

      cropper = new Cropper(image, {
        aspectRatio: 1 / 1,
        background: false,
      });
    };

    reader.readAsDataURL(this.files[0]);
  }
});

$("#coverPhoto").change(function () {
  if (this.files && this.files[0]) {
    let reader = new FileReader();
    reader.onload = (e) => {
      let image = document.getElementById("coverPreview");

      image.src = e.target.result;

      if (cropper !== undefined) {
        cropper.destroy();
      }

      cropper = new Cropper(image, {
        aspectRatio: 16 / 9,
        background: false,
      });
    };

    reader.readAsDataURL(this.files[0]);
  }
});

//click handler for photo upload
$("#imageUploadButton").click(() => {
  let canvas = cropper.getCroppedCanvas();

  if (canvas == null) {
    alert("Could not upload image.  Make sure it is an image file.");
    return;
  }

  canvas.toBlob((blob) => {
    let formData = new FormData();
    formData.append("croppedImage", blob);

    $.ajax({
      url: "/api/users/profilePicture",
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: () => location.reload(),
    });
  });
});

$("#coverPhotoButton").click(() => {
  let canvas = cropper.getCroppedCanvas();

  if (canvas == null) {
    alert("Could not upload image.  Make sure it is an image file.");
    return;
  }

  canvas.toBlob((blob) => {
    let formData = new FormData();
    formData.append("croppedImage", blob);

    $.ajax({
      url: "/api/users/coverPhoto",
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: () => location.reload(),
    });
  });
});

//adding and deleting users from group chat
$("#userSearchTextBox").keydown((event) => {
  clearTimeout(timer);
  let textbox = $(event.target);
  let value = textbox.val();

  //which is the code for the key that was pressed (it is jquery).  which of "8" represents the backspace key.
  if (value == "" && event.which == 8) {
    selectedUsers.pop();
    updateSelectedUsersHtml();
    $(".resultsContainer").html("");

    if (selectedUsers.length == 0) {
      $("#createChatButton").prop("disabled", true);
    }

    return;
  }

  timer = setTimeout(() => {
    value = textbox.val().trim();

    if (value == "") {
      $(".resultsContainer").html("");
    } else {
      searchUsers(value);
    }
  }, 1000);
});

$("#createChatButton").click(() => {
  let data = JSON.stringify(selectedUsers);

  $.post("/api/chats", { users: data }, (chat) => {
    if (!chat || !chat._id) return alert("Invalid response from server.");

    window.location.href = `/messages/${chat._id}`;
  });
});

//like button handler
$(document).on("click", ".likeButton", (event) => {
  let button = $(event.target);
  let postId = getPostIdFromElement(button);

  if (postId === undefined) return;

  $.ajax({
    url: `/api/posts/${postId}/like`,
    method: "PUT",
    success: (post) => {
      button.find("span").text(post.likes.length || "");

      if (post.likes.includes(userLoggedIn._id)) {
        button.addClass("active");
      } else {
        button.removeClass("active");
      }
    },
  });
});

// retweet button handler
$(document).on("click", ".retweetButton", (event) => {
  let button = $(event.target);
  let postId = getPostIdFromElement(button);

  if (postId === undefined) return;

  $.ajax({
    url: `/api/posts/${postId}/retweet`,
    method: "POST",
    success: (post) => {
      button.find("span").text(post.retweetUsers.length || "");

      if (post.retweetUsers.includes(userLoggedIn._id)) {
        button.addClass("active");
      } else {
        button.removeClass("active");
      }
    },
  });
});

$(document).on("click", ".post", (event) => {
  let element = $(event.target);
  let postId = getPostIdFromElement(element);

  if (postId !== undefined && !element.is("button")) {
    window.location.href = "/posts/" + postId;
  }
});

//followButton click handler
$(document).on("click", ".followButton", (event) => {
  let button = $(event.target);
  let userId = button.data().user;

  $.ajax({
    url: `/api/users/${userId}/follow`,
    method: "PUT",
    success: (data, status, xhr) => {
      if (xhr.status == 404) {
        alert("user not found");
        return;
      }

      let difference = 1;
      if (data.following && data.following.includes(userId)) {
        button.addClass("following");
        button.text("Following");
      } else {
        button.removeClass("following");
        button.text("Follow");
        difference = -1;
      }
      let followersLabel = $("#followersValue");
      if (followersLabel.length != 0) {
        let followersText = parseInt(followersLabel.text());
        followersLabel.text(followersText + difference);
      }
    },
  });
});

$(document).on("click", ".notification.active", (e) => {
  let container = $(e.target);
  let notificationId = container.data().id;

  let href = container.attr("href");
  e.preventDefault();

  let callback = () => (window.location = href);
  markNotificationsAsOpened(notificationId, callback);
});

function getPostIdFromElement(element) {
  let isRoot = element.hasClass("post");
  let rootElement = isRoot ? element : element.closest(".post"); //.closest is a jquery function
  let postId = rootElement.data().id; //.data() gives you all the data associated with the element called upon... you could have multiple data classes and it would grab all of them if you dont specifiy which one directly after

  if (postId === undefined) return alert("Post id undefined");

  return postId;
}

function createPostHtml(post, largeFont = false) {
  if (post == null) return alert("post object is null");

  let isRetweet = post.retweetData !== undefined;
  let retweetedBy = isRetweet ? post.postedBy.username : null;
  post = isRetweet ? post.retweetData : post;

  let postedBy = post.postedBy;

  if (postedBy._id === undefined) {
    return console.log("User object not populated");
  }

  let displayName = postedBy.firstName + " " + postedBy.lastName;
  let timestamp = timeDifference(new Date(), new Date(post.createdAt));

  let likeButtonActiveClass = post.likes.includes(userLoggedIn._id)
    ? "active"
    : "";

  let retweetButtonActiveClass = post.retweetUsers.includes(userLoggedIn._id)
    ? "active"
    : "";

  let largeFontClass = largeFont ? "largeFont" : "";

  let retweetText = "";
  if (isRetweet) {
    retweetText = `<span>Retweeted by <a href='/profile/${retweetedBy}'>@${retweetedBy}</a> </span>`;
  }

  let replyFlag = "";
  if (post.replyTo && post.replyTo._id) {
    if (!post.replyTo._id) {
      return alert("reply to is not populated");
    } else if (!post.replyTo.postedBy._id) {
      return alert("Posted by to is not populated");
    }
    let replyToUsername = post.replyTo.postedBy.username;
    replyFlag = `<div class='replyFlag'>
                    Replying to <a href='/profile/${replyToUsername}'>${replyToUsername}</a>
                  </div>`;
  }

  let buttons = "";
  if (post.postedBy._id == userLoggedIn._id) {
    buttons = `<button data-id="${post._id}" data-toggle='modal' data-target='#deletePostModal'><i class='fas fa-times'></i></button>`;
  }

  return `<div class='post ${largeFontClass}' data-id='${post._id}'>
            <div class='postActionContainer'>${retweetText}</div>
            <div class='mainContentContainer'>
              <div class='userImageContainer'>
                <img src='${postedBy.profilePic}'>
              </div>
              <div class='postContentContainer'>
                <div class='header'>
                  <a class='displayName' href='/profile/${
                    postedBy.username
                  }'>${displayName}</a>
                  <span class='username'>@${postedBy.username}</span>
                  <span class='date'>${timestamp}</span>
                  ${buttons}
                </div>
                ${replyFlag}
                <div class='postBody'>
                  <span>${post.content}</span>
                </div>
                <div class='postFooter'>
                  <div class='postButtonContainer'>
                    <button data-toggle='modal' data-target='#replyModal'>
                      <i class='far fa-comment'></i>
                    </button>
                  </div>
                  <div class='postButtonContainer green'>
                    <button class='retweetButton ${retweetButtonActiveClass}'>
                      <i class='fas fa-retweet'></i>
                      <span>${post.retweetUsers.length || ""}</span>
                    </button>
                  </div>
                  <div class='postButtonContainer red'>
                    <button class='likeButton ${likeButtonActiveClass}'>
                      <i class='far fa-heart'></i>
                      <span>${post.likes.length || ""}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
}

function timeDifference(current, previous) {
  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = current - previous;

  if (elapsed < msPerMinute) {
    if (elapsed / 1000 < 30) return "Just now";
    return Math.round(elapsed / 1000) + " seconds ago";
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + " minutes ago";
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + " hours ago";
  } else if (elapsed < msPerMonth) {
    return Math.round(elapsed / msPerDay) + " days ago";
  } else if (elapsed < msPerYear) {
    return Math.round(elapsed / msPerMonth) + " months ago";
  } else {
    return Math.round(elapsed / msPerYear) + " years ago";
  }
}

function outputPosts(results, container) {
  container.html("");

  if (!Array.isArray(results)) {
    results = [results];
  }

  results.forEach((result) => {
    let html = createPostHtml(result);
    container.append(html);
  });
  if (results.length === 0) {
    container.append("<span>Nothing to show</span>");
  }
}

function outputPostsWithReplies(results, container) {
  container.html("");

  if (results.replyTo !== undefined && results.replyTo._id !== undefined) {
    let html = createPostHtml(results.replyTo);
    container.append(html);
  }

  let mainPostHtml = createPostHtml(results.postData, true);
  container.append(mainPostHtml);

  results.replies.forEach((result) => {
    let html = createPostHtml(result);
    container.append(html);
  });
}

function outputUsers(results, container) {
  container.html("");
  results.forEach((result) => {
    let html = createUserHtml(result, true);
    container.append(html);
  });

  if (results.length == 0) {
    container.append("<span class='noResults'> No results found </span>");
  }
}

//for following list
function createUserHtml(userData, showFollowButton) {
  let name = userData.firstName + " " + userData.lastName;
  let isFollowing =
    userLoggedIn.following && userLoggedIn.following.includes(userData._id);
  let text = isFollowing ? "Following" : "Follow";
  let buttonClass = isFollowing ? "followButton following" : "followButton";
  let followButton = "";

  if (showFollowButton && userLoggedIn._id != userData._id) {
    followButton = `<div class='followButtonContainer'>
                        <button class='${buttonClass}' data-user='${userData._id}'>${text}</button>
                    </div>`;
  }
  return `  <div class="user">
                <div class="userImageContainer">
                    <img src=${userData.profilePic} alt="profilePic"/>
                </div>
                <div class="userDetailsContainer">
                    <div class="header">
                        <a href='/profile/${userData.username}'>${name}</a>
                        <span class="username">@${userData.username}</span>
                    </div>
                </div>
                ${followButton}
            </div>`;
}

function searchUsers(searchTerm) {
  $.get("/api/users", { search: searchTerm }, (results) => {
    outputSelectableUsers(results, $(".resultsContainer"));
  });
}

function outputSelectableUsers(results, container) {
  container.html("");
  results.forEach((result) => {
    if (
      result._id == userLoggedIn._id ||
      selectedUsers.some((u) => u._id == result._id)
    ) {
      return;
    }
    let html = createUserHtml(result, true);
    let element = $(html);
    element.click(() => userSelected(result));
    container.append(element);
  });

  if (results.length == 0) {
    container.append("<span class='noResults'> No results found </span>");
  }
}

function userSelected(user) {
  selectedUsers.push(user);
  updateSelectedUsersHtml();
  $("#userSearchTextBox").val("").focus();
  $(".resultsContainer").html("");
  $("#createChatButton").prop("disabled", false);
}

function updateSelectedUsersHtml() {
  let elements = [];

  selectedUsers.forEach((user) => {
    let name = user.firstName + " " + user.lastName;
    let userElement = $(`<span class='selectedUser'>${name}</span>`);
    elements.push(userElement);
  });

  $(".selectedUser").remove();
  $("#selectedUsers").prepend(elements);
}

function getChatName(chatData) {
  let chatName = chatData.chatName;

  if (!chatName) {
    let otherChatUsers = getOtherChatUsers(chatData.users);
    let namesArray = otherChatUsers.map(
      (user) => user.firstName + " " + user.lastName
    );
    chatName = namesArray.join(", ");
  }

  return chatName;
}

function getOtherChatUsers(users) {
  if (users.length == 1) return users;

  return users.filter((user) => {
    return user._id != userLoggedIn._id;
  });
}

function messageReceived(newMessage) {
  if ($(".chatContainer").length == 0) {
    //show popup notification
  } else {
    addChatMessageHtml(newMessage);
  }

  refreshMessagesBadge();
}

function markNotificationsAsOpened(notificationId = null, callback = null) {
  if (callback == null) {
    callback = () => location.reload();
  }

  let url =
    notificationId != null
      ? `/api/notifications/${notificationId}/markAsOpened`
      : `/api/notifications/markAsOpened`;

  $.ajax({
    url: url,
    type: "PUT",
    success: () => {
      callback();
    },
  });
}

function refreshMessagesBadge() {
  $.get("/api/chats", { unreadOnly: true }, (data) => {
    let numResults = data.length;

    if (numResults > 0) {
      $("#messagesBadge").text(numResults).addClass("active");
    } else {
      $("#messagesBadge").text("").removeClass("active");
    }
  });
}

function refreshNotificationsBadge() {
  $.get("/api/notifications", { unreadOnly: true }, (data) => {
    let numResults = data.length;

    if (numResults > 0) {
      $("#notificationBadge").text(numResults).addClass("active");
    } else {
      $("#notificationBadge").text("").removeClass("active");
    }
  });
}
