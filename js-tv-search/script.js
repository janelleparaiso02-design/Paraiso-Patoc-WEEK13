/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — Your first API request
// (Task 1 code deleted: it ran on every save and used up requests.)

// STEP 2 — Search and show the results

// Draws the search results on the page. It clears the old cards, then loops
// through the list and builds one card button per show with its poster, title,
// years, genres and rating. Each card keeps the show's id in data-id so I can
// tell which show was clicked later.
function renderResults(items) {
  results.innerHTML = "";
  items.forEach((item) => {
    const show = item.show;
    const card = el("button", "card");
    card.type = "button";
    card.dataset.id = show.id;

    const rating = show.rating.average;
    card.append(
      createPoster(show),
      el("span", "title", show.name),
      el("span", "year", yearRange(show)),
      el("span", "genres", show.genres.join(", ")),
      el("span", "rating", rating ? `★ ${rating}` : "Not rated yet")
    );
    results.appendChild(card);
  });
}

// Runs when the search form is submitted. It stops the page reload, reads the
// text in the box and trims the spaces, ignores empty input, and starts the search.
form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(typingTimer); // cancel the waiting search, we search now
  const query = input.value.trim();
  if (query === "") return;
  searchShows(query);
});

// STEP 3 — getJSON(): one careful helper for every request

// Fetches a URL and returns the data as JavaScript. If anything goes wrong
// (no internet, too many requests, or a bad status) it throws an Error with a
// message that a user can understand.
async function getJSON(url) {
  let response;
  // fetch only rejects when the network itself fails
  try {
    response = await fetch(url);
  } catch (networkError) {
    throw new Error("Can't reach TVmaze. Check your internet, or use sample mode.");
  }

  // 429 means we sent too many requests
  if (response.status === 429) {
    throw new Error("Too many requests (429). Wait 10 seconds and try again.");
  }

  // Any other non-ok status, such as 404
  if (!response.ok) {
    throw new Error(
      USE_SAMPLE_DATA
        ? "No match, try these: friends, office, breaking bad, stranger things, sherlock, thrones, sample."
        : `Request failed (HTTP ${response.status}).`
    );
  }
  return response.json();
}

// Looks up shows by title with error handling. It shows a loading message,
// fetches with getJSON, shows a message if nothing matched, otherwise draws the
// cards and says how many were found. Errors are caught and shown in red.
async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");
  results.innerHTML = "";
  try {
    const data = await getJSON(searchURL(query));
    if (data.length === 0) {
      setStatus(`No shows found for "${query}".`, "error");
      return;
    }
    renderResults(data);
    const word = data.length === 1 ? "show" : "shows";
    setStatus(`${data.length} ${word} found for "${query}"`);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

// STEP 4 — Click a show to see its details

// Listens for clicks on the whole results area instead of on each card
// (event delegation). closest(".card") finds the card button even when the
// click lands on its poster or text. If a card was clicked, it passes the
// show's id, saved earlier in data-id, to showDetails().
results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) showDetails(card.dataset.id);
});

// STEP 5 — Cast and seasons

// Opens the details pop-up and loads three things about one show: its main
// information, its cast and its seasons. It opens the dialog right away with a
// loading message so the click feels instant. Promise.all starts all three
// requests at the same time and waits until every one has finished, so it is
// faster than asking for them one after another. If any request fails, the
// error message is shown inside the pop-up.
async function showDetails(id) {
  // replaceChildren clears the old content and puts the loading message in
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  dialog.showModal(); // opens the <dialog> on top of the page
  try {
    const start = performance.now(); // start the timer
    // The three results come back in the same order as the requests
    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id)),
    ]);
    console.log(`3 requests in ${Math.round(performance.now() - start)} ms`);
    renderDetails(show, cast, seasons);
  } catch (error) {
    console.error(error); // full error and line number in the Console
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

// Fills the pop-up with the show's large poster, title, years and status,
// genres, rating and summary, then adds a list of seasons and the first six
// cast members. Text goes in through el() and stripTags(), which use
// textContent, so nothing from the API can run as HTML.
function renderDetails(show, cast, seasons) {
  // show.rating can be missing, so check it before reading .average
  const rating = show.rating && show.rating.average;

  // One list item per season, e.g. "Season 1 · 8 episodes · 2016"
  const seasonList = el("ul", "seasons");
  seasons.forEach((season) => {
    const year = season.premiereDate ? ` · ${season.premiereDate.slice(0, 4)}` : "";
    const episodes = season.episodeOrder ? ` · ${season.episodeOrder} episodes` : "";
    seasonList.appendChild(el("li", "", `Season ${season.number}${episodes}${year}`));
  });

  // One list item per actor: the actor's name, then a span with the role.
  // slice(0, 6) keeps only the first six so the pop-up stays short.
  const list = el("ul", "cast");
  cast.slice(0, 6).forEach((member) => {
    const li = el("li", "", member.person.name + " ");
    li.append(el("span", "", "as " + member.character.name));
    list.append(li);
  });

  detailsBody.replaceChildren(
    createPoster(show, "original"), // the bigger poster size
    el("h2", "title", show.name),
    el("p", "year", `${yearRange(show)} · ${show.status}`),
    el("p", "genres", show.genres.join(", ")),
    el("p", "rating", rating ? `★ ${rating}` : "Not rated yet"),
    el("p", "summary", stripTags(show.summary)), // removes the HTML tags
    el("h3", "", "Seasons"),
    seasonList,
    el("h3", "", "Cast"),
    list
  );
}

// EXTEND — Search as you type (debounce)

// Holds the id of the waiting timer so the next keystroke can cancel it.
let typingTimer;

// Runs on every keystroke in the search box. Each keystroke cancels the
// previous timer and starts a new 500 ms one, so the search only starts after
// the user has stopped typing for half a second. Typing "friends" quickly
// therefore sends one request instead of seven.
input.addEventListener("input", () => {
  clearTimeout(typingTimer); // cancel the search that was waiting
  const query = input.value.trim();

  // An empty box clears the results instead of searching
  if (query === "") {
    results.innerHTML = "";
    setStatus("");
    return;
  }

  typingTimer = setTimeout(() => searchShows(query), 500);
});