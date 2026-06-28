// ============================================================
// script.js  -  MOVIX  Movie Website
// ============================================================
// BEGINNER'S GUIDE TO THIS FILE
// ============================================================
// This file makes the movie website work. It does four jobs:
//   1. Talks to the OMDB movie database on the internet (API)
//   2. Shows movies on the screen (rendering)
//   3. Saves your favorites and history (localStorage)
//   4. Handles clicks, typing, scrolling (events)
//
// Read through the numbered sections top-to-bottom.
// Every concept is explained in plain English above the code.
//
// QUICK GUIDE: const vs let
//   const  = the variable CANNOT be reassigned after creation.
//            Use this for values that should NEVER change.
//            e.g.  const PI = 3.14;   // PI is always 3.14
//   let    = the variable CAN be reassigned later.
//            Use this for values that will change over time.
//            e.g.  let score = 0;   score = score + 10;
//   NOTE: With const objects/arrays, the CONTENTS can still
//         change - only the variable itself cannot be replaced.
// ============================================================


// ============================================================
// SECTION 1 - API SETTINGS
// ============================================================
// These two lines tell our app WHERE to get movie data from
// and give our "password" (API key) so the server lets us in.

const API_KEY = "4d22a530";
const API_URL = "https://www.omdbapi.com/";


// ============================================================
// SECTION 2 - APP STATE  (the app's memory / notepad)
// ============================================================
// Think of this like a notepad. Whenever something changes
// (like the user searching for a movie) we write it down here
// so other parts of the code can read it later.

const appState = {
  currentPage:   1,         // Which page of results we are on
  totalResults:  0,         // How many movies the database found
  totalPages:    0,         // How many pages those results fill
  pageSize:      10,        // Movies shown per page (OMDB gives 10)
  currentQuery:  "",        // The words typed in the search box
  movies:        [],        // The list of movies from the search
  sortMode:      "default", // How movies are sorted (year, title...)
  favorites:     [],        // Movies saved to the watchlist
  recent:        [],        // Movies the user has viewed recently
};


// ============================================================
// SECTION 3 - API CACHE  (avoid asking the same thing twice)
// ============================================================
// If the user searches "Marvel" twice, we return the saved
// answer instead of calling the internet again. Much faster!
//
// A Map is like a dictionary: key = URL, value = the answer.

const apiCache = new Map();


// ============================================================
// SECTION 4 - DOM ELEMENT SHORTCUTS
// ============================================================
// "DOM" means the HTML elements visible on the page.
// Instead of writing document.getElementById("search-input")
// every single time, we save shortcuts here like sticky notes.

const elems = {
  // --- Navigation bar ---
  navbar:        document.querySelector(".navbar"),
  hamburger:     document.getElementById("hamburger"),
  mobileMenu:    document.getElementById("mobile-menu"),
  themeToggle:   document.getElementById("theme-toggle"),
  themeIcon:     document.getElementById("theme-icon"),
  openFavDrawer: document.getElementById("open-fav-drawer"),
  favBadge:      document.getElementById("fav-badge"),

  // --- Background visuals ---
  bgCanvas:      document.getElementById("bg-canvas"),
  spotlightGlow: document.getElementById("spotlight-glow"),
  cursorGlow:    document.getElementById("cursor-glow"),

  // --- Search area ---
  searchInput:     document.getElementById("search-input"),
  searchBtn:       document.getElementById("search-btn"),
  voiceSearch:     document.getElementById("voice-search"),
  suggestions:     document.getElementById("search-suggestions"),
  suggestionsList: document.getElementById("suggestions-list"),
  clearSugBtn:     document.getElementById("clear-suggestions-btn"),
  quickTags:       document.querySelectorAll(".quick-tag"),

  // --- Results area ---
  resultsSection: document.getElementById("results-section"),
  resultsTitle:   document.getElementById("results-title"),
  resultsCount:   document.getElementById("results-count"),
  movieGrid:      document.getElementById("movie-grid"),
  pagination:     document.getElementById("pagination"),
  sortSelect:     document.getElementById("sort-select"),
  emptyState:     document.getElementById("empty-state"),

  // --- Dashboard carousels (horizontal scroll rows) ---
  trendingCarousel: document.getElementById("trending-carousel"),
  popularCarousel:  document.getElementById("popular-carousel"),
  recentCarousel:   document.getElementById("recent-carousel"),
  favoritesGrid:    document.getElementById("favorites-grid"),
  emptyFavorites:   document.getElementById("empty-favorites"),
  clearFavBtn:      document.getElementById("clear-favorites-btn"),
  favCountBadge:    document.getElementById("fav-count-badge"),

  // --- History section ---
  historySection:  document.getElementById("history-section"),
  historyList:     document.getElementById("history-list"),
  emptyHistory:    document.getElementById("empty-history"),
  clearHistoryBtn: document.getElementById("clear-history-btn"),

  // --- Watchlist side drawer ---
  favoritesDrawer: document.getElementById("favorites-drawer"),
  closeFavDrawer:  document.getElementById("close-fav-drawer"),
  favoritesList:   document.getElementById("favorites-list"),

  // --- Movie details popup (modal) ---
  modalOverlay:   document.getElementById("modal-overlay"),
  modalClose:     document.getElementById("modal-close"),
  modalPoster:    document.getElementById("modal-poster"),
  modalTitle:     document.getElementById("modal-title"),
  modalYear:      document.getElementById("meta-year"),
  modalRated:     document.getElementById("meta-rated"),
  modalRuntime:   document.getElementById("meta-runtime"),
  modalRating:    document.getElementById("modal-rating-value"),
  modalGenres:    document.getElementById("modal-genres"),
  modalPlot:      document.getElementById("modal-plot"),
  modalDirector:  document.getElementById("modal-director"),
  modalActors:    document.getElementById("modal-actors"),
  modalFavBtn:    document.getElementById("modal-fav-btn"),
  modalFavIcon:   document.getElementById("modal-fav-icon"),
  modalIMDBLink:  document.getElementById("modal-imdb-link"),

  // --- Loading / error / utility ---
  loadingState:   document.getElementById("loading-state"),
  errorState:     document.getElementById("error-state"),
  errorMsg:       document.getElementById("error-message"),
  retryBtn:       document.getElementById("retry-btn"),
  toastContainer: document.getElementById("toast-container"),
  backToTop:      document.getElementById("back-to-top"),
};


