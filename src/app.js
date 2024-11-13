let players = [];

function getParams () {
  // Read URL parameters.
  let fields = location.search.substr(1);
  fields = fields ? fields.split(';') : [];
  let fragments = location.hash.substr(1);
  fragments = fragments ? fragments.split(';') : [];

  // Because they are being concatenated in this order, if both an
  // URL fragment and an URL parameter of the same type are present
  // the URL fragment takes precendence.
  const combined = fields.concat(fragments);
  const params = {};
  for (const line of combined) {
    const kv = line.split('=');
    params[kv[0]] = kv.slice(1).join('=');
  }
  return params;
}

function setupUI () {
  const inputsContainer = document.createElement('div');
  inputsContainer.id = 'inputs-container';
  document.body.appendChild(inputsContainer);

  const params = getParams();

  if (params.url) {
    for (const url of params.url.split(',')) {
      createInput(inputsContainer, url);
    }
  } else {
    createInput(inputsContainer);
  }

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
    const value = parseFloat(maxLatencyInput.value);
    for (const player of players) {
      player.configure('streaming.liveSync.targetLatencyTolerance', value);
    }
  });
  configContainer.appendChild(maxLatencyLabel);
  configContainer.appendChild(maxLatencyInput);
  if (window.MediaSource || window.ManagedMediaSource) {
    const mimeType = 'application/vnd.apple.mpegurl'
    const canPlayHLS = document.createElement('video').canPlayType(mimeType) != '';
    if (canPlayHLS) {
      const nativeHlsLabel = document.createElement('label');
      nativeHlsLabel.textContent = 'Use native HLS support';
      const nativeHlsInput = document.createElement('input');
      nativeHlsInput.id = 'native-hls-input';
      nativeHlsInput.type = 'checkbox';
      nativeHlsInput.classList.add('config-input');
      configContainer.appendChild(document.createElement('br'));
      configContainer.appendChild(nativeHlsLabel);
      configContainer.appendChild(nativeHlsInput);
    }
  }
  document.body.appendChild(configContainer);

  if (params.url) {
    loadPlayers();
  }
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
    video.setAttribute('playsinline', '');
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
  const localPlayer = new shaka.Player();
  localPlayer.attach(video);
  const ui = new shaka.ui.Overlay(localPlayer, videoContainer, video);
  ui.configure({
    customContextMenu: true,
    preferVideoFullScreenInVisionOS: true,
    seekOnTaps: false,
  });
  const controls = ui.getControls();
  const player = controls.getPlayer();
  const maxLatencyInput = document.getElementById('max-latency-input');
  const targetLatencyTolerance = parseFloat(maxLatencyInput.value);
  let preferNativeHls = false;
  const nativeHlsInput = document.getElementById('native-hls-input');
  if (nativeHlsInput) {
    preferNativeHls = nativeHlsInput.checked;
  }
  const errorElement = document.createElement('div');
  errorElement.classList.add('player-error');

  let currentErrorSeverity = null;

  const handleError_ = (error) => {
    console.error(error);
    let severity = error.severity;
    if (severity == null || error.severity == undefined) {
      // It's not a shaka.util.Error. Treat it as very severe, since those
      // should not be happening.
      severity = shaka.util.Error.Severity.CRITICAL;
    }
    const message = error.message || ('Error code ' + error.code);
    if (!errorElement.parentElement ||
        severity > currentErrorSeverity) {
      errorElement.textContent = message;
      currentErrorSeverity = severity;
      if (!errorElement.parentElement) {
        videoContainer.append(errorElement);
      }
    }
  };

  player.configure({
    manifest: {
      dash:{
        clockSyncUri: 'https://time.akamai.com/?ms&iso',
      },
      hls: {
        liveSegmentsDelay: 2,
      },
    },
    streaming: {
      bufferingGoal: 30,
      bufferBehind: 30,
      preferNativeHls: preferNativeHls,
      lowLatencyMode: true,
      minTimeBetweenRecoveries: 1,
      liveSync: {
        enabled: true,
        targetLatency: 0,
        targetLatencyTolerance: targetLatencyTolerance,
      },
    },
  });
  if (nativeHlsInput && !nativeHlsInput.checked) {
    player.configure({
      ads: {
        supportsMultipleMediaElements: false,
      },
    });
  }
  player.load(url.trim()).then(() => {
    if (player.isAudioOnly()) {
      video.poster = 'https://shaka-player-demo.appspot.com/assets/audioOnly.gif';
    }
  }).catch((error) => {
    handleError_(error);
  });
  player.addEventListener('loaded', () => {
    video.play();
  }, {once: true});
  player.addEventListener('error', (error) => {
    if (error && error.detail) {
      handleError_(error.detail);
    }
  });
  return player;
}

function initApp() {
  shaka.polyfill.installAll();
  if (shaka.Player.isBrowserSupported()) {
    if (shaka.log) {
      shaka.log.setLevel(shaka.log.Level.INFO);
    }
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
  const shakaPlayerversion = document.createElement('div');
  shakaPlayerversion.id = 'shaka-player-version';
  shakaPlayerversion.textContent = 'Shaka Player: ' + shaka.Player.version;
  document.body.appendChild(shakaPlayerversion);
}


document.addEventListener('DOMContentLoaded', initApp);