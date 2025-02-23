const gameboard = document.querySelector("#gameboard");
const playerDisplay = document.querySelector("#player");
const infoDisplay = document.querySelector("#info-display");
const width = 8;
let selectedPiece = null;
let isPaused = false;

document.getElementById('RotateClockwise').addEventListener('click', rotateClockwise);
document.getElementById('RotateAnticlockwise').addEventListener('click', rotateAnticlockwise);
document.getElementById('Resetgame').addEventListener('click', resetGame);
document.getElementById('play_pause').addEventListener('click', togglePlayPause);

const startPieces = [
  '', '', 'redCannon', 'redTitan', '', '', '', '',
  '', '', '', '', 'redSemiRicochet', 'redRicochet', '', '',
  '', '', '', '', '', 'redTank', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', 'blueTank', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  'blueSemiRicochet', 'blueRicochet', '', '', 'blueTitan', 'blueCannon', '', '',
];

let currentPlayer = 'blue';
let redPlayerTime = 300; // 5 minutes in seconds
let bluePlayerTime = 300;
let timerInterval;

function createBoard() {
  startPieces.forEach((startPiece, i) => {
    const square = document.createElement('div');
    square.classList.add('square');
    square.innerHTML = pieceToHtml[startPiece] || '';
    square.setAttribute('square-id', i);
    gameboard.append(square);
  });
}
createBoard();
startTimer();

const ricochets = document.querySelectorAll('[id*="ricochet"], [id*="semi"]');
ricochets.forEach(ricochet => {
  ricochet.setAttribute('angle', 0);
});

const allsquares = document.querySelectorAll("#gameboard .square");
allsquares.forEach(square => {
  square.addEventListener('click', clickablepieces);
});

let startpositionid;

function clickablepieces(e) {
  const target = e.target;
  // Allow moves on pieces or squares marked as possible-move
  if (!target.classList.contains(currentPlayer) && !target.classList.contains('possible-move'))
    return;

  // If a player's piece is clicked (and not on a possible move)
  if (target.classList.contains(currentPlayer) && !target.classList.contains('possible-move')) {
    if (target.id.includes('ricochet')) {
      selectedPiece = target;
    }
    clearPossibleMoves();
    startpositionid = Number(target.parentElement.getAttribute('square-id') || target.getAttribute('square-id'));
    // Determine move range based on piece type
    if (target.innerHTML.trim() !== '' && target.innerHTML.trim() !== 'Cannon') {
      generatePossibleMoves(startpositionid, 'all');
    } else if (target.innerHTML.trim() === 'Cannon') {
      generatePossibleMoves(startpositionid, 'cannon');
    }
  }
}

function generatePossibleMoves(position, type) {
  const row = Math.floor(position / width) + 1;
  const col = (position % width) + 1;
  const possibleMoveIds = [];

  for (let id = 0; id < width * width; id++) {
    const moveRow = Math.floor(id / width) + 1;
    const moveCol = (id % width) + 1;
    const square = document.querySelector(`[square-id="${id}"]`);
    if (square && square.innerHTML === '') {
      if (type === 'all' && Math.abs(row - moveRow) <= 1 && Math.abs(col - moveCol) <= 1) {
        possibleMoveIds.push(id);
      }
      if (type === 'cannon' && row === moveRow && Math.abs(col - moveCol) <= 1) {
        possibleMoveIds.push(id);
      }
    }
  }
  possibleMoveIds.forEach(id => {
    const square = document.querySelector(`[square-id="${id}"]`);
    if (square) {
      square.classList.add('possible-move');
      square.addEventListener('click', movePiece);
    }
  });
}

function clearPossibleMoves() {
  allsquares.forEach(square => {
    square.classList.remove('possible-move');
    square.removeEventListener('click', movePiece);
  });
}

function movePiece(e) {
  const clickedSquare = e.target;
  if (clickedSquare.classList.contains('possible-move')) {
    const originSquare = document.querySelector(`[square-id="${startpositionid}"]`);
    const piece = originSquare.innerHTML;
    clickedSquare.innerHTML = piece;
    originSquare.innerHTML = '';
    clearPossibleMoves();
    shootBullet();
    switchPlayer();

    if (selectedPiece) {
      selectedPiece.style.transform = 'none';
      selectedPiece = null;
    }
  }
}

function switchPlayer() {
  currentPlayer = currentPlayer === 'red' ? 'blue' : 'red';
}

function playCannonFire() {
  const cannonAudio = new Audio('audio/cannon-shot-14799.mp3');
  cannonAudio.play();
}

function playTitanExplosion(callback) {
  const explosionAudio = new Audio('audio/medium-explosion-40472.mp3');
  explosionAudio.play();
  // Call the callback once the explosion audio has finished playing.
  explosionAudio.onended = callback;
}