// ============================================================
// SECTION 5 - LOCAL STORAGE HELPERS
// ============================================================
// localStorage is a tiny notebook inside the browser.
// It survives page refreshes and closing the tab.
//
// storageGet(key, fallback)  - reads from the notebook
// storageSet(key, value)     - writes to the notebook
//
// Data must be turned into text to save (JSON.stringify),
// and turned back into objects to use (JSON.parse).

function storageGet(key, fallback) {
  try {
    let savedText = localStorage.getItem(key);  // Read the raw text
    if (savedText) {
      return JSON.parse(savedText);  // Convert text back to real data
    }
    return fallback;  // Nothing saved yet - return the default value
  } catch (error) {
    console.warn("Could not read localStorage key: " + key, error);
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    let textToSave = JSON.stringify(value);  // Convert data to text
    localStorage.setItem(key, textToSave);  // Save it
  } catch (error) {
    console.warn("Could not write localStorage key: " + key, error);
  }
}


// ============================================================
// SECTION 6 - TOAST NOTIFICATIONS  (pop-up messages)
// ============================================================
// A "toast" pops up at the corner of the screen for 3 seconds.
// type = "info" (blue), "success" (green), or "error" (red)

function showToast(message, type) {
  if (!type) {
    type = "info";  // Use blue by default
  }

  // Create a new <div> for the toast box
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.innerHTML = "<span>" + message + "</span>";

  // Add it to the page so it appears
  elems.toastContainer.appendChild(toast);

  // After 3 seconds start fading it out
  setTimeout(function () {
    toast.classList.add("toast-fadeout");

    // After the fade animation (400ms) remove it completely
    setTimeout(function () {
      toast.remove();
    }, 400);
  }, 3000);
}


// ============================================================
// SECTION 7 - CURSOR GLOW  (smooth glowing circle)
// ============================================================
// We track two positions:
//   targetMouseX/Y = where the mouse IS right now
//   mouseX/Y       = where the glow IS (slightly behind)
//
// Each frame, the glow moves 12% closer to the mouse.
// This is called "lerp" and makes the movement feel smooth.

let mouseX = -1000;
let mouseY = -1000;
const targetMouseX = -1000;
const targetMouseY = -1000;

// Every time the mouse moves, update the TARGET position
window.addEventListener("mousemove", function (event) {
  targetMouseX = event.clientX;
  targetMouseY = event.clientY;
});

// This function runs 60 times per second
function lerpCursor() {
  let distanceX = targetMouseX - mouseX;
  let distanceY = targetMouseY - mouseY;

  // Move 12% of the remaining gap - creates the smooth trailing
  mouseX = mouseX + distanceX * 0.12;
  mouseY = mouseY + distanceY * 0.12;

  if (elems.cursorGlow) {
    // translate3d uses the GPU - faster than changing left/top
    elems.cursorGlow.style.transform = "translate3d(" + mouseX + "px, " + mouseY + "px, 0)";
  }

  if (elems.spotlightGlow && targetMouseX > 0 && targetMouseY > 0) {
    elems.spotlightGlow.style.setProperty("--mouse-x", mouseX + "px");
    elems.spotlightGlow.style.setProperty("--mouse-y", mouseY + "px");
  }

  // Call this function again on the very next animation frame
  requestAnimationFrame(lerpCursor);
}


// ============================================================
// SECTION 8 - FLOATING PARTICLES
// ============================================================
// A <canvas> is like a blank drawing paper in HTML.
// We draw many tiny dots (particles), move them each frame,
// and redraw the canvas - that creates the animation.

function initParticles() {
  const canvas = elems.bgCanvas;
  if (!canvas) return;  // No canvas element? Stop here.

  const ctx = canvas.getContext("2d");  // Our drawing pen
  const particles = [];                 // Array to store all dots

  // Resize the canvas to fill the window
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Create ONE particle with random starting values
  function createParticle() {
    return {
      x:      Math.random() * canvas.width,   // Random X position
      y:      Math.random() * canvas.height,  // Random Y position
      vx:     (Math.random() - 0.5) * 0.15,  // Horizontal speed (can be negative)
      vy:     (Math.random() - 0.5) * 0.15,  // Vertical speed
      radius: Math.random() * 1.5 + 0.5,     // Dot size
      alpha:  Math.random() * 0.5 + 0.1,     // Transparency (0=invisible 1=solid)
    };
  }

  // Move one particle for one frame
  function updateParticle(p) {
    p.x += p.vx;  // Move left or right
    p.y += p.vy;  // Move up or down

    // Bounce off the edges
    if (p.x < 0 || p.x > canvas.width)  p.vx = p.vx * -1;
    if (p.y < 0 || p.y > canvas.height) p.vy = p.vy * -1;

    // If within 180px of the mouse, pull the particle toward it
    if (targetMouseX > 0 && targetMouseY > 0) {
      let dx   = targetMouseX - p.x;
      let dy   = targetMouseY - p.y;
      let dist = Math.sqrt(dx * dx + dy * dy);  // Distance formula

      if (dist < 180) {
        p.x += (dx / dist) * 0.3;
        p.y += (dy / dist) * 0.3;
      }
    }
  }

  // Draw one particle on the canvas
  function drawParticle(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(6, 182, 212, " + p.alpha + ")";
    ctx.fill();
  }

  // Create enough particles to fill the screen (max 60)
  const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 25000));
  for (let i = 0; i < count; i++) {
    particles.push(createParticle());
  }

  // Animation loop - runs every frame automatically
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Wipe canvas

    for (let i = 0; i < particles.length; i++) {
      updateParticle(particles[i]);
      drawParticle(particles[i]);
    }

    requestAnimationFrame(animate);  // Ask browser to call animate() again
  }

  animate();  // Start the loop
}


