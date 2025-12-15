let board, turn, interval, timeoutTimer;
let mode = null;
let vsAI = false;

let p1 = "Player 1", p2 = "Player 2";
let score1 = 0, score2 = 0;
let totalRounds = 1, currentRound = 1;
let starter = 'X';
let aiLevel = "hard";
let playerSymbol = 'X';  // Track player's symbol in AI mode
let aiSymbol = 'O';     // Track AI's symbol
let aiHumanIsX = true;

const boardDiv = document.getElementById("board");
const msg = document.getElementById("message");
const turnDiv = document.getElementById("turn");
const timerDiv = document.getElementById("timer");
const roundInfo = document.getElementById("roundInfo");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const overlayCount = document.getElementById("overlayCount");

let timerEnabled = false;
let hasStartedMoveTimerThisRound = false;

function setTimerVisibility(visible) {
  const timerBox = document.getElementById("timerBox");
  if (!timerBox) return;
  if (visible) timerBox.classList.remove("hidden");
  else timerBox.classList.add("hidden");
}

function resetTimerDisplay() {
  timerDiv.textContent = "⏱️ 15";
}

function checkWin(b, sym) {
  const w = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const c of w) {
    if (b[c[0]] === sym && b[c[1]] === sym && b[c[2]] === sym) return true;
  }
  return false;
}

function isBoardFull(b) {
  return b.every(c => c !== " ");
}

function getPlayerNameForSymbol(sym) {
  if (mode === "ai") {
    return (sym === playerSymbol) ? p1 : p2;
  }
  if (mode === "tournament") {
    const p1sym = starter === 'X' ? 'X' : 'O';
    const p2sym = starter === 'X' ? 'O' : 'X';
    return (sym === p1sym) ? p1 : p2;
  }
  return sym === 'X' ? p1 : p2;
}

function maybeStartOrResetMoveTimer() {
  if (!timerEnabled) return;
  startTimer();
}

function openTournamentSetup(){
  hideAllSetups();
  document.getElementById("main-options").classList.add("hidden");
  document.getElementById("tournament-setup").classList.remove("hidden");
}

function closeTournamentSetup(){
  document.getElementById("tournament-setup").classList.add("hidden");
  document.getElementById("main-options").classList.remove("hidden");
}

document.querySelectorAll('input[name="rounds"]').forEach(r=>{
  r.addEventListener('change', e=>{
    document.getElementById("customRounds").classList.toggle("hidden", e.target.value!=="custom");
  });
});

function openPVPSetup(){
  hideAllSetups();
  document.getElementById("main-options").classList.add("hidden");
  document.getElementById("pvp-setup").classList.remove("hidden");
}

function closePVPSetup(){
  document.getElementById("pvp-setup").classList.add("hidden");
  document.getElementById("main-options").classList.remove("hidden");
}

function startPVPFromForm(){
  const n1 = document.getElementById("pvp_p1").value.trim() || "Player 1";
  const n2 = document.getElementById("pvp_p2").value.trim() || "Player 2";
  p1 = n1; p2 = n2;
  score1 = score2 = 0;
  mode = "pvp";
  vsAI = false;
  closePVPSetup();
  initRound();
}

function openAISetup(){
  hideAllSetups();
  document.getElementById("main-options").classList.add("hidden");
  document.getElementById("ai-setup").classList.remove("hidden");
}

function closeAISetup(){
  document.getElementById("ai-setup").classList.add("hidden");
  document.getElementById("main-options").classList.remove("hidden");
}

function startAIFromForm(){
  const name = document.getElementById("ai_name").value.trim() || "You";
  p1 = name; p2 = "AI";
  const sel = document.querySelector('input[name="aiLevel"]:checked');
  aiLevel = sel ? sel.value : "hard";
  mode = "ai";
  vsAI = true;

  // X always starts in Tic-Tac-Toe. We only alternate whether the human is X or O.
  playerSymbol = aiHumanIsX ? 'X' : 'O';
  aiSymbol = (playerSymbol === 'X') ? 'O' : 'X';
  aiHumanIsX = !aiHumanIsX;
  starter = 'X';
  
  if (!Number.isFinite(score1)) { score1 = 0; score2 = 0; }
  closeAISetup();
  initRound();
}

function startTournament(){
  const name1 = document.getElementById("p1name").value || "Player 1";
  const name2 = document.getElementById("p2name").value || "Player 2";
  p1 = name1; p2 = name2;
  const sel = document.querySelector('input[name="rounds"]:checked').value;
  totalRounds = sel === "custom" ? parseInt(document.getElementById("customRounds").value,10) : parseInt(sel,10);
  if (isNaN(totalRounds) || totalRounds < 2) totalRounds = 2;
  score1 = score2 = 0;
  currentRound = 1;
  starter = 'X';
  mode = "tournament";
  vsAI = false;
  closeTournamentSetup();
  initRound();
}

