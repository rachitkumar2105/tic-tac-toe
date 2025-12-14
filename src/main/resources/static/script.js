let board, turn, interval;
let mode = null;
let vsAI = false;

let p1 = "Player 1", p2 = "Player 2";
let score1 = 0, score2 = 0;
let totalRounds = 1, currentRound = 1;
let starter = 'X';
let aiLevel = "hard";

const boardDiv = document.getElementById("board");
const msg = document.getElementById("message");
const turnDiv = document.getElementById("turn");
const timerDiv = document.getElementById("timer");
const roundInfo = document.getElementById("roundInfo");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const overlayCount = document.getElementById("overlayCount");

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
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  board = Array(9).fill(" ");
  turn = starter;
  
  // Show/hide UI based on mode
  if (mode === "pvp") {
    document.getElementById("playerHeader").classList.remove("hidden");
    document.getElementById("scoreboardSidebar").classList.add("hidden");
    updatePlayerHeader();
  } else {
    document.getElementById("playerHeader").classList.add("hidden");
    document.getElementById("scoreboardSidebar").classList.remove("hidden");
    updateScoreboardDisplay();
  }
  
  enableBoard();
  draw();
  startTimer();
  msg.innerText = "";
  updateRoundInfo();
  overlay.classList.add("hidden");

  // Show/hide Play Again depending on tournament state
  if (mode === "tournament") {
    // show during active tournament rounds
    setPlayAgainVisibility(true);
  } else {
    // for AI/PVP keep Play Again available
    setPlayAgainVisibility(true);
  }
}

// Improved: compute win probability with lookahead (predict future moves)
function computeWinProbabilities(b) {
  // Check if board is empty (game start)
  let isEmpty = true;
  for (const c of b) {
    if (c !== ' ') {
      isEmpty = false;
      break;
    }
  }
  
  // At game start, both players have equal chance
  if (isEmpty) {
    return { x: 50, o: 50 };
  }
  
  // Evaluate from X's perspective
  const scoreX = evaluateWithLookahead(b, 'X', true, 0);
  
  // Normalize: convert score to percentage
  // Score range: -100 to +100
  let px, po;
  if (scoreX > 0) {
    px = Math.min(100, 50 + Math.floor(scoreX / 2));
  } else if (scoreX < 0) {
    px = Math.max(0, 50 + Math.floor(scoreX / 2));
  } else {
    px = 50;
  }
  po = 100 - px;
  
  return { x: px, o: po };
}

function evaluateWithLookahead(b, currentPlayer, isXsTurn, depth) {
  // Base case: check terminal states
  if (checkWin(b, 'X')) return isXsTurn ? (100 - depth) : -(100 - depth);
  if (checkWin(b, 'O')) return isXsTurn ? -(100 - depth) : (100 - depth);
  if (isBoardFull(b)) return 0; // Draw
  
  // Limit depth to avoid deep recursion
  if (depth >= 8) return evaluateBoardStatic(b);
  
  let bestScore;
  const nextPlayer = (currentPlayer === 'X') ? 'O' : 'X';
  
  if (isXsTurn) {
    // X is trying to maximize score
    bestScore = Number.MIN_SAFE_INTEGER;
    for (let i = 0; i < 9; i++) {
      if (b[i] === ' ') {
        b[i] = currentPlayer;
        const score = evaluateWithLookahead(b, nextPlayer, false, depth + 1);
        bestScore = Math.max(bestScore, score);
        b[i] = ' ';
      }
    }
  } else {
    // O is trying to minimize score
    bestScore = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < 9; i++) {
      if (b[i] === ' ') {
        b[i] = currentPlayer;
        const score = evaluateWithLookahead(b, nextPlayer, true, depth + 1);
        bestScore = Math.min(bestScore, score);
        b[i] = ' ';
      }
    }
  }
  
  return (bestScore === Number.MIN_SAFE_INTEGER || bestScore === Number.MAX_SAFE_INTEGER) ? 0 : bestScore;
}

function checkWin(b, p) {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  for (const line of lines) {
    if (b[line[0]] === p && b[line[1]] === p && b[line[2]] === p) return true;
  }
  return false;
}

function isBoardFull(b) {
  for (const c of b) if (c === ' ') return false;
  return true;
}