// ============================================================
// SECTION 9 - RIPPLE CLICK EFFECT
// ============================================================
// When you click a button with class "btn-ripple", a small
// expanding circle animates outward from where you clicked.

function attachRippleEffect() {
  document.addEventListener("click", function (event) {
    // Check if the clicked element (or any parent) is a ripple button
    const target = event.target.closest(".btn-ripple");
    if (!target) return;  // Not a ripple button - ignore

    // Find WHERE on the button was clicked
    const rect   = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Create the circle element
    const ripple = document.createElement("span");
    ripple.className = "ripple-span";
    ripple.style.left = clickX + "px";
    ripple.style.top  = clickY + "px";

    target.appendChild(ripple);

    // Remove it after the animation is done (600ms)
    setTimeout(function () {
      ripple.remove();
    }, 600);
  });
}


// ============================================================
// SECTION 10 - MAGNETIC BUTTON EFFECT
// ============================================================
// Buttons with "btn-magnetic" class nudge slightly toward the
// cursor when hovered, making the UI feel interactive.

function initMagneticButtons() {
  const buttons = document.querySelectorAll(".btn-magnetic");

  for (let i = 0; i < buttons.length; i++) {
    // IIFE gives each button its own isolated scope
    (function (btn) {
      let rect = null;

      btn.addEventListener("mouseenter", function () {
        rect = btn.getBoundingClientRect();
      });

      btn.addEventListener("mousemove", function (event) {
        if (!rect) return;

        const centerX   = rect.left + rect.width  / 2;
        const centerY   = rect.top  + rect.height / 2;
        let distanceX = event.clientX - centerX;
        let distanceY = event.clientY - centerY;

        // Move 25% of the distance toward the cursor
        btn.style.transform = "translate(" + distanceX * 0.25 + "px, " + distanceY * 0.25 + "px)";
      });

      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";  // Snap back
        rect = null;
      });
    })(buttons[i]);
  }
}


// ============================================================
// SECTION 11 - 3D CARD TILT EFFECT
// ============================================================
// Movie cards tilt in 3D when you move your mouse over them.
// This function attaches those event listeners to ONE card.

function attachCardTilt(card) {
  let rect = null;

  card.addEventListener("mouseenter", function () {
    rect = card.getBoundingClientRect();
  });

  card.addEventListener("mousemove", function (event) {
    if (!rect) return;

    const cardWidth  = rect.width;
    const cardHeight = rect.height;

    // Mouse position relative to the centre of the card
    let x = event.clientX - rect.left  - cardWidth  / 2;
    let y = event.clientY - rect.top   - cardHeight / 2;

    // Convert to tilt angles (max 10 degrees in each direction)
    const angleX = -(y / (cardHeight / 2)) * 10;
    const angleY =  (x / (cardWidth  / 2)) * 10;

    card.style.transform = "rotateY(" + angleY + "deg) rotateX(" + angleX + "deg) scale(1.03) translateY(-8px)";
  });

  card.addEventListener("mouseleave", function () {
    card.style.transform = "";  // Reset back to flat
    rect = null;
  });
}


// ============================================================
// SECTION 12 - VOICE SEARCH
// ============================================================
// Modern browsers can listen to your microphone using the
// built-in Web Speech API. Clicking the mic button starts
// listening and puts the recognised text into the search box.

function initVoiceSearch() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    // Browser does not support it - show an error message if clicked
    elems.voiceSearch.addEventListener("click", function () {
      showToast("Voice search not supported. Try Chrome or Edge.", "error");
    });
    return;  // Stop - no point setting up the rest
  }

  const recognition = new SpeechRecognition();
  recognition.lang           = "en-US";  // Listen for English
  recognition.interimResults = false;    // Only give the final result

  recognition.onstart = function () {
    elems.voiceSearch.classList.add("recording");
    elems.searchInput.placeholder = "Listening...";
    showToast("Voice search active. Speak a movie title!", "success");
  };

  recognition.onerror = function (error) {
    console.error("Voice error:", error);
    showToast("Voice capture failed. Please try again.", "error");
  };

  recognition.onend = function () {
    elems.voiceSearch.classList.remove("recording");
    elems.searchInput.placeholder = "Enter movie, TV show, or series title...";
  };

  recognition.onresult = function (event) {
    const spokenText = event.results[0][0].transcript;  // Words the mic heard
    elems.searchInput.value = spokenText;
    performSearch(spokenText);
  };

  elems.voiceSearch.addEventListener("click", function () {
    if (elems.voiceSearch.classList.contains("recording")) {
      recognition.stop();   // Already recording - stop
    } else {
      recognition.start();  // Not recording - start
    }
  });
}


// ============================================================
// SECTION 13 - API CALLS  (talking to the movie database)
// ============================================================
// The OMDB API works like a website. We give it a URL like:
//   https://www.omdbapi.com/?apikey=4d22a530&s=Marvel
// And it replies with JSON data full of movie information.
//
// "async/await" let JavaScript wait for the internet to reply
// before continuing - like pausing until a message comes back.

