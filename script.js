let selected = null;
let puzzle = [];
let solution = [];

function generateSolvedBoard() {
  let board = new Array(9).fill(null).map(() => new Array(9).fill(0));

  function canPlace(num, row, col) {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    let boxRow = Math.floor(row / 3) * 3;
    let boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (board[boxRow + r][boxCol + c] === num) return false;
      }
    }
    return true;
  }

  function fillCell(row, col) {
    if (row === 9) return true;
    let nextRow = col === 8 ? row + 1 : row;
    let nextCol = col === 8 ? 0 : col + 1;
    let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    for (let num of nums) {
      if (canPlace(num, row, col)) {
        board[row][col] = num;
        if (fillCell(nextRow, nextCol)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }

  fillCell(0, 0);
  return board;
}

function removeNumbers(board, holes = 45) {
  let puzzle = board.map(row => [...row]);
  let removed = 0;
  while (removed < holes) {
    let r = Math.floor(Math.random() * 9);
    let c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
    }
  }
  return puzzle;
}

function draw() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const div = document.createElement("div");
      div.className = "cell" + (puzzle[r][c] ? " given" : "");
      div.textContent = puzzle[r][c] || "";
      div.onclick = () => { if (!div.classList.contains("given")) select(r, c, div) };
      boardEl.appendChild(div);
    }
  }
}

function select(r, c, el) {
  document.querySelectorAll(".cell").forEach(e => e.classList.remove("selected"));
  el.classList.add("selected");
  selected = { r, c, el };
}

function fill(n) {
  if (!selected) return;
  puzzle[selected.r][selected.c] = n;
  selected.el.textContent = n || "";
}

function checkSolution() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] !== solution[r][c]) {
        alert("❌ Hay errores en la solución.");
        return;
      }
    }
  }
  alert("✅ ¡Correcto!");
}

function newGame() {
  solution = generateSolvedBoard();
  puzzle = removeNumbers(solution, 45);
  draw();
}

document.addEventListener("keydown", (e) => {
  if (selected) {
    let num = parseInt(e.key);
    if (num >= 1 && num <= 9) fill(num);
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") fill(0);
  }
});

newGame();