function hideAllSetups(){
  document.getElementById("pvp-setup").classList.add("hidden");
  document.getElementById("ai-setup").classList.add("hidden");
  document.getElementById("tournament-setup").classList.add("hidden");
}

function initRound(){
  board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
  turn = starter; // Use the current starter (X or O)
  hasStartedMoveTimerThisRound = false;
  timerEnabled = false;
  setTimerVisibility(false);
  stopTimer();
  resetTimerDisplay();
  
  document.getElementById('game').classList.remove('hidden');
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('scoreboardSidebar').classList.remove('hidden');
  document.getElementById('playerHeader').classList.add('hidden');
  
  const startRoundCore = () => {
    draw();
    updateScoreboardDisplay();
    updateRoundInfo();

    if (vsAI && turn !== playerSymbol) {
      disableBoard();
      setTimeout(() => {
        aiMove();
        enableBoard();
      }, 500);
    }
  };

  if (mode === 'tournament' && currentRound > 1) {
    showOverlayCountdown(`Round ${currentRound}`, 3, startRoundCore);
  } else {
    startRoundCore();
  }
}

function updateProbPanel() {
  const panel = document.getElementById("probabilityPanel");
  if (!panel) return;
  
  // Show panel in all modes: pvp, ai, tournament
  if (mode === null) { 
    panel.classList.add("hidden"); 
    return; 
  }
  panel.classList.remove("hidden");

  // POST current board to backend endpoint
  fetch("/api/probability", {
    method: "POST",
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(board)
  })
  .then(r => {
    if (!r.ok) throw new Error("prob failed");
    return r.json();
  })
  .then(data => {
    // data: { x:%, o:% }
    applyHorizontalProb(data.x, data.o);
  })
  .catch(_=>{
    // fallback to local heuristic
    const p = computeWinProbabilities(board);
    applyHorizontalProb(p.x, p.o);
  });
}

function applyHorizontalProb(px, po){
  // px is % for X, po for O.
  // Map X and O to players based on current game state
  let nameX, nameO;
  
  if (mode === "tournament") {
    // Tournament mode: use starter to determine who plays X
    nameX = starter === 'X' ? p1 : p2;
    nameO = starter === 'X' ? p2 : p1;
  } else if (mode === "ai") {
    // AI mode: map names to the actual X/O assignment
    nameX = (playerSymbol === 'X') ? p1 : p2;
    nameO = (playerSymbol === 'O') ? p1 : p2;
  } else if (mode === "pvp") {
    // PVP mode: p1 is X, p2 is O
    nameX = p1;
    nameO = p2;
  } else {
    nameX = "Player 1";
    nameO = "Player 2";
  }

  // Update labels and fill widths for both players
  document.getElementById("prob1Name").textContent = nameX;
  document.getElementById("prob2Name").textContent = nameO;
  document.getElementById("prob1Percent").textContent = px + "%";
  document.getElementById("prob2Percent").textContent = po + "%";

  // Set bar widths - represents their winning chance
  const fill1 = document.getElementById("prob1Fill");
  const fill2 = document.getElementById("prob2Fill");
  fill1.style.width = px + "%";
  fill2.style.width = po + "%";
}

function updatePlayerHeader(){
  // PVP mode: show names with symbols above board
  document.getElementById("p1header").textContent = `${p1} : X`;
  document.getElementById("p2header").textContent = `${p2} : O`;
}

function updateScoreboardDisplay(){
  document.getElementById("p1Name").textContent = p1;
  document.getElementById("p2Name").textContent = p2;
  
  if (mode === "tournament") {
    const p1sym = starter === 'X' ? 'X' : 'O';
    const p2sym = starter === 'X' ? 'O' : 'X';
    document.getElementById("p1Sym").textContent = `Symbol: ${p1sym}`;
    document.getElementById("p2Sym").textContent = `Symbol: ${p2sym}`;
  } else if (mode === "ai") {
    document.getElementById("p1Sym").textContent = `Symbol: ${playerSymbol}`;
    document.getElementById("p2Sym").textContent = `Symbol: ${aiSymbol}`;
  } else {
    document.getElementById("p1Sym").textContent = "Symbol: X";
    document.getElementById("p2Sym").textContent = "Symbol: O";
  }
  
  document.getElementById("p1Score").textContent = score1;
  document.getElementById("p2Score").textContent = score2;
}

function updateRoundInfo(){
  if (mode === "tournament") {
    roundInfo.textContent = `Round ${currentRound} / ${totalRounds}`;
  } else {
    roundInfo.textContent = "";
  }
}