// Low-level helper: builds the URL, checks cache, fetches data
async function apiGet(params) {
  // Build query string from the params object
  // e.g.  { s: "Marvel", page: 1 }  ->  "s=Marvel&page=1"
  const queryParts = [];
  for (let key in params) {
    queryParts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
  }
  const queryString = queryParts.join("&");
  const fullURL     = API_URL + "?apikey=" + API_KEY + "&" + queryString;

  // Have we already asked this same question? Return the cached answer.
  if (apiCache.has(fullURL)) {
    return apiCache.get(fullURL);
  }

  // Ask the internet for the data
  const response = await fetch(fullURL);

  if (!response.ok) {
    throw new Error("Network error - could not reach the movie database.");
  }

  // Convert the raw text response into a JavaScript object
  const data = await response.json();

  // OMDB returns Response:"False" when no movie is found
  if (data.Response === "False") {
    throw new Error(data.Error || "No movies found matching that search.");
  }

  // Save the answer to cache so we do not ask again
  apiCache.set(fullURL, data);

  return data;
}

// Search for movies by keyword
async function fetchMovies(query, page) {
  if (!page) page = 1;
  return apiGet({ s: query, page: page });
}

// Get full details for ONE specific movie using its IMDB ID
async function fetchMovieDetails(imdbID) {
  return apiGet({ i: imdbID, plot: "full" });
}


// ============================================================
// SECTION 14 - SKELETON LOADING CARDS
// ============================================================
// While waiting for the API to respond, we show grey pulsing
// placeholder boxes so the user knows something is loading.

function showSkeleton(container, count) {
  if (!count) count = 8;
  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-card";
    container.appendChild(skeleton);
  }
}


// ============================================================
// SECTION 15 - CREATE A MOVIE CARD
// ============================================================
// Builds ONE card element and adds it to the given container.
// Each card has: poster image, title, year, type, heart button.

function createMovieCard(movie, container, isWatchlistCard) {
  // Outer card box
  const card = document.createElement("div");
  card.className = "movie-card";
  card.setAttribute("role", "listitem");
  card.tabIndex = 0;  // Allows keyboard focus

  // Poster image
  const poster = document.createElement("img");
  poster.className = "movie-poster";
  poster.loading   = "lazy";  // Load only when scrolled near it
  poster.alt       = movie.Title + " poster";

  if (movie.Poster && movie.Poster !== "N/A") {
    poster.src = movie.Poster;
  } else {
    poster.src = "https://images.unsplash.com/photo-1542204172-e705278817a2?auto=format&fit=crop&w=400&q=80";
  }

  // Info box with title, year, and type
  const info = document.createElement("div");
  info.className = "movie-info";

  const titleEl = document.createElement("h3");
  titleEl.className   = "movie-title";
  titleEl.textContent = movie.Title;

  const yearEl = document.createElement("span");
  yearEl.className   = "movie-year";
  yearEl.textContent = movie.Year;

  const typeEl = document.createElement("div");
  typeEl.className   = "movie-type";
  typeEl.textContent = movie.Type;

  info.appendChild(titleEl);
  info.appendChild(yearEl);
  info.appendChild(typeEl);

  // Heart (watchlist) button
  const favBtn = document.createElement("button");
  favBtn.className = "fav-toggle btn-ripple";
  favBtn.setAttribute("aria-label", "Toggle watchlist");

  // Is this movie already saved?
  let alreadyInFavs = false;
  for (let i = 0; i < appState.favorites.length; i++) {
    if (appState.favorites[i].imdbID === movie.imdbID) {
      alreadyInFavs = true;
      break;
    }
  }

  favBtn.innerHTML = alreadyInFavs ? "\u2764\uFE0F" : "\uD83E\uDD0D";  // ❤️ or 🤍
  if (alreadyInFavs) favBtn.classList.add("active");

  favBtn.addEventListener("click", function (event) {
    event.stopPropagation();  // Do not open the movie popup
    toggleFavorite(movie);

    // Update button look to match the new state
    let nowInFavs = false;
    for (let j = 0; j < appState.favorites.length; j++) {
      if (appState.favorites[j].imdbID === movie.imdbID) {
        nowInFavs = true;
        break;
      }
    }
    favBtn.classList.toggle("active", nowInFavs);
    favBtn.innerHTML = nowInFavs ? "\u2764\uFE0F" : "\uD83E\uDD0D";  // ❤️ or 🤍

    if (isWatchlistCard && !nowInFavs) {
      card.remove();  // Hide card if removed from watchlist section
    }
  });

  attachCardTilt(card);  // Add the 3D hover effect

  // Click to open full details popup
  card.addEventListener("click", function () {
    openMovieModal(movie.imdbID);
  });

  card.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      openMovieModal(movie.imdbID);
    }
  });

  // Put all pieces together
  card.appendChild(poster);
  card.appendChild(info);
  card.appendChild(favBtn);
  container.appendChild(card);
}


// ============================================================
// SECTION 16 - MOVIE DETAILS MODAL  (the big popup)
// ============================================================
// Clicking a card opens a popup with the full movie details:
// plot, cast, director, genres, IMDB rating, and more.

