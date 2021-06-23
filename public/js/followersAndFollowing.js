$(document).ready(() => {
  if (selectedTab === "followers") {
    loadFollowers();
  } else {
    loadFollowing();
  }
});

const loadFollowers = () => {
  $.get(
    `/api/users/${profileUserId}/followers`,

    (results) => {
      outputUsers(results.followers, $(".resultsContainer"));
    }
  );
};

const loadFollowing = () => {
  $.get(
    `/api/users/${profileUserId}/following`,

    (results) => {
      outputUsers(results.following, $(".resultsContainer"));
    }
  );
};
