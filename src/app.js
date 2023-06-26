let players = [];

function setupUI () {

  const inputsContainer = document.createElement('div');
  inputsContainer.id = 'inputs-container';
  document.body.appendChild(inputsContainer);

  createInput(inputsContainer);

  const buttonsContainer = document.createElement('div');
  buttonsContainer.id = 'buttons-container'
  const addInput = document.createElement('button');
  addInput.id = 'add';
  addInput.textContent = 'ADD';
  addInput.addEventListener('click', function () {
    createInput(inputsContainer);
  });
  buttonsContainer.appendChild(addInput);
  const loadButton = document.createElement('button');
  loadButton.id = 'load';
  loadButton.textContent = 'LOAD';
  loadButton.addEventListener('click', loadPlayers);
  buttonsContainer.appendChild(loadButton);
  document.body.appendChild(buttonsContainer);

  const playersContainer = document.createElement('div');
  playersContainer.id = 'players-container';
  document.body.appendChild(playersContainer);
}

function createInput (inputsContainer, value) {
  const inputContainer = document.createElement('div');
  inputContainer.classList.add('input-container');

  const input = document.createElement('input');
  input.classList.add('url-input')
  if (value) {
    input.value = value;
  }
  input.placeholder = 'Your url here...';
  inputContainer.appendChild(input);
  const deleteButton = document.createElement('button');
  deleteButton.classList.add('delete');
  deleteButton.textContent = 'DELETE';
  deleteButton.addEventListener('click', function () {
    inputContainer.remove();
  });
  inputContainer.appendChild(deleteButton);
  inputsContainer.appendChild(inputContainer);
}

function loadPlayers () {
  while (players.length) {
    const player = players.pop();
    player.destroy();
  }
  const playersContainer = document.getElementById('players-container');
  while (playersContainer.firstChild){
    playersContainer.removeChild(playersContainer.firstChild);
  }
  const inputs = document.querySelectorAll('input');
  for (const input of inputs) {
    const url = input.value;
    if (!url) {
      continue;
    }
    const videoContainer = document.createElement('div');
    videoContainer.classList.add('player-container');
    const video = document.createElement('video');
    video.setAttribute('autoplay', true);
    video.muted = true;
    video.style.width = '100%';
    videoContainer.appendChild(video);
    playersContainer.appendChild(videoContainer);
    players.push(createPlayer(videoContainer, video, url));
  }
  if (players.length > 1) {
    playersContainer.classList.add('many-player-containers');
  } else {
    playersContainer.classList.remove('many-player-containers');
  }
}

function createPlayer(videoContainer, video, url) {
  const localPlayer = new shaka.Player(video);
  const ui = new shaka.ui.Overlay(localPlayer, videoContainer, video);
  ui.configure({
    customContextMenu: true,
  });
  const controls = ui.getControls();
  const player = controls.getPlayer();
  player.configure({
    manifest: {
      hls: {
        useSafariBehaviorForLive: false,
      },
    },
    streaming: {
      useNativeHlsOnSafari: false,
      lowLatencyMode: true,
      liveSync: true,
      liveSyncMaxLatency: 0.5,
    },
  });
  player.load(url);
  return player;
}

function initApp() {
  shaka.polyfill.installAll();
  if (shaka.Player.isBrowserSupported()) {
    setupUI();
  } else {
    const unsupportedDiv = document.createElement('div');
    unsupportedDiv.id = 'unsupported';
    unsupportedDiv.textContent = 'Browser not supported!';
    document.body.appendChild(unsupportedDiv);
  }
}


document.addEventListener('DOMContentLoaded', initApp);