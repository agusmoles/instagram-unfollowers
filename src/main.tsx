import React, { ChangeEvent, useEffect, useState } from "react";
// eslint-disable-next-line react/no-deprecated
import { render } from "react-dom";
import { ToastContainer, toast } from "react-toastify";
import {
  getCookie,
  isNewFollower,
  isNewUnfollower,
  sleep,
  unfollowUserUrlGenerator,
  urlGenerator,
} from "./utils";
import { Node, User } from "./model/user";
import "react-toastify/dist/ReactToastify.css";
import "./styles/index.css";
import { State } from "./model/app";
import {
  FILTERS,
  FILTERS_NAMES,
  INITIAL_SCANNING_STATE,
  INSTAGRAM_HOSTNAME,
} from "./constants";
import { useLocalStorage } from "./hooks/useLocalStorage";

function App() {
  const [state, setState] = useState<State>({ status: "initial" });
  const [oldResults, setOldResults] = useLocalStorage<null | Node[]>(
    "iu-old-results",
    null
  );

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.status === "initial" || state.percentage < 100) return;
      if (state.status === "scanning") {
        const oldResults = [...state.results];
        setOldResults(oldResults);
      }
      if (
        state.status === "unfollowing" &&
        state.selectedResults.length === state.unfollowLog.length
      )
        return;

      if (e) e.returnValue = "Changes you made may not be saved.";

      // For Safari
      return "Changes you made may not be saved.";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state, setOldResults]);

  const handleScan = async () => {
    if (state.status !== "initial") return;

    setState(INITIAL_SCANNING_STATE);

    const results: Node[] = [];
    let scrollCycle = 0;
    let url = urlGenerator();
    let hasNext = true;
    let currentFollowedUsersCount = 0;
    let totalFollowedUsersCount = -1;
    const toastId = toast.info("🔍 Fetching followed users...", {
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      progress: 0,
    });

    while (hasNext) {
      let receivedData: User;

      try {
        receivedData = (await fetch(url).then((res) => res.json())).data.user
          .edge_follow;
      } catch (e) {
        console.error(e);
        continue;
      }

      if (totalFollowedUsersCount === -1) {
        totalFollowedUsersCount = receivedData.count;
      }

      hasNext = receivedData.page_info.has_next_page;
      url = urlGenerator(receivedData.page_info.end_cursor);
      currentFollowedUsersCount += receivedData.edges.length;
      receivedData.edges.forEach((x) => results.push(x.node));

      setState((prevState) => {
        if (prevState.status !== "scanning") return prevState;
        const newPercentage =
          (currentFollowedUsersCount / totalFollowedUsersCount) * 100;
        const newState: State = {
          ...prevState,
          percentage: Math.floor(newPercentage),
          results,
        };

        toast.update(toastId, {
          progress: newPercentage / 100,
        });

        if (newPercentage === 100) {
          setOldResults((prevOldIUResults) => {
            if (prevOldIUResults === null) return results;
            else {
              const newUnfollowers = results.filter((result) =>
                isNewUnfollower(prevOldIUResults, result)
              );
              const newFollowers = results.filter((result) =>
                isNewFollower(prevOldIUResults, result)
              );

              if (newUnfollowers.length === 0 && newFollowers.length === 0) {
                toast.success("🤓 No new unfollowers or followers found", {
                  autoClose: false,
                });
              } else {
                toast.success(
                  `😮 Found ${newUnfollowers.length} new unfollowers and ${newFollowers.length} new followers`,
                  { autoClose: false }
                );
              }
              return prevOldIUResults;
            }
          });
        }

        return newState;
      });

      await sleep(Math.floor(Math.random() * (1000 - 600)) + 1000);

      scrollCycle++;
      if (scrollCycle > 6) {
        scrollCycle = 0;
        toast.info("😴 Sleeping 10 secs to prevent getting temp blocked", {
          autoClose: 10_000,
        });
        await sleep(10_000);
      }
    }
  };

  const handleUnfollow = async () => {
    if (state.status !== "scanning") return;

    const usersToUnfollow = [...state.selectedResults];

    if (usersToUnfollow.length === 0) return;
    const alertMessage = `⚠ Going to unfollow ${usersToUnfollow.length} users, are you sure?`;
    if (!confirm(alertMessage)) return;

    setState((prevState) => {
      if (prevState.status !== "scanning") return prevState;
      const oldResults = [...prevState.results];
      setOldResults(oldResults);

      return {
        ...prevState,
        status: "unfollowing",
        percentage: 0,
        unfollowLog: [],
        filters: undefined,
      };
    });

    const csrfToken = getCookie("csrftoken");
    if (csrfToken === null) {
      toast.error(
        "🙃 It seems you are not correctly logged in Instagram, try logging out and in again"
      );
      throw new Error("csrftoken cookie not found");
    }

    let counter = 0;
    for (const user of usersToUnfollow) {
      counter += 1;
      const percentage = Math.floor((counter / usersToUnfollow.length) * 100);
      try {
        await fetch(unfollowUserUrlGenerator(user.id), {
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "x-csrftoken": csrfToken,
          },
          method: "POST",
          mode: "cors",
          credentials: "include",
        });
        setState((prevState) => {
          if (prevState.status !== "unfollowing") return prevState;

          return {
            ...prevState,
            percentage,
            unfollowLog: [
              ...prevState.unfollowLog,
              {
                user,
                unfollowedSuccessfully: true,
              },
            ],
          };
        });
      } catch (e) {
        console.error(e);
        setState((prevState) => {
          if (prevState.status !== "unfollowing") {
            return prevState;
          }
          return {
            ...prevState,
            percentage,
            unfollowLog: [
              ...prevState.unfollowLog,
              {
                user,
                unfollowedSuccessfully: false,
              },
            ],
          };
        });
      }
      // If unfollowing the last user in the list, no reason to wait.
      if (user === usersToUnfollow.at(-1)) break;

      await sleep(Math.floor(Math.random() * (6000 - 4000)) + 4000);

      if (counter % 5 === 0) {
        toast.info("😴 Sleeping 5 minutes to prevent getting temp blocked", {
          autoClose: 300_000,
        });
        await sleep(300_000);
      }
    }

    toast.success("Unfollowed all users successfully");
  };

  const failedUnfollowed = state.unfollowLog
    ?.filter((log) => !log.unfollowedSuccessfully)
    .map(({ user }) => <li key={user.username}>{user.username}</li>);

  const successfullyUnfollowed = state.unfollowLog
    ?.filter((log) => log.unfollowedSuccessfully)
    .map(({ user }) => <li key={user.username}>{user.username}</li>);

  const showedResults = state.results?.filter((result) => {
    if (state.searchTerm) {
      return result.username.toLowerCase().includes(state.searchTerm);
    }

    if (state.filters) {
      if (state.filters.length === 0) return true;
      const showPrivate = state.filters.includes("private");
      const showVerified = state.filters.includes("verified");
      const showFollowers = state.filters.includes("followers");
      const showNonFollowers = state.filters.includes("nonFollowers");
      const showNewNonFollowers = state.filters.includes("newNonFollowers");

      if (showPrivate && result.is_private) return true;
      if (showVerified && result.is_verified) return true;
      if (showFollowers && result.follows_viewer) return true;
      if (showNonFollowers && !result.follows_viewer) return true;
      if (
        showNewNonFollowers &&
        oldResults &&
        isNewUnfollower(oldResults, result)
      )
        return true;
    }

    return false;
  });

  const handleSelectAll = () => {
    setState((prevState) => {
      if (prevState.status !== "scanning" || !showedResults) return prevState;

      if (prevState.selectedResults.length === showedResults.length) {
        return {
          ...prevState,
          selectedResults: [],
        };
      }

      return {
        ...prevState,
        selectedResults: showedResults,
      };
    });
  };

  const handleSearchTerm = (e: ChangeEvent<HTMLInputElement>) => {
    const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
    setState((prevState) => {
      if (prevState.status !== "scanning") return prevState;

      return {
        ...prevState,
        searchTerm,
      };
    });
  };

  return (
    <>
      {state.status === "initial" && (
        <section className="container">
          <button className="scan-btn" onClick={handleScan}>
            SCAN
          </button>
        </section>
      )}

      {state.status === "scanning" && (
        <section className="scanning-container">
          <h1>
            Instagram Unfollowers <small>by AgusMoles</small>
          </h1>

          <article className="info-container">
            <div className="filters">
              {FILTERS.map((filter) => (
                <label key={filter}>
                  {FILTERS_NAMES[filter]}

                  <input
                    type="checkbox"
                    checked={state.filters.includes(filter)}
                    onChange={() => {
                      setState((prevState) => {
                        if (prevState.status !== "scanning") return prevState;

                        if (prevState.filters.includes(filter)) {
                          return {
                            ...prevState,
                            filters: prevState.filters.filter(
                              (f) => f !== filter
                            ),
                          };
                        }

                        return {
                          ...prevState,
                          filters: [...prevState.filters, filter],
                        };
                      });
                    }}
                  />
                </label>
              ))}
            </div>

            <div>
              Showing {showedResults?.length} of {state.results.length} users
            </div>

            <input
              type="text"
              placeholder="Search..."
              onChange={handleSearchTerm}
            />

            <button className="select-all-btn" onClick={handleSelectAll}>
              {state.selectedResults.length === showedResults?.length
                ? "Unselect All"
                : "Select All"}
            </button>

            <button className="unfollow-btn" onClick={handleUnfollow}>
              Unfollow {state.selectedResults.length} users
            </button>
          </article>

          <article className="users-container">
            {showedResults?.map((result, index) => {
              const isUserSelected = state.selectedResults.some(
                (u) => u.username === result.username
              );

              return (
                <button
                  key={result.username}
                  className={`user-container ${
                    isUserSelected ? "selected" : ""
                  }`}
                  style={{ animationDelay: index * 0.1 + "s" }}
                  onClick={() => {
                    setState((prevState) => {
                      if (prevState.status !== "scanning") return prevState;

                      if (isUserSelected) {
                        return {
                          ...prevState,
                          selectedResults: prevState.selectedResults.filter(
                            (u) => u.username !== result.username
                          ),
                        };
                      }

                      return {
                        ...prevState,
                        selectedResults: [...prevState.selectedResults, result],
                      };
                    });
                  }}
                >
                  <div className="profile-pic">
                    <img src={result.profile_pic_url} alt={result.username} />
                  </div>
                  <div>{result.username}</div>
                </button>
              );
            })}
          </article>
        </section>
      )}

      {state.status === "unfollowing" && (
        <section className="unfollowing-container">
          <h1>
            Instagram Unfollowers <small>by AgusMoles</small>
          </h1>

          <article className="description">
            <h3>Thank you so much for using the app!</h3>

            {successfullyUnfollowed?.length !== 0 && (
              <p>
                <strong>✔ Unfollowed users:</strong>{" "}
                <ul>{successfullyUnfollowed}</ul>
              </p>
            )}

            {failedUnfollowed?.length !== 0 && (
              <p>
                <strong>❌ Failed to unfollow:</strong>{" "}
                <ul>{failedUnfollowed}</ul>
              </p>
            )}
          </article>
        </section>
      )}
      <ToastContainer />
    </>
  );
}

if (location.hostname !== INSTAGRAM_HOSTNAME) {
  alert("Can be used only on Instagram routes");
} else {
  document.title = "Instagram Unfollowers by Agus Moles";
  document.body.innerHTML = "";
  render(<App />, document.body);
}