function showOverlayCountdown(text, seconds, cb){
  overlayText.textContent = text;
  overlayCount.textContent = String(seconds);
  overlay.classList.remove("hidden");
  let s = seconds;
  const it = setInterval(()=>{
    s--;
    overlayCount.textContent = String(Math.max(0,s));
    if (s<=0){
      clearInterval(it);
      overlay.classList.add("hidden");
      if (typeof cb === "function") cb();
    }
  },1000);
}

function startTimer() {
  let timeLeft = 15;
  timerDiv.textContent = `⏱️ ${timeLeft}`;
  if (interval) clearInterval(interval);
  if (timeoutTimer) clearTimeout(timeoutTimer);
  
  interval = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = `⏱️ ${timeLeft}`;
  }, 1000);
  
  // Set a one-time timeout for the full duration
  timeoutTimer = setTimeout(() => {
    clearInterval(interval);
    handleTimeout();
  }, 15000);
}

function stopTimer(){
  if (interval) clearInterval(interval);
  if (timeoutTimer) clearTimeout(timeoutTimer);
}

function draw(){
  boardDiv.innerHTML="";
  board.forEach((v,i)=>{
    let d=document.createElement("div");
    d.className="cell";
    d.innerText=v;
    d.onclick=()=>move(i);
    boardDiv.appendChild(d);
  });
  turnDiv.innerText=`Turn: ${turn}`;
}

function move(i) {
  if (board[i] !== ' ' || (vsAI && turn !== playerSymbol)) return;

  board[i] = turn;

  draw();
  const ended = check(turn);
  if (ended) return;

  // Switch turn after a valid non-ending move
  turn = (turn === 'X') ? 'O' : 'X';

  if (mode === "tournament" && !hasStartedMoveTimerThisRound) {
    hasStartedMoveTimerThisRound = true;
    timerEnabled = true;
    setTimerVisibility(true);
    maybeStartOrResetMoveTimer();
  } else if (timerEnabled) {
    maybeStartOrResetMoveTimer();
  }

  draw();

  // If it's AI's turn after player move
  if (vsAI && turn === aiSymbol && !checkWin(board, playerSymbol) && !checkWin(board, aiSymbol) && !isBoardFull(board)) {
    disableBoard();
    setTimeout(() => {
      aiMove();
      enableBoard();
    }, 500);
  }
}

function findRandomMove(b) {
  const empty = [];
  for (let i = 0; i < 9; i++) if (b[i] === ' ') empty.push(i);
  if (empty.length === 0) return -1;
  return empty[Math.floor(Math.random() * empty.length)];
}

function findWinningMove(b, sym) {
  for (let i = 0; i < 9; i++) {
    if (b[i] !== ' ') continue;
    b[i] = sym;
    const win = checkWin(b, sym);
    b[i] = ' ';
    if (win) return i;
  }
  return -1;
}

function minimax(b, current, maxSym, minSym) {
  if (checkWin(b, maxSym)) return 10;
  if (checkWin(b, minSym)) return -10;
  if (isBoardFull(b)) return 0;

  const isMax = current === maxSym;
  let best = isMax ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (b[i] !== ' ') continue;
    b[i] = current;
    const score = minimax(b, current === 'X' ? 'O' : 'X', maxSym, minSym);
    b[i] = ' ';
    best = isMax ? Math.max(best, score) : Math.min(best, score);
  }

  return best;
}

function findBestMove(b) {
  const maxSym = aiSymbol;
  const minSym = playerSymbol;

  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (b[i] !== ' ') continue;
    b[i] = maxSym;
    const score = minimax(b, maxSym === 'X' ? 'O' : 'X', maxSym, minSym);
    b[i] = ' ';
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}

function aiMove() {
  if (isBoardFull(board) || checkWin(board, playerSymbol) || checkWin(board, aiSymbol)) return;
  
  let move;
  const boardCopy = [...board];
  
  if (aiLevel === 'easy') {
    // Easy: Random move
    move = findRandomMove(boardCopy);
  } else if (aiLevel === 'medium') {
    // Medium: Sometimes blocks or wins, sometimes random
    move = findWinningMove(boardCopy, aiSymbol) || 
           findWinningMove(boardCopy, playerSymbol) || 
           (Math.random() > 0.5 ? findBestMove(boardCopy) : findRandomMove(boardCopy));
  } else {
    // Hard: Uses minimax algorithm
    move = findBestMove(boardCopy);
  }
  
  if (move !== undefined && move !== -1) {
    board[move] = aiSymbol;

    draw();
    const ended = check(aiSymbol);
    if (ended) return;

    // Switch back to player
    turn = playerSymbol;

    if (timerEnabled) {
      maybeStartOrResetMoveTimer();
    }

    draw();
  }
}

function check(playerSymbol){
  const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  
  // Check if player won
  for(let c of w){
    if(board[c[0]]===playerSymbol && board[c[1]]===playerSymbol && board[c[2]]===playerSymbol){
      handleRoundEnd(playerSymbol);
      return true;
    }
  }
  
  // Check if board is full (draw)
  if(board.every(c=>c!==" ")){
    handleRoundEnd(null);
    return true;
  }
  
  return false;
}