function evaluateBoardStatic(b) {
  let score = 0;
  
  const lines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  
  for (const line of lines) {
    let xCount = 0, oCount = 0;
    for (const idx of line) {
      if (b[idx] === 'X') xCount++;
      else if (b[idx] === 'O') oCount++;
    }
    // X has 2, can win next move
    if (xCount === 2 && oCount === 0) score += 50;
    // O has 2, can win next move (penalty for X)
    else if (oCount === 2 && xCount === 0) score -= 50;
    // X has 1 potential
    else if (xCount === 1 && oCount === 0) score += 8;
    // O has 1 potential
    else if (oCount === 1 && xCount === 0) score -= 8;
  }
  
  // Center and corner bonuses
  if (b[4] === 'X') score += 6;
  else if (b[4] === 'O') score -= 6;
  
  const corners = [0, 2, 6, 8];
  for (const corner of corners) {
    if (b[corner] === 'X') score += 3;
    else if (b[corner] === 'O') score -= 3;
  }
  
  return score;
}

// Try backend probability first, fallback to local compute
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
    // AI mode: p1 is human (X), p2 is AI (O)
    nameX = p1;
    nameO = p2;
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

function startTimer(){
  clearInterval(interval);
  let t = 15;
  timerDiv.innerText = "⏱️ "+t;
  interval = setInterval(()=>{
    t--;
    timerDiv.innerText = "⏱️ "+t;
    if (t===0){
      handleTimeout();
    }
  },1000);
}

function stopTimer(){ clearInterval(interval); }

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

function move(i){
  if(board[i]!==" ") { msg.innerText="Block already filled"; return; }
  board[i]=turn;
  draw();
  if(check(turn)) return; // Game ends here
  turn = turn==="X" ? "O" : "X";
  startTimer();
  if(vsAI && turn==="O") aiMove();
}

function aiMove(){
  fetch("/api/ai/move?level="+aiLevel,{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(board)
  })
  .then(r=>{
    if(!r.ok) throw new Error("AI request failed");
    return r.json();
  })
  .then(i=>{
    if (typeof i !== "number" || i < 0 || i > 8) {
      msg.innerText = "AI did not return a valid move.";
      return;
    }
    board[i]="O";
    draw();
    if(check("O")) return; // check for AI's move
    turn="X";
    startTimer();
  })
  .catch(e=>{
    msg.innerText = "AI error: "+e.message;
  });
}

function getPlayerNameForSymbol(sym){
  if (mode === "ai") return sym === 'X' ? p1 : p2;
  if (mode === "tournament") return sym === starter ? p1 : p2;
  return sym === 'X' ? p1 : p2;
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

function handleTimeout(){
  stopTimer();
  const loser = turn;
  const winner = loser==="X" ? "O" : "X";
  handleRoundEnd(winner);
}

function handleRoundEnd(winnerSymbol){
  stopTimer();
  disableBoard();

  // Display result message
  if (winnerSymbol !== null) {
    const winnerName = getPlayerNameForSymbol(winnerSymbol);
    msg.innerText = `Congratulations ${winnerName} — round finished.`;
  } else {
    msg.innerText = "Match Draw";
  }

  if (mode === "tournament") {
    if (winnerSymbol === null) { score1++; score2++; }
    else {
      const winnerName = getPlayerNameForSymbol(winnerSymbol);
      if (winnerName === p1) score1 += 2; else score2 += 2;
    }
    updateScoreboardDisplay();

    if (currentRound >= totalRounds){
      // Tournament finished: hide Play Again and lock UI
      let finalMsg;
      let winner;
      if (score1 > score2) { finalMsg = `🏆 Winner of the Tournament: ${p1}`; winner = p1; }
      else if (score2 > score1) { finalMsg = `🏆 Winner of the Tournament: ${p2}`; winner = p2; }
      else { finalMsg = "🤝 Tournament Draw"; winner = null; }
      msg.innerText = finalMsg;
      // Disable any further interaction and hide Play Again
      setPlayAgainVisibility(false);
      document.getElementById("probabilityPanel")?.classList.add("hidden");
      // keep Go Back visible so user can exit to menu
      return;
    } else {
      // Advance to next round (auto)
      currentRound++;
      starter = (starter === 'X') ? 'O' : 'X';
      updateRoundInfo();
      // show overlay and start next round after countdown
      showOverlayCountdown(`Next Round ${currentRound} starts in`, 3, ()=>{
        initRound();
      });
      return;
    }
  }

  // AI mode: update scores but keep Play Again available
  if (mode === "ai") {
    if (winnerSymbol === null) { score1++; score2++; }
    else {
      if (winnerSymbol === 'X') score1 += 2; else score2 += 2;
    }
    updateScoreboardDisplay();
    // keep Play Again visible
    setPlayAgainVisibility(true);
  } else {
    // PVP mode: no persistent scoreboard; keep Play Again visible for friendly rematch
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
  } else {
    board = Array(9).fill(" ");
    turn = mode === "ai" ? 'X' : 'X';
    msg.innerText = "";
    enableBoard();
    draw();
    startTimer();
  }
}

function goBack(){
  stopTimer();
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
