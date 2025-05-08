// API endpoints
const API_ENDPOINTS = {
    GET_RIDDLES: '/api/riddles',
    SUBMIT_ANSWER: '/api/submit',
    GET_STATS: '/api/stats',
    UPDATE_STATS: '/api/stats/update',
};

// Local storage keys
const STORAGE_KEYS = {
    USER_ID: 'enigma_quest_user_id',
    STATS: 'enigma_quest_stats',
    CURRENT_RIDDLE: 'enigma_quest_current_riddle',
    RIDDLES: 'enigma_quest_riddles'
};

// Game configuration
const GAME_CONFIG = {
    RIDDLE_TIME_LIMIT: 30, // 30 seconds per riddle
    MAX_HINTS_PER_RIDDLE: 3 // Maximum 3 hints per riddle
};

// Riddle database - will be fetched from API
let riddles = [];

// Game variables
let currentRiddleIndex = 0;
let correctAnswers = 0;
let currentStreak = 0;
let hintsUsed = 0;
let hintsUsedForCurrentRiddle = 0;
let startTime;
let riddleStartTime;
let timerInterval;
let riddleTimerInterval;
let gameEnded = false;
let userId = null;
let totalRiddles = 0;
let timeRemaining = GAME_CONFIG.RIDDLE_TIME_LIMIT;

// DOM Elements
const riddleElement = document.getElementById('riddle');
const hintElement = document.getElementById('hint');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-btn');
const hintBtn = document.getElementById('hint-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const restartBtnFinal = document.getElementById('restart-btn-final');
const feedbackElement = document.getElementById('feedback');
const progressBar = document.getElementById('progress');
const correctCountElement = document.getElementById('correct-count');
const streakCountElement = document.getElementById('streak-count');
const hintsUsedElement = document.getElementById('hints-used');
const timeSpentElement = document.getElementById('time-spent');
const gameOverElement = document.getElementById('game-over');
const scoreSummaryElement = document.getElementById('score-summary');

// Get or create user ID
function getUserId() {
    let id = localStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!id) {
        id = 'user_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(STORAGE_KEYS.USER_ID, id);
    }
    return id;
}

// Load stats from local storage
function loadLocalStats() {
    const statsJson = localStorage.getItem(STORAGE_KEYS.STATS);
    if (statsJson) {
        const stats = JSON.parse(statsJson);
        correctAnswers = stats.correctAnswers || 0;
        currentStreak = stats.currentStreak || 0;
        hintsUsed = stats.hintsUsed || 0;
        currentRiddleIndex = stats.currentRiddleIndex || 0;
        return stats;
    }
    return null;
}