async function openMovieModal(imdbID) {
  elems.loadingState.classList.remove("hidden");  // Show spinner

  try {
    const data = await fetchMovieDetails(imdbID);

    // Set poster image
    if (data.Poster && data.Poster !== "N/A") {
      elems.modalPoster.src = data.Poster;
    } else {
      elems.modalPoster.src = "https://images.unsplash.com/photo-1542204172-e705278817a2?auto=format&fit=crop&w=600&q=80";
    }
    elems.modalPoster.alt = data.Title + " poster";

    // Fill in all text fields
    elems.modalTitle.textContent    = data.Title;
    elems.modalYear.textContent     = data.Year;
    elems.modalRated.textContent    = data.Rated;
    elems.modalRuntime.textContent  = data.Runtime;
    elems.modalRating.textContent   = data.imdbRating || "N/A";
    elems.modalPlot.textContent     = data.Plot || "Plot information unavailable.";
    elems.modalDirector.textContent = data.Director || "N/A";
    elems.modalActors.textContent   = data.Actors   || "N/A";
    elems.modalIMDBLink.href        = "https://www.imdb.com/title/" + imdbID;

    // Build genre chips e.g. [Action] [Drama] [Comedy]
    elems.modalGenres.innerHTML = "";
    if (data.Genre && data.Genre !== "N/A") {
      const genreList = data.Genre.split(", ");  // "Action, Drama" -> ["Action","Drama"]
      for (let i = 0; i < genreList.length; i++) {
        const chip = document.createElement("span");
        chip.className   = "genre-tag";
        chip.textContent = genreList[i];
        elems.modalGenres.appendChild(chip);
      }
    }

    // Heart button state inside the modal
    function updateModalFavBtn() {
      let inFav = false;
      for (let j = 0; j < appState.favorites.length; j++) {
        if (appState.favorites[j].imdbID === imdbID) {
          inFav = true;
          break;
        }
      }
      elems.modalFavIcon.textContent = inFav ? "\u2764\uFE0F" : "\u2661";  // ❤️ or ♡
      elems.modalFavBtn.classList.toggle("active", inFav);
    }
    updateModalFavBtn();

    elems.modalFavBtn.onclick = function () {
      toggleFavorite(data);
      updateModalFavBtn();
    };

    // Show the modal
    elems.modalOverlay.classList.remove("hidden");
    elems.modalOverlay.setAttribute("aria-hidden", "false");
    elems.modalOverlay.classList.add("active");

    addToRecent(data);  // Add to recently viewed list

  } catch (error) {
    showToast("Could not load movie details: " + error.message, "error");
  } finally {
    // Always hide the spinner - even if there was an error
    elems.loadingState.classList.add("hidden");
  }
}

function closeModal() {
  elems.modalOverlay.classList.remove("active");
  elems.modalOverlay.setAttribute("aria-hidden", "true");

  // Wait for the closing animation then hide completely
  setTimeout(function () {
    if (!elems.modalOverlay.classList.contains("active")) {
      elems.modalOverlay.classList.add("hidden");
    }
  }, 500);
}


// ============================================================
// SECTION 17 - WATCHLIST / FAVORITES
// ============================================================
// Add or remove a movie from favorites.
// The list is saved to localStorage so it survives refreshes.

function toggleFavorite(movie) {
  // Find if the movie is already in the list
  let existingIndex = -1;
  for (let i = 0; i < appState.favorites.length; i++) {
    if (appState.favorites[i].imdbID === movie.imdbID) {
      existingIndex = i;
      break;
    }
  }

  if (existingIndex >= 0) {
    // Already in favorites - remove it
    // splice(index, count) removes "count" items starting at "index"
    appState.favorites.splice(existingIndex, 1);
    showToast("Removed from watchlist.", "info");
  } else {
    // Not in favorites - add it (only save the essential fields)
    const movieToSave = {
      imdbID: movie.imdbID,
      Title:  movie.Title,
      Poster: movie.Poster,
      Year:   movie.Year,
      Type:   movie.Type,
    };
    appState.favorites.push(movieToSave);
    showToast("Added to your watchlist!", "success");
  }

  storageSet("favorites", appState.favorites);
  updateFavoritesUI();
}

function updateFavoritesUI() {
  const count = appState.favorites.length;

  // Update the badge number on the nav icon
  elems.favBadge.textContent   = count;
  elems.favBadge.style.display = count > 0 ? "flex" : "none";

  // Update the section header count badge
  if (elems.favCountBadge) {
    if (count > 0) {
      elems.favCountBadge.textContent = count + " saved";
      elems.favCountBadge.style.display = "inline-flex";
    } else {
      elems.favCountBadge.style.display = "none";
    }
  }

  // Redraw the favorites grid on the main page
  elems.favoritesGrid.innerHTML = "";
  if (count === 0) {
    elems.emptyFavorites.classList.remove("hidden");
    elems.clearFavBtn.classList.add("hidden");
  } else {
    elems.emptyFavorites.classList.add("hidden");
    elems.clearFavBtn.classList.remove("hidden");
    for (let i = 0; i < appState.favorites.length; i++) {
      createMovieCard(appState.favorites[i], elems.favoritesGrid, true);
    }
  }

  // Redraw the slide-out drawer
  elems.favoritesList.innerHTML = "";
  if (count === 0) {
    const emptyText = document.createElement("p");
    emptyText.className   = "empty-favorites-text";
    emptyText.textContent = "Your watchlist is empty. Search for a movie and tap \u2665 to add it here.";
    emptyText.style.cssText = "text-align:center;padding:2rem 1rem;";
    elems.favoritesList.appendChild(emptyText);
  } else {
    for (let j = 0; j < appState.favorites.length; j++) {
      let movie = appState.favorites[j];
      const rankNum = j + 1;  // 1-based position in the list

      const card = document.createElement("div");
      card.className = "fav-card";

      // Rank label (e.g. #1, #2)
      const rankEl = document.createElement("span");
      rankEl.className = "rank";
      rankEl.textContent = "#" + rankNum;
      card.appendChild(rankEl);

      const img = document.createElement("img");
      img.src = (movie.Poster !== "N/A") ? movie.Poster : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='100' viewBox='0 0 70 100'%3E%3Crect width='70' height='100' fill='%230f172a'/%3E%3Ctext x='35' y='54' font-family='system-ui' font-size='20' fill='%234b5563' text-anchor='middle'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E";
      img.alt = movie.Title;

      const meta = document.createElement("div");
      meta.className = "meta";

      const titleEl = document.createElement("div");
      titleEl.className   = "title";
      titleEl.textContent = movie.Title;

      const yearEl = document.createElement("div");
      yearEl.className   = "year";
      yearEl.textContent = movie.Year + (movie.Type ? " \u00B7 " + movie.Type.toUpperCase() : "");

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove btn-ripple";
      removeBtn.innerHTML = "\u274C Remove";

      // IIFE ensures each button refers to the correct movie
      (function (m) {
        removeBtn.onclick = function (event) {
          event.stopPropagation();
          toggleFavorite(m);
        };
        card.addEventListener("click", function () {
          closeFavoritesDrawer();
          openMovieModal(m.imdbID);
        });
      })(movie);

      meta.appendChild(titleEl);
      meta.appendChild(yearEl);
      meta.appendChild(removeBtn);
      card.appendChild(img);
      card.appendChild(meta);
      elems.favoritesList.appendChild(card);
    }
  }

  // Sync the heart in any open movie modal
  if (elems.modalOverlay.classList.contains("active") && elems.modalFavIcon) {
    const openTitle = elems.modalTitle.textContent;
    let isFav = false;
    for (let k = 0; k < appState.favorites.length; k++) {
      if (appState.favorites[k].Title === openTitle) { isFav = true; break; }
    }
    elems.modalFavIcon.textContent = isFav ? "\u2764\uFE0F" : "\u2661";  // ❤️ or ♡
    elems.modalFavBtn.classList.toggle("active", isFav);
  }
}

