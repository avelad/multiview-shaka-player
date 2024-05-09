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
  const unloadButton = document.createElement('button');
  unloadButton.id = 'load';
  unloadButton.textContent = 'UNLOAD';
  unloadButton.addEventListener('click', unloadPlayers);
  buttonsContainer.appendChild(unloadButton);
  document.body.appendChild(buttonsContainer);

  const timeDiv  = document.createElement('div');
  timeDiv.id = 'time';
  updateTime(timeDiv);
  document.body.appendChild(timeDiv);

  const playersContainer = document.createElement('div');
  playersContainer.id = 'players-container';
  document.body.appendChild(playersContainer);

  const configContainer = document.createElement('div');
  configContainer.id = 'config-container';
  const maxLatencyLabel = document.createElement('label');
  maxLatencyLabel.textContent = 'Live sync max latency';
  const maxLatencyInput = document.createElement('input');
  maxLatencyInput.id = 'max-latency-input';
  maxLatencyInput.type = 'number';
  maxLatencyInput.step = 0.05;
  maxLatencyInput.classList.add('config-input');
  maxLatencyInput.value = 0.25;
  maxLatencyInput.min = 0;
  maxLatencyInput.max = 20;
  maxLatencyInput.addEventListener('change', function () {
    const value = parseInt(maxLatencyInput.value, 10);
    for (const player of players) {
      player.configure('streaming.liveSyncMaxLatency', value);
    }
  });
  configContainer.appendChild(maxLatencyLabel);
  configContainer.appendChild(maxLatencyInput);
  document.body.appendChild(configContainer);
}

function createInput (inputsContainer, value) {
  const inputContainer = document.createElement('div');
  inputContainer.classList.add('input-container');

  const input = document.createElement('input');
  input.type = 'url';
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

function updateTime (element) {
  element.textContent = new Date().toISOString();
  setTimeout(function () {
    updateTime(element);
  }, 10);
}

function unloadPlayers () {
  while (players.length) {
    const player = players.pop();
    player.destroy();
  }
  const playersContainer = document.getElementById('players-container');
  while (playersContainer.firstChild){
    playersContainer.removeChild(playersContainer.firstChild);
  }
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
  const inputs = document.querySelectorAll('input[type=url]');
  for (const input of inputs) {
    const url = input.value;
    if (!url) {
      continue;
    }
    const videoContainer = document.createElement('div');
    videoContainer.setAttribute('data-url', url);
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
  const liveSyncMaxLatency = parseInt(document.getElementById('max-latency-input').value, 10);
  player.configure({
    manifest: {
      dash:{
        clockSyncUri: 'https://time.akamai.com/?ms&iso',
      },
      hls: {
        useSafariBehaviorForLive: false,
        liveSegmentsDelay: 1.5,
      },
    },
    streaming: {
      useNativeHlsOnSafari: false,
      lowLatencyMode: true,
      liveSync: true,
      liveSyncMaxLatency: liveSyncMaxLatency,
    },
  });
  player.load(url.trim());
  player.addEventListener('loaded', () => {
    video.play();
  }, {once: true});
  return player;
}

function initApp() {
  shaka.polyfill.installAll();
  if (shaka.Player.isBrowserSupported()) {
    setupUI();
    window.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        for (const player of players) {
          if (player.isLive() && player.getMediaElement().muted) {
            player.goToLive();
          }
        }
      }
    });
  } else {
    const unsupportedDiv = document.createElement('div');
    unsupportedDiv.id = 'unsupported';
    unsupportedDiv.textContent = 'Browser not supported!';
    document.body.appendChild(unsupportedDiv);
  }
}


document.addEventListener('DOMContentLoaded', initApp);