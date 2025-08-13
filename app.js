// Sudoku Game - móvil + desktop
// Generación por backtracking, eliminación según dificultad con verificación de unicidad.

(() => {
  const boardEl = document.getElementById('board');
  const btnNew = document.getElementById('btnNew');
  const btnCheck = document.getElementById('btnCheck');
  const btnHint = document.getElementById('btnHint');
  const btnErase = document.getElementById('btnErase');
  const btnNotes = document.getElementById('btnNotes');
  const btnUndo = document.getElementById('btnUndo');
  const message = document.getElementById('message');
  const difficultyLabel = document.getElementById('difficultyLabel');
  const timerEl = document.getElementById('timer');
  const numpad = document.querySelector('.numpad');
  const diffRadios = Array.from(document.querySelectorAll('input[name="diff"]'));

  const SIZE = 9;

  let grid = createEmptyGrid();
  let solution = null;
  let givenMask = Array(81).fill(false);
  let selectedIndex = -1;
  let notesMode = false;
  let notes = Array(81).fill(0).map(()=>new Set());
  let history = [];
  let timer = null;
  let startEpoch = 0;

  // --- Utilidades Sudoku ---
  function createEmptyGrid(){ return Array(81).fill(0); }
  const idx = (r,c) => r*9+c;
  const rowOf = i => Math.floor(i/9);
  const colOf = i => i%9;
  const boxOf = (r,c) => Math.floor(r/3)*3 + Math.floor(c/3);

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
  }

  function possible(grid, pos, val){
    if(val===0) return true;
    const r = rowOf(pos), c = colOf(pos);
    // fila
    for(let j=0;j<9;j++) if(grid[idx(r,j)]===val) return false;
    // columna
    for(let i=0;i<9;i++) if(grid[idx(i,c)]===val) return false;
    // caja
    const br = Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
    for(let i=0;i<3;i++){
      for(let j=0;j<3;j++){
        if(grid[idx(br+i, bc+j)]===val) return false;
      }
    }
    return true;
  }

  function solve(gridIn, countSolutions=false, maxCount=2){
    const g = gridIn.slice();
    function backtrack(pos=0){
      // Encontrar siguiente vacío
      let minOptions = 10, target = -1, optionsList = null;
      for(let i=0;i<81;i++){
        if(g[i]===0){
          const opts=[];
          for(let v=1;v<=9;v++) if(possible(g,i,v)) opts.push(v);
          if(opts.length===0) return false;
          if(opts.length<minOptions){
            minOptions=opts.length;
            target=i;
            optionsList=opts;
            if(minOptions===1) break;
          }
        }
      }
      if(target===-1){
        // Llena
        return true;
      }
      for(const v of optionsList){
        g[target]=v;
        if(backtrack(target+1)) return true;
        g[target]=0;
      }
      return false;
    }
    return backtrack() ? g : null;
  }

  function countSolutions(gridIn, cap=2){
    const g = gridIn.slice();
    let count = 0;
    function backtrack(){
      // MRV
      let minOptions = 10, target = -1, optionsList = null;
      for(let i=0;i<81;i++){
        if(g[i]===0){
          const opts=[];
          for(let v=1;v<=9;v++) if(possible(g,i,v)) opts.push(v);
          if(opts.length===0) return false;
          if(opts.length<minOptions){
            minOptions=opts.length;
            target=i;
            optionsList=opts;
            if(minOptions===1) break;
          }
        }
      }
      if(target===-1){
        count++;
        return count>=cap;
      }
      for(const v of optionsList){
        g[target]=v;
        if(backtrack()) return true;
        g[target]=0;
      }
      return false;
    }
    backtrack();
    return count;
  }

  function generateSolved(){
    // Llenar diagonal de cajas 3x3, luego resolver
    const g = createEmptyGrid();
    const nums = [1,2,3,4,5,6,7,8,9];
    for(let br=0;br<3;br++){
      const s = shuffle(nums.slice());
      let k=0;
      for(let i=0;i<3;i++) for(let j=0;j<3;j++) g[idx(br*3+i, br*3+j)] = s[k++];
    }
    const solved = solve(g);
    return solved || generateSolved(); // en caso raro de fallo, reintenta
  }

  function makePuzzle(solved, difficulty='normal'){
    const cluesByDiff = {
      easy:   [40, 46],   // rango de pistas (más = más fácil)
      normal: [32, 38],
      hard:   [24, 30],
    };
    const [minClues,maxClues] = cluesByDiff[difficulty] || cluesByDiff.normal;
    const targetClues = randInt(minClues, maxClues);

    const puzzle = solved.slice();
    const cells = shuffle([...Array(81).keys()]);

    // elimina celdas manteniendo unicidad
    for(const i of cells){
      const backup = puzzle[i];
      if(backup===0) continue;
      puzzle[i]=0;
      // verifica unicidad
      if(countSolutions(puzzle, 2) !== 1){
        puzzle[i]=backup; // restaura si ya no es único
      }
      // si alcanzamos el número objetivo de pistas, detenemos
      const cluesLeft = puzzle.filter(v=>v!==0).length;
      if(cluesLeft<=targetClues) break;
    }

    // Si quedó con muy pocas pistas y múltiples soluciones, garantizamos unicidad mínima:
    if(countSolutions(puzzle, 2)!==1){
      // estrategia simple: vuelve a intentar con otro solved
      return makePuzzle(generateSolved(), difficulty);
    }

    return puzzle;
  }

  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

  // --- UI / Render ---
  function renderBoard(){
    boardEl.innerHTML = '';
    for(let i=0;i<81;i++){
      const div = document.createElement('div');
      div.className = 'cell';
      div.setAttribute('role','gridcell');
      div.setAttribute('data-idx', String(i));
      const v = grid[i];
      if(v!==0){
        div.textContent = v;
      }
      if(givenMask[i]){
        div.classList.add('given');
      }else{
        div.classList.add('editable');
      }
      // notes
      if(!givenMask[i] && notes[i].size>0 && v===0){
        const wrap = document.createElement('div');
        wrap.className='notes';
        for(let n=1;n<=9;n++){
          const s = document.createElement('div');
          s.className='note';
          s.textContent = notes[i].has(n) ? n : '';
          wrap.appendChild(s);
        }
        div.appendChild(wrap);
      }
      boardEl.appendChild(div);
    }
    highlight();
  }

  function highlight(){
    // limpiar clases
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(c=>{
      c.classList.remove('selected','same','conflict');
    });

    if(selectedIndex>=0){
      const r = rowOf(selectedIndex), c = colOf(selectedIndex);
      // resaltar fila/col/box
      for(let i=0;i<9;i++){
        cells[idx(r,i)].classList.add('same');
        cells[idx(i,c)].classList.add('same');
      }
      const br = Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
      for(let i=0;i<3;i++) for(let j=0;j<3;j++){
        cells[idx(br+i, bc+j)].classList.add('same');
      }
      cells[selectedIndex].classList.add('selected');
    }

    // conflictos
    for(let i=0;i<81;i++){
      if(grid[i]===0) continue;
      if(!isPlacementValid(i, grid[i])) {
        cells[i].classList.add('conflict');
      }
    }
  }

  function isPlacementValid(pos, val){
    const r = rowOf(pos), c = colOf(pos);
    for(let j=0;j<9;j++){
      const p = idx(r,j);
      if(p!==pos && grid[p]===val) return false;
    }
    for(let i=0;i<9;i++){
      const p = idx(i,c);
      if(p!==pos && grid[p]===val) return false;
    }
    const br = Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
    for(let i=0;i<3;i++) for(let j=0;j<3;j++){
      const p = idx(br+i, bc+j);
      if(p!==pos && grid[p]===val) return false;
    }
    return true;
  }

  function setMessage(text, kind='info'){
    message.textContent = text || '';
    message.style.color = kind==='error' ? 'var(--danger)' :
                          kind==='ok' ? 'var(--ok)' : 'var(--muted)';
  }

  // --- Acciones ---
  function startNewGame(){
    stopTimer();
    setMessage('Generando rompecabezas...');
    const diff = getDifficulty();
    difficultyLabel.textContent = diffLabel(diff);

    // Generar puzzle
    const solved = generateSolved();
    const puzzle = makePuzzle(solved, diff);

    grid = puzzle.slice();
    solution = solved.slice();
    givenMask = grid.map(v=>v!==0);
    notes = Array(81).fill(0).map(()=>new Set());
    history = [];
    selectedIndex = -1;

    renderBoard();
    setMessage('');
    startTimer();
  }

  function placeValue(value){
    if(selectedIndex<0) return;
    if(givenMask[selectedIndex]) return;
    // historial para deshacer
    pushHistory();

    if(value===0){
      grid[selectedIndex]=0;
      notes[selectedIndex].clear();
    }else if(notesMode){
      if(grid[selectedIndex]!==0) grid[selectedIndex]=0;
      // toggle nota
      if(notes[selectedIndex].has(value)) notes[selectedIndex].delete(value);
      else notes[selectedIndex].add(value);
    }else{
      grid[selectedIndex]=value;
      notes[selectedIndex].clear();
    }
    renderBoard();
    checkWin();
  }

  function checkBoard(){
    // marca conflictos visibles; si exacto con solución, ok
    let anyConflict = false;
    for(let i=0;i<81;i++){
      const v = grid[i];
      if(v===0) continue;
      if(!isPlacementValid(i,v)) anyConflict = true;
    }
    if(anyConflict){
      setMessage('Hay conflictos en el tablero.', 'error');
    }else{
      setMessage('¡Sin conflictos por ahora!');
    }
  }

  function giveHint(){
    // busca una celda vacía y pone el valor correcto
    const empties = [];
    for(let i=0;i<81;i++) if(grid[i]===0) empties.push(i);
    if(empties.length===0){
      setMessage('No hay espacios vacíos.');
      return;
    }
    const i = empties[Math.floor(Math.random()*empties.length)];
    pushHistory();
    grid[i] = solution[i];
    notes[i].clear();
    selectedIndex = i;
    renderBoard();
    checkWin();
    setMessage('Pista aplicada.');
  }

  function checkWin(){
    for(let i=0;i<81;i++){
      if(grid[i]===0 || grid[i]!==solution[i]){
        return false;
      }
    }
    stopTimer();
    setMessage('🎉 ¡Completado! Tiempo: ' + timerEl.textContent, 'ok');
    return true;
  }

  function pushHistory(){
    // guardar snapshot pequeña (cambios frecuentes: usamos copia completa para simplicidad)
    history.push({
      grid: grid.slice(),
      notes: notes.map(s=> new Set([...s])),
      selected: selectedIndex
    });
    // limita tamaño
    if(history.length>200) history.shift();
  }

  function undo(){
    const last = history.pop();
    if(!last) return;
    grid = last.grid.slice();
    notes = last.notes.map(s=> new Set([...s]));
    selectedIndex = last.selected;
    renderBoard();
    setMessage('Deshecho.');
  }

  function toggleNotes(){
    notesMode = !notesMode;
    btnNotes.setAttribute('aria-pressed', String(notesMode));
    setMessage(notesMode ? 'Modo notas ACTIVADO' : 'Modo notas DESACTIVADO');
  }

  function erase(){
    placeValue(0);
  }

  function getDifficulty(){
    const checked = diffRadios.find(r=>r.checked);
    return checked ? checked.value : 'normal';
  }
  function diffLabel(d){
    return d==='easy' ? 'Fácil' : d==='hard' ? 'Difícil' : 'Normal';
  }

  // --- Timer ---
  function startTimer(){
    startEpoch = Date.now();
    timerEl.textContent = '00:00';
    timer = setInterval(()=>{
      const secs = Math.floor((Date.now()-startEpoch)/1000);
      const m = String(Math.floor(secs/60)).padStart(2,'0');
      const s = String(secs%60).padStart(2,'0');
      timerEl.textContent = `${m}:${s}`;
    }, 1000);
  }
  function stopTimer(){
    if(timer){ clearInterval(timer); timer=null; }
  }

  // --- Eventos ---
  boardEl.addEventListener('click', (e)=>{
    const cell = e.target.closest('.cell');
    if(!cell) return;
    const i = Number(cell.dataset.idx);
    if(givenMask[i]){ selectedIndex = i; highlight(); return; }
    selectedIndex = i;
    highlight();
  }, {passive:true});

  // Soporte táctil (tap = click ya funciona; evitamos zoom accidental con meta viewport)
  // Numpad
  numpad.addEventListener('click', (e)=>{
    const btn = e.target.closest('.key');
    if(!btn) return;
    const key = Number(btn.dataset.key);
    if(isNaN(key)) return;
    if(key===0) erase(); else placeValue(key);
  }, {passive:true});

  // Botones
  btnNew.addEventListener('click', startNewGame);
  btnCheck.addEventListener('click', checkBoard);
  btnHint.addEventListener('click', giveHint);
  btnErase.addEventListener('click', erase);
  btnNotes.addEventListener('click', toggleNotes);
  btnUndo.addEventListener('click', undo);

  // Cambiar dificultad
  diffRadios.forEach(r => {
    r.addEventListener('change', ()=>{
      difficultyLabel.textContent = diffLabel(getDifficulty());
      startNewGame();
    });
  });

  // Teclado físico
  document.addEventListener('keydown', (e)=>{
    if(e.key>='1' && e.key<='9'){ placeValue(Number(e.key)); }
    else if(e.key==='Backspace' || e.key==='Delete' || e.key==='0'){ erase(); }
    else if(e.key==='n' || e.key==='N'){ toggleNotes(); }
    else if(e.key==='z' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); undo(); }
    else if(e.key==='ArrowUp'){ moveSelection(-9); }
    else if(e.key==='ArrowDown'){ moveSelection(9); }
    else if(e.key==='ArrowLeft'){ moveSelection(-1); }
    else if(e.key==='ArrowRight'){ moveSelection(1); }
  });

  function moveSelection(delta){
    if(selectedIndex<0){
      // selec primera editable
      const first = givenMask.findIndex(v=>!v);
      if(first>=0){ selectedIndex=first; highlight(); }
      return;
    }
    let next = selectedIndex + delta;
    while(next>=0 && next<81 && givenMask[next]) next += delta>=0?1:-1;
    if(next>=0 && next<81){ selectedIndex=next; highlight(); }
  }

  // Inicial
  startNewGame();
})();