function clearFavorites() {
  if (confirm("Clear your entire watchlist?")) {
    appState.favorites = [];
    storageSet("favorites", appState.favorites);
    updateFavoritesUI();
    showToast("Watchlist cleared.", "info");
  }
}

function openFavoritesDrawer() {
  elems.favoritesDrawer.classList.add("open");
}

function closeFavoritesDrawer() {
  elems.favoritesDrawer.classList.remove("open");
}


// ============================================================
// SECTION 18 - RECENTLY VIEWED HISTORY
// ============================================================
// Every movie the user opens is added to the "recently viewed"
// list (newest first, maximum 8 items).

function addToRecent(movie) {
  // Remove if already in the list to avoid duplicates
  let filtered = [];
  for (let i = 0; i < appState.recent.length; i++) {
    if (appState.recent[i].imdbID !== movie.imdbID) {
      filtered.push(appState.recent[i]);
    }
  }

  // Add to the FRONT (most recent first)
  // unshift() adds an item to the beginning of an array
  filtered.unshift({
    imdbID: movie.imdbID,
    Title:  movie.Title,
    Poster: movie.Poster,
    Year:   movie.Year,
    Type:   movie.Type,
  });

  appState.recent = filtered.slice(0, 8);  // Keep only the 8 most recent

  storageSet("recent_history", appState.recent);
  renderRecentUI();
}

function renderRecentUI() {
  const container     = elems.recentCarousel;
  const recentSection = document.getElementById("recent");

  container.innerHTML = "";

  if (appState.recent.length === 0) {
    recentSection.classList.add("hidden");
    return;
  }

  recentSection.classList.remove("hidden");

  for (let i = 0; i < appState.recent.length; i++) {
    createMovieCard(appState.recent[i], container);
  }
}


// ============================================================
// SECTION 19 - SEARCH
// ============================================================
// The main search process:
//   1. Show skeleton cards while loading
//   2. Call the API with the search word
//   3. Render results and page buttons