function shootBullet() {
  const cannonSelector = currentPlayer === 'red' ? '#redCannon' : '#blueCannon';
  const cannon = document.querySelector(cannonSelector);
  let bulletpos = Number(cannon.parentElement.getAttribute('square-id'));
  const firingPlayer = currentPlayer;
  let direction = firingPlayer === 'red' ? 'down' : 'up';

  const bullet = document.createElement('div');
  bullet.classList.add('bullet');
  
  // Play cannon fire sound immediately.
  playCannonFire();

  // Update bullet rotation based on the current direction.
  function updateBulletRotation() {
    let rotation = 0;
    if (direction === 'up') rotation = 270;
    else if (direction === 'down') rotation = 90;
    else if (direction === 'left') rotation = 180;
    else if (direction === 'right') rotation = 0;
    bullet.style.transform = `rotate(${rotation}deg)`;
  }
  updateBulletRotation();

  function bulletMovement() {
    if (direction === 'up') bulletpos -= width;
    else if (direction === 'down') bulletpos += width;
    else if (direction === 'right') bulletpos += 1;
    else if (direction === 'left') bulletpos -= 1;

    if (bulletpos < 0 || bulletpos >= width * width) {
      bullet.remove();
      return;
    }

    const nextSquare = document.querySelector(`[square-id="${bulletpos}"]`);
    const oppositePlayer = firingPlayer === 'red' ? 'blue' : 'red';
    if (!nextSquare) {
      bullet.remove();
      return;
    }
    
    if (nextSquare.querySelector('.cannon') ||
        nextSquare.querySelector(`.titan.${firingPlayer}`) ||
        (bulletpos % width === 0 && direction === 'right') ||
        ((bulletpos - (width - 1)) % width === 0 && direction === 'left')) {
      bullet.remove();
      return;
    }

    // Check for ricochet.
    const ricochetEl = nextSquare.querySelector('.ricochet');
    if (ricochetEl) {
      let angle = Number(ricochetEl.getAttribute('angle'));
      if (angle % 180 === 0) {
        if (direction === 'up') direction = 'left';
        else if (direction === 'down') direction = 'right';
        else if (direction === 'left') direction = 'up';
        else if (direction === 'right') direction = 'down';
      } else {
        if (direction === 'down') direction = 'left';
        else if (direction === 'up') direction = 'right';
        else if (direction === 'right') direction = 'up';
        else if (direction === 'left') direction = 'down';
      }
      updateBulletRotation();
    }

    // Check for semi-ricochet.
    const semiRicochetEl = nextSquare.querySelector('.semiricochet');
    if (semiRicochetEl) {
      let angle = Number(semiRicochetEl.getAttribute('angle'));
      if (angle % 360 === 0) {
        if (direction === 'up') { direction = 'left'; updateBulletRotation(); }
        else if (direction === 'right') { direction = 'down'; updateBulletRotation(); }
        else if (direction === 'down' || direction === 'left') {
          bullet.remove();
          return;
        }
      } else if ((angle - 90) % 360 === 0) {
        if (direction === 'down') { direction = 'left'; updateBulletRotation(); }
        else if (direction === 'right') { direction = 'up'; updateBulletRotation(); }
        else if (direction === 'up' || direction === 'left') {
          bullet.remove();
          return;
        }
      } else if ((angle - 180) % 360 === 0) {
        if (direction === 'down') { direction = 'right'; updateBulletRotation(); }
        else if (direction === 'left') { direction = 'up'; updateBulletRotation(); }
        else if (direction === 'up' || direction === 'right') {
          bullet.remove();
          return;
        }
      } else if ((angle - 270) % 360 === 0) {
        if (direction === 'left') { direction = 'down'; updateBulletRotation(); }
        else if (direction === 'up') { direction = 'right'; updateBulletRotation(); }
        else if (direction === 'down' || direction === 'right') {
          bullet.remove();
          return;
        }
      }
    }

    if (nextSquare.firstChild) {
      nextSquare.firstChild.appendChild(bullet);
    } else {
      nextSquare.appendChild(bullet);
    }
    
    // When a titan of the opposite player is hit.
    if (nextSquare.querySelector(`.titan.${oppositePlayer}`)) {
      // Play explosion sound and, once finished, end the game.
      playTitanExplosion(() => {
        alert(`Game Over: ${firingPlayer} wins`);
        bullet.remove();
        resetGame();
      });
      return; // Stop further bullet movement.
    }
    
    setTimeout(bulletMovement, 100);
  }
  bulletMovement();
}

function startTimer() {
  timerInterval = setInterval(() => {
    if (currentPlayer === 'red') {
      redPlayerTime--;
      if (redPlayerTime <= 0) {
        alert("Game Over: Blue player wins");
        resetGame();
      }
    } else {
      bluePlayerTime--;
      if (bluePlayerTime <= 0) {
        alert("Game Over: Red player wins");
        resetGame();
      }
    }
    document.getElementById('red-timer').textContent = formatTime(redPlayerTime);
    document.getElementById('blue-timer').textContent = formatTime(bluePlayerTime);
  }, 1000);
}

function formatTime(timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function stopTimer() {
  clearInterval(timerInterval);
}

function resetGame() {
  currentPlayer = 'blue';
  redPlayerTime = 300;
  bluePlayerTime = 300;
  startPieces.forEach((startPiece, i) => {
    const square = document.querySelector(`[square-id="${i}"]`);
    if (square) {
      square.innerHTML = pieceToHtml[startPiece] || '';
    }
  });
  clearPossibleMoves();
  stopTimer();
  startTimer();
}

function rotateClockwise() {
  if (selectedPiece && selectedPiece.id.includes('ricochet')) {
    let angle = Number(selectedPiece.getAttribute('angle'));
    angle += 90;
    selectedPiece.style.transform = `rotateZ(${angle}deg)`;
    selectedPiece.setAttribute('angle', angle);
    clearPossibleMoves();
    selectedPiece = null;
    shootBullet();
    switchPlayer();
  }
}

function rotateAnticlockwise() {
  if (selectedPiece && selectedPiece.id.includes('ricochet')) {
    let angle = Number(selectedPiece.getAttribute('angle'));
    angle += 270;
    selectedPiece.style.transform = `rotateZ(${angle}deg)`;
    selectedPiece.setAttribute('angle', angle);
    clearPossibleMoves();
    selectedPiece = null;
    shootBullet();
    switchPlayer();
  }
}

function togglePlayPause() {
  isPaused = !isPaused;
  if (isPaused) {
    stopTimer();
    allsquares.forEach(square => {
      square.removeEventListener('click', clickablepieces);
    });
  } else {
    startTimer();
    allsquares.forEach(square => {
      square.addEventListener('click', clickablepieces);
    });
  }
}