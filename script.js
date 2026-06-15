// script.js – MOVIX AI Core Interactive Application Logic
// --------------------------------------------------------------------------

/* ==========================================================================
   1. State, Constants, & Caching
   ========================================================================== */
const API_KEY = "4d22a530";
const API_URL = "https://www.omdbapi.com/";

// Session caching for API queries to avoid redundant network request calls
const apiCache = new Map();

let appState = {
  currentPage: 1,
  totalResults: 0,
  totalPages: 0,
  pageSize: 10,
  currentQuery: "",
  movies: [],
  sortMode: "default",
  favorites: [],
  recent: [],
};

// DOM Elements Cache
const elems = {
  // Navigation
  navbar: document.querySelector(".navbar"),
  navLinks: document.querySelectorAll(".nav-link"),
  mobileLinks: document.querySelectorAll(".mobile-nav-link"),
  hamburger: document.getElementById("hamburger"),
  mobileMenu: document.getElementById("mobile-menu"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.getElementById("theme-icon"),
  openFavDrawer: document.getElementById("open-fav-drawer"),
  favBadge: document.getElementById("fav-badge"),

  // Interactive Background
  bgCanvas: document.getElementById("bg-canvas"),
  spotlightGlow: document.getElementById("spotlight-glow"),
  cursorGlow: document.getElementById("cursor-glow"),

  // Search UI
  searchInput: document.getElementById("search-input"),
  searchBtn: document.getElementById("search-btn"),
  voiceSearch: document.getElementById("voice-search"),
  suggestions: document.getElementById("search-suggestions"),
  suggestionsList: document.getElementById("suggestions-list"),
  clearSugBtn: document.getElementById("clear-suggestions-btn"),
  quickTags: document.querySelectorAll(".quick-tag"),

  // Main Dynamic Sections
  mainContent: document.querySelector(".main-content"),
  resultsSection: document.getElementById("results-section"),
  resultsTitle: document.getElementById("results-title"),
  resultsCount: document.getElementById("results-count"),
  movieGrid: document.getElementById("movie-grid"),
  pagination: document.getElementById("pagination"),
  sortSelect: document.getElementById("sort-select"),
  emptyState: document.getElementById("empty-state"),

  // Dashboard Carousels
  trendingCarousel: document.getElementById("trending-carousel"),
  popularCarousel: document.getElementById("popular-carousel"),
  recentCarousel: document.getElementById("recent-carousel"),
  favoritesGrid: document.getElementById("favorites-grid"),
  emptyFavorites: document.getElementById("empty-favorites"),
  clearFavBtn: document.getElementById("clear-favorites-btn"),

  // History Section
  historySection: document.getElementById("history-section"),
  historyList: document.getElementById("history-list"),
  emptyHistory: document.getElementById("empty-history"),
  clearHistoryBtn: document.getElementById("clear-history-btn"),

  // Favorites Drawer
  favoritesDrawer: document.getElementById("favorites-drawer"),
  closeFavDrawer: document.getElementById("close-fav-drawer"),
  favoritesList: document.getElementById("favorites-list"),

  // Movie Details Modal
  modalOverlay: document.getElementById("modal-overlay"),
  modalClose: document.getElementById("modal-close"),
  modalPoster: document.getElementById("modal-poster"),
  modalTitle: document.getElementById("modal-title"),
  modalYear: document.getElementById("meta-year"),
  modalRated: document.getElementById("meta-rated"),
  modalRuntime: document.getElementById("meta-runtime"),
  modalRating: document.getElementById("modal-rating-value"),
  modalGenres: document.getElementById("modal-genres"),
  modalPlot: document.getElementById("modal-plot"),
  modalDirector: document.getElementById("modal-director"),
  modalActors: document.getElementById("modal-actors"),
  modalFavBtn: document.getElementById("modal-fav-btn"),
  modalFavIcon: document.getElementById("modal-fav-icon"),
  modalIMDBLink: document.getElementById("modal-imdb-link"),

  // Utility Overlays
  loadingState: document.getElementById("loading-state"),
  errorState: document.getElementById("error-state"),
  errorMsg: document.getElementById("error-message"),
  retryBtn: document.getElementById("retry-btn"),
  toastContainer: document.getElementById("toast-container"),
  backToTop: document.getElementById("back-to-top"),
};

/* ==========================================================================
   2. Local Storage Safes & Helpers
   ========================================================================== */
function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`Local storage parsing failed for key: ${key}`, e);
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Local storage saving failed for key: ${key}`, e);
  }
}

/* ==========================================================================
   3. Custom Toast Notification System
   ========================================================================== */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  elems.toastContainer.appendChild(toast);

  // Trigger animations
  setTimeout(() => {
    toast.classList.add("toast-fadeout");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* ==========================================================================
   4. Premium Web Background: Canvas Particles & Spotlight Lerp
   ========================================================================== */
let mouseX = -1000;
let mouseY = -1000;
let targetMouseX = -1000;
let targetMouseY = -1000;

// Update mouse positions globally
window.addEventListener("mousemove", (e) => {
  targetMouseX = e.clientX;
  targetMouseY = e.clientY;
});

// Lerped cursor glow position logic (smooth follow)
function lerpCursor() {
  const dx = targetMouseX - mouseX;
  const dy = targetMouseY - mouseY;

  mouseX += dx * 0.12;
  mouseY += dy * 0.12;

  if (elems.cursorGlow) {
    // Use hardware accelerated transform translate3d instead of layout-inducing left/top
    elems.cursorGlow.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
  }

  if (elems.spotlightGlow && targetMouseX > 0 && targetMouseY > 0) {
    // Apply spotlight properties locally to the spotlight element, avoiding global document reflows
    elems.spotlightGlow.style.setProperty("--mouse-x", `${mouseX}px`);
    elems.spotlightGlow.style.setProperty("--mouse-y", `${mouseY}px`);
  }

  requestAnimationFrame(lerpCursor);
}

// Particle Canvas Field Simulation
function initParticles() {
  const canvas = elems.bgCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let particles = [];
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = (Math.random() - 0.5) * 0.15;
      this.radius = Math.random() * 1.5 + 0.5;
      this.alpha = Math.random() * 0.5 + 0.1;
      this.glow = Math.random() * 0.02 + 0.005;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      // Wrap limits
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

      // Mouse attraction field
      if (targetMouseX > 0 && targetMouseY > 0) {
        const dx = targetMouseX - this.x;
        const dy = targetMouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          this.x += (dx / dist) * 0.3;
          this.y += (dy / dist) * 0.3;
        }
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6, 182, 212, ${this.alpha})`;
      ctx.fill();
    }
  }

  // Populate particles
  const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 25000));
  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