function handleTimeout() {
  if (mode === 'ai') {
    // In AI mode, the player who timed out loses
    const winner = (turn === playerSymbol) ? aiSymbol : playerSymbol;
    handleRoundEnd(winner);
  } else {
    // In other modes, the current player loses
    const winner = turn === 'X' ? 'O' : 'X';
    handleRoundEnd(winner);
  }
}

function handleRoundEnd(winnerSymbol){
  stopTimer();
  disableBoard();
  
  if (winnerSymbol === 'X' || winnerSymbol === 'O') {
    const winnerName = getPlayerNameForSymbol(winnerSymbol);
    msg.textContent = `${winnerName} wins!`;

    if (mode === 'tournament') {
      const p1sym = starter === 'X' ? 'X' : 'O';
      if (winnerSymbol === p1sym) score1 += 2;
      else score2 += 2;
    } else if (mode === 'ai') {
      if (winnerSymbol === playerSymbol) score1 += 2;
      else score2 += 2;
    } else {
      if (winnerSymbol === 'X') score1 += 2;
      else score2 += 2;
    }
  } else {
    msg.textContent = "It's a draw!";
    if (mode === 'tournament' || mode === 'ai' || mode === 'pvp') {
      score1 += 1;
      score2 += 1;
    }
  }
  
  updateScoreboardDisplay();
  setPlayAgainVisibility(true);

  if (mode === 'tournament') {
    const isLastRound = currentRound >= totalRounds;
    if (!isLastRound) {
      currentRound++;
      starter = starter === 'X' ? 'O' : 'X';
      setTimeout(() => {
        initRound();
      }, 1200);
    } else {
      setPlayAgainVisibility(false);
      if (score1 > score2) {
        msg.textContent = `${p1} wins the tournament!`;
      } else if (score2 > score1) {
        msg.textContent = `${p2} wins the tournament!`;
      } else {
        msg.textContent = "Tournament Draw";
      }
    }
  }

  // Update score display and show play again button
  updateScoreboardDisplay();
  if (!(mode === 'tournament' && currentRound >= totalRounds)) {
    setPlayAgainVisibility(true);
  }
}

function setPlayAgainVisibility(visible){
  const btn = document.getElementById("playAgainBtn");
  if(!btn) return;
  if(visible) btn.classList.remove("hidden");
  else btn.classList.add("hidden");
}

function disableBoard(){
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.add("disabled");
    cell.onclick = null;
  });
}

function enableBoard(){
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove("disabled");
  });
}

function playAgain(){
  if (mode === "tournament"){
    if (currentRound > totalRounds) return;
    initRound();
    return;
  }

  showOverlayCountdown("Starting...", 3, () => {
    board = Array(9).fill(" ");
    turn = starter;
    msg.innerText = "";
    enableBoard();
    stopTimer();
    resetTimerDisplay();

    if (mode === "ai") {
      timerEnabled = true;
      setTimerVisibility(true);
      maybeStartOrResetMoveTimer();
    } else {
      timerEnabled = false;
      setTimerVisibility(false);
    }

    draw();

    if (vsAI && turn === aiSymbol) {
      disableBoard();
      setTimeout(() => {
        aiMove();
        enableBoard();
      }, 500);
    }
  });
}

function goBack(){
  stopTimer();
  setTimerVisibility(false);
  document.getElementById("game").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
  score1 = score2 = 0;
  currentRound = 1;
  mode = null;
  msg.innerText = "";
  roundInfo.innerText = "";
  clearConfetti();
}

// Confetti animation
function triggerConfetti(){
  const container = document.getElementById("confetti");
  container.innerHTML = "";
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.top = "-10px";
    piece.style.background = ["#ffd700", "#ff9500", "#667eea", "#764ba2"][Math.floor(Math.random() * 4)];
    piece.style.animation = `fall ${2 + Math.random() * 1}s linear forwards`;
    container.appendChild(piece);
  }
}

function clearConfetti(){
  document.getElementById("confetti").innerHTML = "";
}

// Add animation to styles dynamically
const style = document.createElement("style");
style.textContent = `
  @keyframes fall {
    to {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

const origInitRound = initRound;
initRound = function(){ origInitRound(); updateProbPanel(); };

const origMove = move;
move = function(i){
  origMove(i);
  updateProbPanel();
};

const origAiMove = aiMove;
aiMove = function(){
  origAiMove();
  setTimeout(updateProbPanel, 250);
};

const origGoBack = goBack;
goBack = function(){
  origGoBack();
  updateProbPanel();
};

const origPlayAgain = playAgain;
playAgain = function(){
  origPlayAgain();
  updateProbPanel();
};
