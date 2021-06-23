let timer;

$("#searchBox").keydown((e) => {
  clearTimeout(timer);
  let textbox = $(event.target);
  let value = textbox.val();
  let searchType = textbox.data().search;

  timer = setTimeout(() => {
    value = textbox.val().trim();

    if (value == "") {
      $(".resultsContainer").html("");
    } else {
      search(value, searchType);
    }
  }, 1000);
});

function search(searchTerm, searchType) {
  let url = searchType == "users" ? "/api/users" : "/api/posts";

  $.get(url, { search: searchTerm }, (results) => {
    if (searchType == "users") {
      outputUsers(results, $(".resultsContainer"));
    } else {
      outputPosts(results, $(".resultsContainer"));
    }
  });
}

// HAD TO IMPORT FUNCTIONS BECAUSE THEY ARE NOT BEING RECONIZED FROM COMMON.JS FOR SOME REASON!

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