async function performSearch(query, page) {
  const trimmed = query.trim();  // Remove extra spaces from the ends
  if (!trimmed) return;        // Empty search box? Do nothing.

  if (!page) page = 1;

  elems.searchInput.value = trimmed;
  appState.currentQuery   = trimmed;
  appState.currentPage    = page;

  elems.errorState.classList.add("hidden");
  elems.emptyState.classList.add("hidden");
  elems.resultsSection.classList.remove("hidden");
  showSkeleton(elems.movieGrid);

  // Smoothly scroll to the results area
  setTimeout(function () {
    elems.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);

  try {
    const data = await fetchMovies(trimmed, page);

    // parseInt converts the string "42" to the number 42
    appState.totalResults = parseInt(data.totalResults, 10);
    appState.movies       = data.Search;
    // ceil() rounds UP so e.g. 42 results / 10 per page = 5 pages
    appState.totalPages   = Math.ceil(appState.totalResults / appState.pageSize);

    saveSearchQuery(trimmed);
    renderSearchResults();

  } catch (error) {
    elems.movieGrid.innerHTML       = "";
    elems.resultsCount.textContent  = "0 results";

    if (error.message.includes("Movie not found")) {
      elems.emptyState.classList.remove("hidden");
    } else {
      elems.errorMsg.textContent = error.message;
      elems.errorState.classList.remove("hidden");  // SHOW the error panel
    }
    showToast(error.message, "error");
  }
}

function renderSearchResults() {
  const sortedMovies = sortMovies(appState.movies, elems.sortSelect.value);

  elems.movieGrid.innerHTML       = "";
  elems.resultsTitle.textContent  = "Results for \"" + appState.currentQuery + "\"";
  elems.resultsCount.textContent  = appState.totalResults + " titles";

  for (let i = 0; i < sortedMovies.length; i++) {
    createMovieCard(sortedMovies[i], elems.movieGrid);
  }

  renderPaginationControls();
}

function sortMovies(moviesList, mode) {
  const sorted = moviesList.slice();  // Copy the array first

  if (mode === "year-desc") {
    sorted.sort(function (a, b) { return parseInt(b.Year) - parseInt(a.Year); });
  } else if (mode === "year-asc") {
    sorted.sort(function (a, b) { return parseInt(a.Year) - parseInt(b.Year); });
  } else if (mode === "title-asc") {
    sorted.sort(function (a, b) { return a.Title.localeCompare(b.Title); });
  } else if (mode === "title-desc") {
    sorted.sort(function (a, b) { return b.Title.localeCompare(a.Title); });
  }

  return sorted;
}

// Build page buttons:  <- 1 2 3 ... 10 ->
function renderPaginationControls() {
  const container = elems.pagination;
  container.innerHTML = "";

  if (appState.totalPages <= 1) return;

  function makePageBtn(label, pageNumber, isActive, isDisabled) {
    const btn = document.createElement("button");
    btn.className = "page-btn btn-ripple" + (isActive ? " active" : "");
    btn.textContent = label;
    btn.disabled    = isDisabled;

    if (!isDisabled && !isActive) {
      (function (pNum) {
        btn.onclick = function () {
          performSearch(appState.currentQuery, pNum);
        };
      })(pageNumber);
    }

    return btn;
  }

  container.appendChild(makePageBtn("\u2190", appState.currentPage - 1, false, appState.currentPage === 1));

  const range = 2;
  let start = Math.max(1, appState.currentPage - range);
  let end   = Math.min(appState.totalPages, appState.currentPage + range);

  if (start > 1) {
    container.appendChild(makePageBtn("1", 1, false, false));
    if (start > 2) {
      const dots1 = document.createElement("span");
      dots1.textContent = "...";
      dots1.className   = "page-dots";
      container.appendChild(dots1);
    }
  }

  for (let i = start; i <= end; i++) {
    container.appendChild(makePageBtn(i, i, i === appState.currentPage, false));
  }

  if (end < appState.totalPages) {
    if (end < appState.totalPages - 1) {
      const dots2 = document.createElement("span");
      dots2.textContent = "...";
      dots2.className   = "page-dots";
      container.appendChild(dots2);
    }
    container.appendChild(makePageBtn(appState.totalPages, appState.totalPages, false, false));
  }

  container.appendChild(makePageBtn("\u2192", appState.currentPage + 1, false, appState.currentPage === appState.totalPages));
}


// ============================================================
// SECTION 20 - SEARCH SUGGESTIONS AND HISTORY
// ============================================================
// Past searches are saved so they appear as:
//   - A dropdown below the search box (max 5 shown)
//   - Clickable pill buttons in the history section (all 10)

function saveSearchQuery(query) {
  let queries = storageGet("recent_queries", []);

  // Remove duplicate first
  let filtered = [];
  for (let i = 0; i < queries.length; i++) {
    if (queries[i].toLowerCase() !== query.toLowerCase()) {
      filtered.push(queries[i]);
    }
  }
  filtered.unshift(query);           // Add at front
  filtered = filtered.slice(0, 10);  // Keep only 10

  storageSet("recent_queries", filtered);
  updateSuggestionsUI();
  updateSearchHistoryUI();
}

function updateSuggestionsUI() {
  let queries = storageGet("recent_queries", []);

  if (queries.length === 0) {
    elems.suggestions.classList.add("hidden");
    return;
  }

  elems.suggestionsList.innerHTML = "";

  const showCount = Math.min(queries.length, 5);
  for (let i = 0; i < showCount; i++) {
    let q  = queries[i];
    const li = document.createElement("li");
    li.className   = "suggestion-item";
    li.textContent = q;

    (function (searchTerm) {
      li.onclick = function () {
        elems.suggestions.classList.add("hidden");
        performSearch(searchTerm);
      };
    })(q);

    elems.suggestionsList.appendChild(li);
  }
}

function updateSearchHistoryUI() {
  let queries = storageGet("recent_queries", []);
  const list    = elems.historyList;
  const section = elems.historySection;
  const empty   = elems.emptyHistory;

  if (!list) return;

  list.innerHTML = "";

  if (queries.length === 0) {
    empty.classList.remove("hidden");
    section.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  section.classList.remove("hidden");

  for (let i = 0; i < queries.length; i++) {
    let q    = queries[i];
    const item = document.createElement("button");
    item.className   = "quick-tag btn-ripple";
    item.textContent = q;

    (function (searchTerm) {
      item.onclick = function () {
        performSearch(searchTerm);
      };
    })(q);

    list.appendChild(item);
  }
}

function clearSearchHistory() {
  storageSet("recent_queries", []);
  updateSuggestionsUI();
  updateSearchHistoryUI();
  showToast("Search history cleared.", "info");
}


// ============================================================
// SECTION 21 - THEME  (Dark / Light mode toggle)
// ============================================================
// The theme is stored in localStorage.
// Applying it sets data-theme on <html> and CSS does the rest.

function initTheme() {
  const savedTheme = storageGet("theme", "dark");
  applyTheme(savedTheme);

  elems.themeToggle.addEventListener("click", function () {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme    = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  elems.themeIcon.textContent = theme === "dark" ? "\uD83C\uDF19" : "\u2600\uFE0F";  // 🌙 or ☀️
  storageSet("theme", theme);
}


// ============================================================
// SECTION 22 - SCROLL EFFECTS
// ============================================================
// Two effects happen on scroll:
//   1. "Back to Top" button appears after 400px
//   2. Navbar gets a compact style after 50px

function initScrollLogic() {
  window.addEventListener("scroll", function () {
    const scrollDistance = window.scrollY;

    if (scrollDistance > 400) {
      elems.backToTop.classList.add("show");
    } else {
      elems.backToTop.classList.remove("show");
    }

    if (scrollDistance > 50) {
      elems.navbar.classList.add("scrolled");
    } else {
      elems.navbar.classList.remove("scrolled");
    }
  });

  elems.backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}


// ============================================================
// SECTION 23 - MOBILE NAVIGATION
// ============================================================
// On small screens, nav links hide behind the hamburger icon.

function initNavigation() {
  elems.hamburger.addEventListener("click", function () {
    let isExpanded = elems.hamburger.getAttribute("aria-expanded") === "true";
    elems.hamburger.setAttribute("aria-expanded", !isExpanded);
    elems.mobileMenu.classList.toggle("open", !isExpanded);
    elems.mobileMenu.setAttribute("aria-hidden", isExpanded);
  });

  function closeAllMenus() {
    elems.hamburger.setAttribute("aria-expanded", "false");
    elems.mobileMenu.classList.remove("open");
    elems.mobileMenu.setAttribute("aria-hidden", "true");
  }

  const allLinks = document.querySelectorAll(".nav-link, .mobile-nav-link");
  for (let i = 0; i < allLinks.length; i++) {
    (function (link) {
      link.addEventListener("click", function () {
        closeAllMenus();
        for (let j = 0; j < allLinks.length; j++) {
          allLinks[j].classList.remove("active");
        }
        link.classList.add("active");
      });
    })(allLinks[i]);
  }

  elems.openFavDrawer.addEventListener("click", openFavoritesDrawer);
  elems.closeFavDrawer.addEventListener("click", closeFavoritesDrawer);

  // Close the drawer if the user clicks outside of it
  document.addEventListener("click", function (event) {
    const drawerIsOpen        = elems.favoritesDrawer.classList.contains("open");
    const clickedInsideDrawer = elems.favoritesDrawer.contains(event.target);
    const clickedOnOpenBtn    = elems.openFavDrawer.contains(event.target);

    if (drawerIsOpen && !clickedInsideDrawer && !clickedOnOpenBtn) {
      closeFavoritesDrawer();
    }
  });
}


// ============================================================
// SECTION 24 - DASHBOARD PRE-LOAD
// ============================================================
// On first load, fill the homepage carousels.
// Promise.all() fetches BOTH sets of movies at the same time.

async function preLoadDashboard() {
  showSkeleton(elems.trendingCarousel, 6);
  showSkeleton(elems.popularCarousel, 6);

  try {
    const results = await Promise.all([
      fetchMovies("Marvel"),   // Trending carousel
      fetchMovies("Sci-Fi"),   // Popular carousel
    ]);
    const trendingData = results[0];
    const popularData  = results[1];

    elems.trendingCarousel.innerHTML = "";
    const trendingMovies = trendingData.Search.slice(0, 8);
    for (let i = 0; i < trendingMovies.length; i++) {
      createMovieCard(trendingMovies[i], elems.trendingCarousel);
    }

    elems.popularCarousel.innerHTML = "";
    const popularMovies = popularData.Search.slice(0, 8);
    for (let j = 0; j < popularMovies.length; j++) {
      createMovieCard(popularMovies[j], elems.popularCarousel);
    }

  } catch (error) {
    console.error("Dashboard preloading failed:", error);
    elems.trendingCarousel.innerHTML = "<p class='empty-state-text'>Trending offline. Check connection.</p>";
    elems.popularCarousel.innerHTML  = "<p class='empty-state-text'>Popular offline. Check connection.</p>";
  }
}


// ============================================================
// SECTION 25 - INIT  (the app's starting point)
// ============================================================
// init() is the very first function that runs.
// It loads saved data, sets up all features, and adds all
// the event listeners (click, keypress, etc.).

function init() {
  // Load previously saved data
  appState.favorites = storageGet("favorites",      []);
  appState.recent    = storageGet("recent_history", []);

  // Start all the visual and interactive features
  initTheme();
  initParticles();
  lerpCursor();
  attachRippleEffect();
  initMagneticButtons();
  initVoiceSearch();
  initScrollLogic();
  initNavigation();

  // Draw saved data onto the page
  updateFavoritesUI();
  renderRecentUI();
  updateSuggestionsUI();
  updateSearchHistoryUI();
  preLoadDashboard();

  // Show suggestions dropdown when the search box is focused
  elems.searchInput.addEventListener("focus", function () {
    const savedQueries = storageGet("recent_queries", []);
    if (savedQueries.length > 0) {
      elems.suggestions.classList.remove("hidden");
    }
  });

  // Hide suggestions when clicking anywhere else
  document.addEventListener("click", function (event) {
    const clickedSearch      = elems.searchInput.contains(event.target);
    const clickedSuggestions = elems.suggestions.contains(event.target);
    if (!clickedSearch && !clickedSuggestions) {
      elems.suggestions.classList.add("hidden");
    }
  });

  elems.searchBtn.addEventListener("click", function () {
    performSearch(elems.searchInput.value);
  });

  elems.searchInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      performSearch(elems.searchInput.value);
    }
  });

  elems.clearSugBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    clearSearchHistory();
  });

  // Quick genre tag buttons  (e.g. clicking "Action" searches "Action")
  for (let i = 0; i < elems.quickTags.length; i++) {
    (function (tag) {
      tag.addEventListener("click", function () {
        performSearch(tag.dataset.query);
      });
    })(elems.quickTags[i]);
  }

  elems.clearFavBtn.addEventListener("click", clearFavorites);
  elems.clearHistoryBtn.addEventListener("click", clearSearchHistory);

  elems.modalClose.addEventListener("click", closeModal);

  elems.modalOverlay.addEventListener("click", function (event) {
    const clickedBackdrop = event.target === elems.modalOverlay ||
                          event.target.classList.contains("modal-backdrop");
    if (clickedBackdrop) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
      closeFavoritesDrawer();
    }
  });

  elems.sortSelect.addEventListener("change", function () {
    if (appState.currentQuery) {
      renderSearchResults();
    }
  });

  elems.retryBtn.addEventListener("click", function () {
    performSearch(appState.currentQuery || "Avatar");
  });
}


// ============================================================
// SECTION 26 - START THE APP
// ============================================================
// Wait for the HTML to fully load before calling init().
// document.readyState tells us the current loading stage:
//   "loading"     = HTML is still being parsed - wait
//   anything else = HTML is ready - run init() now

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