// Save stats to local storage
function saveLocalStats() {
    const stats = {
        userId: userId,
        correctAnswers: correctAnswers,
        currentStreak: currentStreak,
        hintsUsed: hintsUsed,
        currentRiddleIndex: currentRiddleIndex,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    return stats;
}

// Fetch riddles from API
async function fetchRiddles() {
    try {
        riddleElement.textContent = "Loading riddles...";

        // Check local storage first
        const cachedRiddles = localStorage.getItem(STORAGE_KEYS.RIDDLES);
        if (cachedRiddles) {
            riddles = JSON.parse(cachedRiddles);
            totalRiddles = riddles.length;
            return riddles;
        }

        // If not in cache, fetch from API
        const response = await fetch(API_ENDPOINTS.GET_RIDDLES);
        if (!response.ok) {
            throw new Error('Failed to fetch riddles');
        }

        const data = await response.json();
        riddles = data.riddles || [];
        totalRiddles = riddles.length;

        // Cache the riddles
        localStorage.setItem(STORAGE_KEYS.RIDDLES, JSON.stringify(riddles));
        return riddles;
    } catch (error) {
        console.error("Error fetching riddles:", error);
        riddleElement.textContent = "Failed to load riddles. Please refresh the page and try again.";
        return [];
    }
}

// Fetch user stats from API
async function fetchUserStats() {
    try {
        const response = await fetch(`${API_ENDPOINTS.GET_STATS}?userId=${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user stats');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching user stats:", error);
        // Fall back to local stats
        return loadLocalStats() || { correctAnswers: 0, currentStreak: 0, hintsUsed: 0 };
    }
}

// Update user stats on the server
async function updateUserStats() {
    try {
        const stats = saveLocalStats();

        const response = await fetch(API_ENDPOINTS.UPDATE_STATS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(stats)
        });

        if (!response.ok) {
            throw new Error('Failed to update user stats');
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating user stats:", error);
        // Continue with local stats only
        return null;
    }
}

// Submit answer to API
async function submitAnswerToAPI(riddleId, userAnswer) {
    try {
        const payload = {
            userId: userId,
            riddleId: riddleId,
            answer: userAnswer,
            timeSpent: Math.floor((new Date() - startTime) / 1000),
            hintsUsed: hintsUsed
        };

        const response = await fetch(API_ENDPOINTS.SUBMIT_ANSWER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Failed to submit answer');
        }

        return await response.json();
    } catch (error) {
        console.error("Error submitting answer:", error);
        // Fall back to local validation
        return {
            correct: userAnswer.toLowerCase() === riddles[currentRiddleIndex].answer.toLowerCase(),
            correctAnswer: riddles[currentRiddleIndex].answer
        };
    }
}

// Initialize game
async function initGame() {
    // Show loading state
    riddleElement.textContent = "Initializing game...";
    answerInput.disabled = true;
    submitBtn.disabled = true;

    // Get or create user ID
    userId = getUserId();

    // Fetch riddles
    await fetchRiddles();

    if (riddles.length === 0) {
        riddleElement.textContent = "Failed to load riddles. Please refresh the page.";
        return;
    }

    // Try to load server stats, fall back to local
    let stats;
    try {
        stats = await fetchUserStats();
        if (stats) {
            correctAnswers = stats.correctAnswers || 0;
            currentStreak = stats.currentStreak || 0;
            hintsUsed = stats.hintsUsed || 0;
            currentRiddleIndex = stats.currentRiddleIndex || 0;

            // Make sure index is valid
            if (currentRiddleIndex >= riddles.length) {
                currentRiddleIndex = 0;
            }
        }
    } catch (error) {
        // Load from local storage as fallback
        loadLocalStats();
    }

    gameEnded = false;

    updateStats();
    loadRiddle(currentRiddleIndex);
    updateProgressBar();

    // Reset UI elements
    gameOverElement.style.display = 'none';
    restartBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    hintBtn.style.display = 'block';
    feedbackElement.style.display = 'none';
    hintElement.style.display = 'none';
    answerInput.disabled = false;
    submitBtn.disabled = false;

    // Start timer
    startTime = new Date();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

// Load riddle by index
function loadRiddle(index) {
    if (index >= riddles.length) {
        endGame();
        return;
    }

    // Reset riddle-specific variables
    hintsUsedForCurrentRiddle = 0;
    timeRemaining = GAME_CONFIG.RIDDLE_TIME_LIMIT;

    // Enable hint button
    hintBtn.disabled = false;
    hintBtn.textContent = "Show Hint";

    // Store current riddle index in local storage
    localStorage.setItem(STORAGE_KEYS.CURRENT_RIDDLE, index);

    riddleElement.textContent = riddles[index].question;
    hintElement.textContent = riddles[index].hint;
    hintElement.style.display = 'none';
    answerInput.value = '';
    answerInput.focus();

    // Start riddle timer
    riddleStartTime = new Date();
    clearInterval(riddleTimerInterval);
    riddleTimerInterval = setInterval(updateRiddleTimer, 1000);

    // Update time display immediately
    updateRiddleTimerDisplay();
}

// Update the riddle timer
function updateRiddleTimer() {
    if (gameEnded) {
        clearInterval(riddleTimerInterval);
        return;
    }

    const elapsedSeconds = Math.floor((new Date() - riddleStartTime) / 1000);
    timeRemaining = Math.max(0, GAME_CONFIG.RIDDLE_TIME_LIMIT - elapsedSeconds);

    updateRiddleTimerDisplay();

    if (timeRemaining <= 0) {
        // Time's up
        clearInterval(riddleTimerInterval);
        handleTimeUp();
    }
}

// Update the timer display
function updateRiddleTimerDisplay() {
    // Add a timer display element to the riddle container if it doesn't exist
    let timerElement = document.getElementById('riddle-timer');
    if (!timerElement) {
        timerElement = document.createElement('div');
        timerElement.id = 'riddle-timer';
        timerElement.style.textAlign = 'center';
        timerElement.style.marginTop = '10px';
        timerElement.style.fontWeight = 'bold';
        timerElement.style.fontSize = '1.2rem';

        // Insert after riddle text
        riddleElement.parentNode.insertBefore(timerElement, riddleElement.nextSibling);
    }

    // Change color based on time remaining
    if (timeRemaining <= 5) {
        timerElement.style.color = 'var(--danger)';
    } else if (timeRemaining <= 10) {
        timerElement.style.color = 'var(--warning)';
    } else {
        timerElement.style.color = 'var(--light)';
    }

    timerElement.textContent = `Time remaining: ${timeRemaining} seconds`;
}

// Handle when time is up for a riddle
function handleTimeUp() {
    // Disable input
    answerInput.disabled = true;
    submitBtn.disabled = true;
    hintBtn.disabled = true;

    // Show the correct answer
    showFeedback(false, riddles[currentRiddleIndex].answer);

    // Show next button
    nextBtn.style.display = 'block';

    // Reset streak
    currentStreak = 0;
    updateStats();
}

// Function to validate the answer input
function validateAnswer() {
    const inputGroup = document.querySelector('.input-group');

    if (!answerInput.value.trim()) {
        // Show error
        inputGroup.classList.add('error');
        return false;
    } else {
        // Hide error
        inputGroup.classList.remove('error');
        return true;
    }
}

// Check answer
async function checkAnswer() {
    // Validate the input first
    if (!validateAnswer()) {
        return; // Stop if validation fails
    }

    const userAnswer = answerInput.value.trim();

    // Disable input while checking
    answerInput.disabled = true;
    submitBtn.disabled = true;

    try {
        // Stop the riddle timer
        clearInterval(riddleTimerInterval);

        // Send answer to API for validation
        const riddleId = riddles[currentRiddleIndex].id;
        const result = await submitAnswerToAPI(riddleId, userAnswer);

        if (result.correct) {
            showFeedback(true);
            correctAnswers++;
            currentStreak++;
        } else {
            showFeedback(false, result.correctAnswer);
            currentStreak = 0;
        }

        // Update stats locally and on server
        updateStats();
        await updateUserStats();

        nextBtn.style.display = 'block';

    } catch (error) {
        console.error("Error checking answer:", error);

        // Fallback to client-side checking if API fails
        const correctAnswer = riddles[currentRiddleIndex].answer.toLowerCase();
        if (userAnswer.toLowerCase() === correctAnswer) {
            showFeedback(true);
            correctAnswers++;
            currentStreak++;
        } else {
            showFeedback(false, riddles[currentRiddleIndex].answer);
            currentStreak = 0;
        }

        updateStats();
        saveLocalStats();

        nextBtn.style.display = 'block';
    }
}

// Show feedback to user
function showFeedback(isCorrect, correctAnswer = null) {
    feedbackElement.style.display = 'block';

    if (isCorrect) {
        feedbackElement.textContent = '✓ Correct! Well done!';
        feedbackElement.className = 'feedback correct';
    } else {
        feedbackElement.textContent = `✗ Incorrect. The answer was "${correctAnswer}".`;
        feedbackElement.className = 'feedback incorrect';
    }
}

// Next riddle
async function nextRiddle() {
    currentRiddleIndex++;
    updateProgressBar();

    // Update stats on server before loading next riddle
    await updateUserStats();

    loadRiddle(currentRiddleIndex);
    feedbackElement.style.display = 'none';
    nextBtn.style.display = 'none';
    answerInput.disabled = false;
    submitBtn.disabled = false;

    // Hide hint for new riddle
    hintElement.style.display = 'none';

    // Show restart button if we're at least halfway through
    if (currentRiddleIndex >= riddles.length / 2) {
        restartBtn.style.display = 'block';
    }
}

// Update progress bar
function updateProgressBar() {
    const progress = (currentRiddleIndex / totalRiddles) * 100;
    progressBar.style.width = `${progress}%`;
}

// Update stats display
function updateStats() {
    correctCountElement.textContent = correctAnswers;
    streakCountElement.textContent = currentStreak;
    hintsUsedElement.textContent = hintsUsed;

    // Also save to local storage
    saveLocalStats();
}

// Update timer
function updateTimer() {
    if (gameEnded) return;

    const now = new Date();
    const timeElapsed = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;

    timeSpentElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// End game
async function endGame() {
    gameEnded = true;
    clearInterval(timerInterval);
    clearInterval(riddleTimerInterval);

    // Calculate score and time
    const accuracy = Math.round((correctAnswers / totalRiddles) * 100);
    const timeElapsed = Math.floor((new Date() - startTime) / 1000);
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;

    // Final stats update to server
    await updateUserStats();

    // Get leaderboard position if available
    let leaderboardPosition = null;
    try {
        const response = await fetch(`${API_ENDPOINTS.GET_STATS}/leaderboard?userId=${userId}`);
        if (response.ok) {
            const data = await response.json();
            leaderboardPosition = data.position;
        }
    } catch (error) {
        console.error("Error fetching leaderboard position:", error);
    }

    // Display game over screen
    gameOverElement.style.display = 'block';
    let summaryHTML = `
                <p>You solved ${correctAnswers} out of ${totalRiddles} riddles</p>
                <p>Accuracy: ${accuracy}%</p>
                <p>Hints used: ${hintsUsed}</p>
                <p>Time taken: ${minutes}m ${seconds}s</p>
            `;

    if (leaderboardPosition) {
        summaryHTML += `<p>Your position on the leaderboard: #${leaderboardPosition}</p>`;
    }

    scoreSummaryElement.innerHTML = summaryHTML;

    // Hide other game elements
    riddleElement.parentElement.style.display = 'none';
    answerInput.parentElement.parentElement.style.display = 'none';
    feedbackElement.style.display = 'none';
    document.querySelector('.controls').style.display = 'none';

    // Reset current riddle index in local storage
    localStorage.setItem(STORAGE_KEYS.CURRENT_RIDDLE, 0);
}

// Event Listeners
submitBtn.addEventListener('click', checkAnswer);

answerInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

// Additional event listener for input to clear error on typing
answerInput.addEventListener('input', function() {
    const inputGroup = document.querySelector('.input-group');
    inputGroup.classList.remove('error');
});

hintBtn.addEventListener('click', async function() {
    if (hintsUsedForCurrentRiddle >= GAME_CONFIG.MAX_HINTS_PER_RIDDLE) {
        // Already used max hints for this riddle
        return;
    }

    hintsUsedForCurrentRiddle++;
    hintsUsed++;

    hintElement.style.display = 'block';
    updateStats();

    // Update hint button text to show remaining hints
    const remainingHints = GAME_CONFIG.MAX_HINTS_PER_RIDDLE - hintsUsedForCurrentRiddle;
    hintBtn.textContent = `Hints: ${remainingHints} left`;

    // Disable hint button if no more hints available
    if (remainingHints <= 0) {
        hintBtn.disabled = true;
    }

    await updateUserStats(); // Update server with hint usage
});

nextBtn.addEventListener('click', nextRiddle);

restartBtn.addEventListener('click', initGame);

restartBtnFinal.addEventListener('click', function() {
    riddleElement.parentElement.style.display = 'block';
    answerInput.parentElement.parentElement.style.display = 'flex';
    document.querySelector('.controls').style.display = 'flex';
    initGame();
});

// API Mock Data - Remove this in production
// This simulates what the backend would return
async function setupMockAPI() {
    // Mock implementation of fetch for API endpoints
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        // If it's not one of our API endpoints, use the original fetch
        if (!url.startsWith('/api/')) {
            return originalFetch(url, options);
        }

        // Mock GET_RIDDLES endpoint
        if (url === API_ENDPOINTS.GET_RIDDLES) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    riddles: [
                        {
                            id: 'r1',
                            question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
                            answer: "echo",
                            hint: "I return what is sent to me, but never exactly as it came."
                        },
                        {
                            id: 'r2',
                            question: "The more you take, the more you leave behind. What am I?",
                            answer: "footsteps",
                            hint: "Think about walking on a path..."
                        },
                        {
                            id: 'r3',
                            question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
                            answer: "map",
                            hint: "I help you find your way from one place to another."
                        },
                        {
                            id: 'r4',
                            question: "What has keys but no locks, space but no room, and you can enter but not go in?",
                            answer: "keyboard",
                            hint: "You use me to communicate with computers."
                        },
                        {
                            id: 'r5',
                            question: "What gets wetter as it dries?",
                            answer: "towel",
                            hint: "You use me after taking a shower."
                        }
                    ]
                })
            });
        }

        // Mock SUBMIT_ANSWER endpoint
        if (url === API_ENDPOINTS.SUBMIT_ANSWER) {
            return new Promise(resolve => {
                setTimeout(() => {
                    const body = JSON.parse(options.body);
                    const riddleId = body.riddleId;
                    const userAnswer = body.answer.toLowerCase();

                    // Find the riddle in our mock data
                    const riddle = riddles.find(r => r.id === riddleId);
                    const isCorrect = riddle && userAnswer === riddle.answer.toLowerCase();

                    resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            correct: isCorrect,
                            correctAnswer: riddle ? riddle.answer : null
                        })
                    });
                }, 500); // Simulate network delay
            });
        }

        // Mock GET_STATS endpoint
        if (url.startsWith(API_ENDPOINTS.GET_STATS)) {
            // Check if it's a leaderboard request
            if (url.includes('leaderboard')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        position: Math.floor(Math.random() * 100) + 1 // Random position
                    })
                });
            }

            // Regular stats request
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(loadLocalStats() || {
                    correctAnswers: 0,
                    currentStreak: 0,
                    hintsUsed: 0,
                    currentRiddleIndex: 0
                })
            });
        }

        // Mock UPDATE_STATS endpoint
        if (url === API_ENDPOINTS.UPDATE_STATS) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
        }

        // Default fallback
        return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Not implemented in mock" })
        });
    };
}

// Setup the mock API in development
setupMockAPI();

// Start the game
initGame();