/* ==========================================================================
   5. Interactive Micro-Interactions (Ripple, Magnetic, 3D Tilt)
   ========================================================================== */
// Click Ripple Effect Spawner
function attachRippleEffect() {
  document.addEventListener("click", (e) => {
    const target = e.target.closest(".btn-ripple");
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement("span");
    ripple.className = "ripple-span";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// Magnetic Button Shifts
function initMagneticButtons() {
  document.querySelectorAll(".btn-magnetic").forEach(btn => {
    let rect = null;

    btn.addEventListener("mouseenter", () => {
      rect = btn.getBoundingClientRect();
    });

    btn.addEventListener("mousemove", (e) => {
      if (!rect) return;
      const buttonX = rect.left + rect.width / 2;
      const buttonY = rect.top + rect.height / 2;

      const distanceX = e.clientX - buttonX;
      const distanceY = e.clientY - buttonY;

      // Shift item slightly towards cursor coordinates
      btn.style.transform = `translate(${distanceX * 0.25}px, ${distanceY * 0.25}px)`;
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
      rect = null;
    });
  });
}

// 3D Tilt calculations for movie cards
function attachCardTilt(card) {
  let rect = null;

  card.addEventListener("mouseenter", () => {
    rect = card.getBoundingClientRect();
  });

  card.addEventListener("mousemove", (e) => {
    if (!rect) return;
    const cardWidth = rect.width;
    const cardHeight = rect.height;
    
    // Relative coordinates
    const x = e.clientX - rect.left - cardWidth / 2;
    const y = e.clientY - rect.top - cardHeight / 2;

    // Angle mappings
    const angleX = -(y / (cardHeight / 2)) * 10; // Max 10 deg X
    const angleY = (x / (cardWidth / 2)) * 10;   // Max 10 deg Y

    card.style.transform = `rotateY(${angleY}deg) rotateX(${angleX}deg) scale(1.03) translateY(-8px)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
    rect = null;
  });
}

/* ==========================================================================
   6. Custom Voice Recognition Search
   ========================================================================== */
function initVoiceSearch() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    // Graceful fallback for browsers without Web Speech support
    elems.voiceSearch.addEventListener("click", () => {
      showToast("Voice search not supported in this browser. Try Chrome/Edge.", "error");
    });
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onstart = () => {
    elems.voiceSearch.classList.add("recording");
    elems.searchInput.placeholder = "Listening with AI voice...";
    showToast("Voice search active. Speak title now...", "success");
  };

  recognition.onerror = (e) => {
    console.error("Speech Recognition Error", e);
    showToast("Voice capture failed. Try again.", "error");
  };

  recognition.onend = () => {
    elems.voiceSearch.classList.remove("recording");
    elems.searchInput.placeholder = "Enter movie, TV show, or series title...";
  };

  recognition.onresult = (event) => {
    const result = event.results[0][0].transcript;
    elems.searchInput.value = result;
    performSearch(result);
  };

  elems.voiceSearch.addEventListener("click", () => {
    if (elems.voiceSearch.classList.contains("recording")) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
}

/* ==========================================================================
   7. API Core Logic & Fetch Calls
   ========================================================================== */
async function apiGet(params) {
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
  const url = `${API_URL}?apikey=${API_KEY}&${queryString}`;

  // Read Cache
  if (apiCache.has(url)) {
    return apiCache.get(url);
  }

  const resp = await fetch(url);
  if (!resp.ok) throw new Error("A network communications issue occurred.");
  const data = await resp.json();

  if (data.Response === "False") {
    throw new Error(data.Error || "No titles found matching this criteria.");
  }

  // Set Cache
  apiCache.set(url, data);
  return data;
}

async function fetchMovies(query, page = 1) {
  return apiGet({ s: query, page });
}

async function fetchMovieDetails(imdbID) {
  return apiGet({ i: imdbID, plot: "full" });
}

/* ==========================================================================
   8. Dynamically Rendering Skeletons & Cards
   ========================================================================== */
function showSkeleton(container, count = 8) {
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.className = "skeleton-card";
    container.appendChild(sk);
  }
}

function createMovieCard(movie, container, isWatchlistCard = false) {
  const card = document.createElement("div");
  card.className = "movie-card";
  card.setAttribute("role", "listitem");
  card.tabIndex = 0;

  // Visual Image poster
  const poster = document.createElement("img");
  poster.className = "movie-poster";
  poster.loading = "lazy";
  poster.alt = `${movie.Title} poster`;
  
  if (movie.Poster && movie.Poster !== "N/A") {
    poster.src = movie.Poster;
  } else {
    // Custom gradient mockup poster instead of raw default placeholder
    poster.src = "https://images.unsplash.com/photo-1542204172-e705278817a2?auto=format&fit=crop&w=400&q=80";
  }

  // Text details overlay
  const info = document.createElement("div");
  info.className = "movie-info";

  const title = document.createElement("h3");
  title.className = "movie-title";
  title.textContent = movie.Title;

  const year = document.createElement("span");
  year.className = "movie-year";
  year.textContent = movie.Year;

  const type = document.createElement("div");
  type.className = "movie-type";
  type.textContent = movie.Type;

  info.append(title, year, type);
  card.append(poster, info);

  // Floating heart toggle
  const favBtn = document.createElement("button");
  favBtn.className = "fav-toggle btn-ripple";
  favBtn.setAttribute("aria-label", "Toggle watchlists");
  
  const inFavs = appState.favorites.some(f => f.imdbID === movie.imdbID);
  favBtn.innerHTML = inFavs ? "❤️" : "🤍";
  if (inFavs) favBtn.classList.add("active");

  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(movie);
    
    // UI state toggles
    const activeState = appState.favorites.some(f => f.imdbID === movie.imdbID);
    favBtn.classList.toggle("active", activeState);
    favBtn.innerHTML = activeState ? "❤️" : "🤍";
    
    if (isWatchlistCard && !activeState) {
      card.remove();
    }
  });

  card.appendChild(favBtn);

  // Micro 3D calculations hover binds
  attachCardTilt(card);

  // Click card to reveal cinematic details modal
  card.addEventListener("click", () => openMovieModal(movie.imdbID));
  card.addEventListener("keypress", (e) => {
    if (e.key === "Enter") openMovieModal(movie.imdbID);
  });

  container.appendChild(card);
}

/* ==========================================================================
   9. Cinematic Modal injection
   ========================================================================== */
async function openMovieModal(imdbID) {
  try {
    elems.loadingState.classList.remove("hidden");
    const data = await fetchMovieDetails(imdbID);

    // Populate modal fields
    if (data.Poster && data.Poster !== "N/A") {
      elems.modalPoster.src = data.Poster;
    } else {
      elems.modalPoster.src = "https://images.unsplash.com/photo-1542204172-e705278817a2?auto=format&fit=crop&w=600&q=80";
    }
    elems.modalPoster.alt = `${data.Title} cinematic poster`;
    elems.modalTitle.textContent = data.Title;
    elems.modalYear.textContent = data.Year;
    elems.modalRated.textContent = data.Rated;
    elems.modalRuntime.textContent = data.Runtime;
    elems.modalRating.textContent = data.imdbRating || "N/A";
    elems.modalPlot.textContent = data.Plot || "Plot information currently unavailable.";
    elems.modalDirector.textContent = data.Director || "N/A";
    elems.modalActors.textContent = data.Actors || "N/A";
    elems.modalIMDBLink.href = `https://www.imdb.com/title/${imdbID}`;

    // Populate dynamic Genres chips
    elems.modalGenres.innerHTML = "";
    if (data.Genre && data.Genre !== "N/A") {
      data.Genre.split(", ").forEach(genre => {
        const chip = document.createElement("span");
        chip.className = "genre-tag";
        chip.textContent = genre;
        elems.modalGenres.appendChild(chip);
      });
    }

    // Modal favorite trigger configuration
    const checkFavIcon = () => {
      const inFav = appState.favorites.some(f => f.imdbID === imdbID);
      elems.modalFavIcon.textContent = inFav ? "❤️" : "♡";
      elems.modalFavBtn.classList.toggle("active", inFav);
    };
    checkFavIcon();

    elems.modalFavBtn.onclick = () => {
      toggleFavorite(data);
      checkFavIcon();
    };

    // Open Modal Overlay
    elems.modalOverlay.classList.remove("hidden");
    elems.modalOverlay.setAttribute("aria-hidden", "false");
    elems.modalOverlay.classList.add("active");

    // Add to Recently Viewed history list
    addToRecent(data);

  } catch (err) {
    showToast(`Could not load movie details: ${err.message}`, "error");
  } finally {
    elems.loadingState.classList.add("hidden");
  }
}

function closeModal() {
  elems.modalOverlay.classList.remove("active");
  elems.modalOverlay.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    if (!elems.modalOverlay.classList.contains("active")) {
      elems.modalOverlay.classList.add("hidden");
    }
  }, 500);
}

/* ==========================================================================
   10. Favorites & Watchlist Drawer Logic
   ========================================================================== */
function toggleFavorite(movie) {
  const index = appState.favorites.findIndex(f => f.imdbID === movie.imdbID);
  if (index >= 0) {
    // Remove
    appState.favorites.splice(index, 1);
    showToast(`Removed "${movie.Title}" from watchlist.`, "info");
  } else {
    // Add
    const coreMovieData = {
      imdbID: movie.imdbID,
      Title: movie.Title,
      Poster: movie.Poster,
      Year: movie.Year,
      Type: movie.Type,
    };
    appState.favorites.push(coreMovieData);
    showToast(`Added "${movie.Title}" to your watchlist!`, "success");
  }

  // Update storage & UI
  storageSet("favorites", appState.favorites);
  updateFavoritesUI();
}

function updateFavoritesUI() {
  // Badge counts
  elems.favBadge.textContent = appState.favorites.length;
  elems.favBadge.style.display = appState.favorites.length > 0 ? "flex" : "none";

  // Section List
  elems.favoritesGrid.innerHTML = "";
  if (appState.favorites.length === 0) {
    elems.emptyFavorites.classList.remove("hidden");
    elems.clearFavBtn.classList.add("hidden");
  } else {
    elems.emptyFavorites.classList.add("hidden");
    elems.clearFavBtn.classList.remove("hidden");
    appState.favorites.forEach(movie => {
      createMovieCard(movie, elems.favoritesGrid, true);
    });
  }

  // Drawer list items mapping
  elems.favoritesList.innerHTML = "";
  if (appState.favorites.length === 0) {
    const placeholder = document.createElement("p");
    placeholder.className = "empty-favorites-text";
    placeholder.textContent = "Your watchlist is empty.";
    elems.favoritesList.appendChild(placeholder);
  } else {
    appState.favorites.forEach(movie => {
      const card = document.createElement("div");
      card.className = "fav-card";
      
      const img = document.createElement("img");
      img.src = movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/70x100?text=No+Poster";
      img.alt = movie.Title;

      const meta = document.createElement("div");
      meta.className = "meta";
      
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = movie.Title;

      const year = document.createElement("div");
      year.className = "year";
      year.textContent = movie.Year;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove btn-ripple";
      removeBtn.innerHTML = "❌ Remove";
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(movie);
      };

      meta.append(title, year, removeBtn);
      card.append(img, meta);

      card.addEventListener("click", () => {
        closeFavoritesDrawer();
        openMovieModal(movie.imdbID);
      });

      elems.favoritesList.appendChild(card);
    });
  }

  // Sync details modal fav heart state if it's currently open
  if (elems.modalOverlay.classList.contains("active") && elems.modalFavIcon) {
    const movieTitle = elems.modalTitle.textContent;
    const isFav = appState.favorites.some(f => f.Title === movieTitle);
    elems.modalFavIcon.textContent = isFav ? "❤️" : "♡";
    elems.modalFavBtn.classList.toggle("active", isFav);
  }
}

function clearFavorites() {
  if (confirm("Are you sure you want to clear your entire watchlist?")) {
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

/* ==========================================================================
   11. Recently Viewed history list management
   ========================================================================== */
function addToRecent(movie) {
  // Avoid duplicates
  let recentList = appState.recent.filter(item => item.imdbID !== movie.imdbID);
  
  // Add core meta to head
  recentList.unshift({
    imdbID: movie.imdbID,
    Title: movie.Title,
    Poster: movie.Poster,
    Year: movie.Year,
    Type: movie.Type,
  });

  // Limit size to max 8
  appState.recent = recentList.slice(0, 8);
  storageSet("recent_history", appState.recent);
  renderRecentUI();
}

function renderRecentUI() {
  const container = elems.recentCarousel;
  container.innerHTML = "";
  const recentSection = document.getElementById("recent");

  if (appState.recent.length === 0) {
    recentSection.classList.add("hidden");
    return;
  }

  recentSection.classList.remove("hidden");
  appState.recent.forEach(movie => {
    createMovieCard(movie, container);
  });
}

/* ==========================================================================
   12. Search Queries & Sorting
   ========================================================================== */
async function performSearch(query, page = 1) {
  const trimmed = query.trim();
  if (!trimmed) return;

  elems.searchInput.value = trimmed;
  appState.currentQuery = trimmed;
  appState.currentPage = page;

  // UI display triggers
  elems.errorState.classList.add("hidden");
  elems.emptyState.classList.add("hidden");
  elems.resultsSection.classList.remove("hidden");
  showSkeleton(elems.movieGrid);

  // Smooth scroll down past hero to search grid
  setTimeout(() => {
    elems.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);

  try {
    const data = await fetchMovies(trimmed, page);
    appState.totalResults = parseInt(data.totalResults, 10);
    appState.movies = data.Search;
    appState.totalPages = Math.ceil(appState.totalResults / appState.pageSize);

    // Save query to search suggestions history
    saveSearchQuery(trimmed);

    // Render results
    renderSearchResults();

  } catch (err) {
    elems.movieGrid.innerHTML = "";
    elems.resultsCount.textContent = "0 results";
    
    if (err.message.includes("Movie not found")) {
      elems.emptyState.classList.remove("hidden");
    } else {
      elems.errorMsg.textContent = err.message;
      elems.errorState.classList.remove("hidden");
    }
    showToast(err.message, "error");
  }
}

function renderSearchResults() {
  const sorted = sortMovies(appState.movies, elems.sortSelect.value);
  elems.movieGrid.innerHTML = "";

  elems.resultsTitle.textContent = `Results for "${appState.currentQuery}"`;
  elems.resultsCount.textContent = `${appState.totalResults} titles`;

  sorted.forEach(movie => {
    createMovieCard(movie, elems.movieGrid);
  });

  renderPaginationControls();
}

function sortMovies(moviesList, mode) {
  let sorted = [...moviesList];
  switch (mode) {
    case "year-desc":
      // Extract numeric components for sort safety (e.g. "2026–" or "2019-2022")
      sorted.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
      break;
    case "year-asc":
      sorted.sort((a, b) => parseInt(a.Year) - parseInt(b.Year));
      break;
    case "title-asc":
      sorted.sort((a, b) => a.Title.localeCompare(b.Title));
      break;
    case "title-desc":
      sorted.sort((a, b) => b.Title.localeCompare(a.Title));
      break;
    default:
      // Keep OMDb relevance score order default
      break;
  }
  return sorted;
}

function renderPaginationControls() {
  const container = elems.pagination;
  container.innerHTML = "";

  if (appState.totalPages <= 1) return;

  const createPageButton = (label, page, isActive = false, isDisabled = false) => {
    const btn = document.createElement("button");
    btn.className = `page-btn btn-ripple ${isActive ? "active" : ""}`;
    btn.textContent = label;
    btn.disabled = isDisabled;
    
    if (!isDisabled && !isActive) {
      btn.onclick = () => performSearch(appState.currentQuery, page);
    }
    return btn;
  };

  // Prev
  container.appendChild(createPageButton("←", appState.currentPage - 1, false, appState.currentPage === 1));

  // Visual limits (displaying range surrounding current selection)
  const range = 2; 
  let start = Math.max(1, appState.currentPage - range);
  let end = Math.min(appState.totalPages, appState.currentPage + range);

  if (start > 1) {
    container.appendChild(createPageButton("1", 1));
    if (start > 2) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      dots.className = "page-dots";
      container.appendChild(dots);
    }
  }

  for (let i = start; i <= end; i++) {
    container.appendChild(createPageButton(i, i, i === appState.currentPage));
  }

  if (end < appState.totalPages) {
    if (end < appState.totalPages - 1) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      dots.className = "page-dots";
      container.appendChild(dots);
    }
    container.appendChild(createPageButton(appState.totalPages, appState.totalPages));
  }

  // Next
  container.appendChild(createPageButton("→", appState.currentPage + 1, false, appState.currentPage === appState.totalPages));
}

/* ==========================================================================
   13. Search Suggestions & Search History Section (localStorage)
   ========================================================================== */
function saveSearchQuery(query) {
  let queries = storageGet("recent_queries", []);
  
  // Filter out any duplicates
  queries = queries.filter(q => q.toLowerCase() !== query.toLowerCase());
  queries.unshift(query);
  
  // Cache max 10
  queries = queries.slice(0, 10);
  storageSet("recent_queries", queries);

  updateSuggestionsUI();
  updateSearchHistoryUI();
}

function updateSuggestionsUI() {
  const queries = storageGet("recent_queries", []);
  if (queries.length === 0) {
    elems.suggestions.classList.add("hidden");
    return;
  }

  elems.suggestionsList.innerHTML = "";
  queries.slice(0, 5).forEach(q => {
    const li = document.createElement("li");
    li.className = "suggestion-item";
    li.textContent = q;
    li.onclick = () => {
      elems.suggestions.classList.add("hidden");
      performSearch(q);
    };
    elems.suggestionsList.appendChild(li);
  });
}

function updateSearchHistoryUI() {
  const queries = storageGet("recent_queries", []);
  const list = elems.historyList;
  const section = elems.historySection;
  const empty = elems.emptyHistory;

  if (!list) return;

  list.innerHTML = "";
  if (queries.length === 0) {
    empty.classList.remove("hidden");
    section.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  section.classList.remove("hidden");

  queries.forEach(q => {
    const item = document.createElement("button");
    item.className = "quick-tag btn-ripple";
    item.textContent = q;
    item.onclick = () => performSearch(q);
    list.appendChild(item);
  });
}

function clearSearchHistory() {
  storageSet("recent_queries", []);
  updateSuggestionsUI();
  updateSearchHistoryUI();
  showToast("Search history cleared.", "info");
}

/* ==========================================================================
   14. Theme Switcher (Dark/Light Mode)
   ========================================================================== */
function initTheme() {
  const savedTheme = storageGet("theme", "dark");
  applyTheme(savedTheme);

  elems.themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  elems.themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
  storageSet("theme", theme);
}

/* ==========================================================================
   15. Scroll Utilities & Sticky Navbar
   ========================================================================== */
function initScrollLogic() {
  window.addEventListener("scroll", () => {
    const y = window.scrollY;

    // Back to top appearance
    if (y > 400) {
      elems.backToTop.classList.add("show");
    } else {
      elems.backToTop.classList.remove("show");
    }

    // Navbar shrink
    if (y > 50) {
      elems.navbar.classList.add("scrolled");
    } else {
      elems.navbar.classList.remove("scrolled");
    }
  });

  // Back to top scroll actions
  elems.backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ==========================================================================
   16. Mobil Navigation & Menus
   ========================================================================== */
function initNavigation() {
  // Hamburger Toggles
  elems.hamburger.addEventListener("click", () => {
    const isExpanded = elems.hamburger.getAttribute("aria-expanded") === "true";
    elems.hamburger.setAttribute("aria-expanded", !isExpanded);
    elems.mobileMenu.classList.toggle("open", !isExpanded);
    elems.mobileMenu.setAttribute("aria-hidden", isExpanded);
  });

  // Close menus on links click
  const closeAllMenus = () => {
    elems.hamburger.setAttribute("aria-expanded", "false");
    elems.mobileMenu.classList.remove("open");
    elems.mobileMenu.setAttribute("aria-hidden", "true");
  };

  document.querySelectorAll(".nav-link, .mobile-nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      closeAllMenus();
      
      // Update Active Navigation Item states
      document.querySelectorAll(".nav-link, .mobile-nav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // Watchlist drawer toggle binds
  elems.openFavDrawer.addEventListener("click", openFavoritesDrawer);
  elems.closeFavDrawer.addEventListener("click", closeFavoritesDrawer);
  
  // Close drawer if clicked outside
  document.addEventListener("click", (e) => {
    if (elems.favoritesDrawer.classList.contains("open") &&
        !elems.favoritesDrawer.contains(e.target) &&
        !elems.openFavDrawer.contains(e.target)) {
      closeFavoritesDrawer();
    }
  });
}

/* ==========================================================================
   17. Initial Feeds Pre-population (Trending/Popular lists)
   ========================================================================== */
async function preLoadDashboard() {
  showSkeleton(elems.trendingCarousel, 6);
  showSkeleton(elems.popularCarousel, 6);

  try {
    // Parallel feeds queries to populate carousels with beautiful metadata cards
    const [trendingData, popularData] = await Promise.all([
      fetchMovies("Marvel"), // Queries action blockbusters
      fetchMovies("Sci-Fi")  // Queries critically acclaimed sci-fi titles
    ]);

    // Fill Trending Carousel
    elems.trendingCarousel.innerHTML = "";
    trendingData.Search.slice(0, 8).forEach(movie => {
      createMovieCard(movie, elems.trendingCarousel);
    });

    // Fill Popular Carousel
    elems.popularCarousel.innerHTML = "";
    popularData.Search.slice(0, 8).forEach(movie => {
      createMovieCard(movie, elems.popularCarousel);
    });

  } catch (err) {
    console.error("Dashboard preloading failed", err);
    // Silent fallbacks to avoid UI crash loops on load
    elems.trendingCarousel.innerHTML = "<p class='empty-state-text'>Trending feeds currently offline. Check connection.</p>";
    elems.popularCarousel.innerHTML = "<p class='empty-state-text'>Popular feeds currently offline. Check connection.</p>";
  }
}

/* ==========================================================================
   18. Application Initializer
   ========================================================================== */
function init() {
  // Sync core lists from LocalStorage
  appState.favorites = storageGet("favorites", []);
  appState.recent = storageGet("recent_history", []);

  // Initialize Modules
  initTheme();
  initParticles();
  lerpCursor();
  attachRippleEffect();
  initMagneticButtons();
  initVoiceSearch();
  initScrollLogic();
  initNavigation();

  // Populate UI
  updateFavoritesUI();
  renderRecentUI();
  updateSuggestionsUI();
  updateSearchHistoryUI();
  preLoadDashboard();

  // Binds suggestions list focus trigger UI
  elems.searchInput.addEventListener("focus", () => {
    const queries = storageGet("recent_queries", []);
    if (queries.length > 0) {
      elems.suggestions.classList.remove("hidden");
    }
  });

  // Hide suggestions overlay if click is lost focus
  document.addEventListener("click", (e) => {
    if (!elems.searchInput.contains(e.target) && !elems.suggestions.contains(e.target)) {
      elems.suggestions.classList.add("hidden");
    }
  });

  // Search button binds
  elems.searchBtn.addEventListener("click", () => {
    performSearch(elems.searchInput.value);
  });

  elems.searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch(elems.searchInput.value);
    }
  });

  // Suggestions clear action bind
  elems.clearSugBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearSearchHistory();
  });

  // Quick Tags binding search query triggers
  elems.quickTags.forEach(tag => {
    tag.addEventListener("click", () => {
      performSearch(tag.dataset.query);
    });
  });

  // Clear favorites triggers
  elems.clearFavBtn.addEventListener("click", clearFavorites);
  
  // Clear search history triggers
  elems.clearHistoryBtn.addEventListener("click", clearSearchHistory);

  // Modal close binds
  elems.modalClose.addEventListener("click", closeModal);
  elems.modalOverlay.addEventListener("click", (e) => {
    if (e.target === elems.modalOverlay || e.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  });
  
  // Keypress escape closes details modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeFavoritesDrawer();
    }
  });

  // Sorting selection trigger binds
  elems.sortSelect.addEventListener("change", () => {
    if (appState.currentQuery) {
      renderSearchResults();
    }
  });

  // Retry error trigger binds
  elems.retryBtn.addEventListener("click", () => {
    performSearch(appState.currentQuery || "Avatar");
  });
}

// Fire application initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
