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
      const localPlayer = player.getControls().getPlayer();
      localPlayer.configure('streaming.liveSync.targetLatencyTolerance', value);
    }
  });
  configContainer.appendChild(maxLatencyLabel);
  configContainer.appendChild(maxLatencyInput);
  if (window.MediaSource || window.ManagedMediaSource) {
    const hlsMimeType = 'application/vnd.apple.mpegurl'
    const canPlayHLS = document.createElement('video').canPlayType(hlsMimeType) != '';
    if (canPlayHLS) {
      const nativeHlsLabel = document.createElement('label');
      nativeHlsLabel.textContent = 'Use native HLS support';
      const nativeHlsInput = document.createElement('input');
      nativeHlsInput.id = 'native-hls-input';
      nativeHlsInput.type = 'checkbox';
      nativeHlsInput.classList.add('config-input');
      if ('hls' in params) {
        nativeHlsInput.checked = true;
      }
      configContainer.appendChild(document.createElement('br'));
      configContainer.appendChild(nativeHlsLabel);
      configContainer.appendChild(nativeHlsInput);
    }
    const dashMimeType = 'application/dash+xml'
    const canPlayDASH = document.createElement('video').canPlayType(dashMimeType) != '';
    if (canPlayDASH) {
      const nativeDashLabel = document.createElement('label');
      nativeDashLabel.textContent = 'Use native DASH support';
      const nativeDashInput = document.createElement('input');
      nativeDashInput.id = 'native-dash-input';
      nativeDashInput.type = 'checkbox';
      nativeDashInput.classList.add('config-input');
      if ('dash' in params) {
        nativeDashInput.checked = true;
      }
      configContainer.appendChild(document.createElement('br'));
      configContainer.appendChild(nativeDashLabel);
      configContainer.appendChild(nativeDashInput);
    }
    const hlsSequenceModeLabel = document.createElement('label');
    hlsSequenceModeLabel.textContent = 'Use sequence mode in HLS MSE';
    const hlsSequenceModeInput = document.createElement('input');
    hlsSequenceModeInput.id = 'hls-sequence-mode';
    hlsSequenceModeInput.type = 'checkbox';
    hlsSequenceModeInput.classList.add('config-input');
    if ('hlssequencemode' in params) {
      hlsSequenceModeInput.checked = true;
    }
    configContainer.appendChild(document.createElement('br'));
    configContainer.appendChild(hlsSequenceModeLabel);
    configContainer.appendChild(hlsSequenceModeInput);
  }
  const forceVrLabel = document.createElement('label');
  forceVrLabel.textContent = 'Treat content like VR';
  const forceVrInput = document.createElement('input');
  forceVrInput.id = 'force-vr-input';
  forceVrInput.type = 'checkbox';
  forceVrInput.classList.add('config-input');
  if ('vr' in params) {
    forceVrInput.checked = true;
  }
  forceVrInput.addEventListener('change', function () {
    const value = forceVrInput.checked;
    for (const player of players) {
      player.configure({
        displayInVrMode: value,
      });
    }
  });
  configContainer.appendChild(document.createElement('br'));
  configContainer.appendChild(forceVrLabel);
  configContainer.appendChild(forceVrInput);
  const defaultVrProjectionModeLabel = document.createElement('label');
  defaultVrProjectionModeLabel.textContent = 'The default VR projection mode';
  const defaultVrProjectionModeSelect = document.createElement('select');
  defaultVrProjectionModeSelect.id = 'vrProjectionMode';
  defaultVrProjectionModeSelect.classList.add('config-input');
  const vrProjectionModes = [
    'equirectangular',
    'halfequirectangular',
    'cubemap',
  ];
  let defaultVrProjectionMode = vrProjectionModes[0];
  if (params.defaultVrProjectionMode) {
    defaultVrProjectionMode = params.defaultVrProjectionMode;
  }
  for (const vrProjectionMode of vrProjectionModes) {
    const option = document.createElement('option');
    option.value = vrProjectionMode;
    option.label = vrProjectionMode;
    if (vrProjectionMode == defaultVrProjectionMode) {
      option.setAttribute('selected', '');
    }
    defaultVrProjectionModeSelect.appendChild(option);
  }
  defaultVrProjectionModeSelect.addEventListener('change', function () {
    const value = defaultVrProjectionModeSelect.value;
    for (const player of players) {
      player.configure({
        defaultVrProjectionMode: value,
      });
    }
  });
  configContainer.appendChild(document.createElement('br'));
  configContainer.appendChild(defaultVrProjectionModeLabel);
  configContainer.appendChild(defaultVrProjectionModeSelect);

  const saveStateButton = document.createElement('button');
  saveStateButton.id = 'save-state';
  saveStateButton.textContent = 'Update URL';
  saveStateButton.addEventListener('click', remakeHash);
  configContainer.appendChild(document.createElement('br'));
  configContainer.appendChild(saveStateButton);
  document.body.appendChild(configContainer);

  if (params.url && 'play' in params) {
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
    player.destroy(true);
  }
  const playersContainer = document.getElementById('players-container');
  while (playersContainer.firstChild){
    playersContainer.removeChild(playersContainer.firstChild);
  }
}

function loadPlayers () {
  unloadPlayers();
  const playersContainer = document.getElementById('players-container');
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
    players.push(createPlayer(videoContainer, video, url, inputs.length));
  }
  if (players.length > 1) {
    playersContainer.classList.add('many-player-containers');
  } else {
    playersContainer.classList.remove('many-player-containers');
  }
}

function createPlayer(videoContainer, video, url, numberOfInputs) {
  const localPlayer = new shaka.Player();
  localPlayer.attach(video);
  const ui = new shaka.ui.Overlay(localPlayer, videoContainer, video);
  let displayInVrMode = false;
  const forceVrInput = document.getElementById('force-vr-input');
  if (forceVrInput) {
    displayInVrMode = forceVrInput.checked;
  }
  let defaultVrProjectionMode = 'equirectangular';
  const defaultVrProjectionModeSelect = document.getElementById('vrProjectionMode');
  if (defaultVrProjectionModeSelect) {
    defaultVrProjectionMode = defaultVrProjectionModeSelect.value;
  }
  ui.configure({
    castReceiverAppId: '07AEE832',
    enableKeyboardPlaybackControlsInWindow: numberOfInputs === 1,
    displayInVrMode: displayInVrMode,
    defaultVrProjectionMode: defaultVrProjectionMode,
  });
  const controls = ui.getControls();
  const player = controls.getPlayer();
  const adManager = player.getAdManager();
  const maxLatencyInput = document.getElementById('max-latency-input');
  const targetLatencyTolerance = parseFloat(maxLatencyInput.value);
  let preferNativeHls = false;
  const nativeHlsInput = document.getElementById('native-hls-input');
  if (nativeHlsInput) {
    preferNativeHls = nativeHlsInput.checked;
  }
  let preferNativeDash = false;
  const nativeDashInput = document.getElementById('native-dash-input');
  if (nativeDashInput) {
    preferNativeDash = nativeDashInput.checked;
  }
  const errorElement = document.createElement('div');
  errorElement.classList.add('player-error');

  let hlsSequenceMode = true;
  const hlsSequenceModeInput = document.getElementById('hls-sequence-mode');
  if (hlsSequenceModeInput) {
    hlsSequenceMode = hlsSequenceModeInput.checked;
  }

  let currentErrorSeverity = null;
  let currentErrorName = null;

  const handleError_ = (error, name) => {
    console.error(name, error);
    let severity = error.severity;
    if (severity == null || error.severity == undefined) {
      // It's not a shaka.util.Error. Treat it as very severe, since those
      // should not be happening.
      severity = shaka.util.Error.Severity.CRITICAL;
    }
    const message = name + (error.message || ('Error code ' + error.code));
    if (!errorElement.parentElement ||
        severity > currentErrorSeverity ||
        (!name && name != currentErrorName)) {
      errorElement.textContent = message;
      currentErrorSeverity = severity;
      currentErrorName = name;
      if (!errorElement.parentElement) {
        videoContainer.append(errorElement);
      }
    }
  };

  const languages = navigator.languages || ['en-us'];
  player.configure({
    manifest: {
      dash: {
        clockSyncUri: 'https://time.akamai.com/?ms&iso',
      },
      hls: {
        sequenceMode: hlsSequenceMode,
      },
    },
    streaming: {
      bufferingGoal: 30,
      bufferBehind: 30,
      preferNativeDash: preferNativeDash,
      preferNativeHls: preferNativeHls,
      minTimeBetweenRecoveries: 1,
      liveSync: {
        enabled: true,
        targetLatency: 0,
        targetLatencyTolerance: targetLatencyTolerance,
      },
    },
    preferredAudioLanguage: languages[0],
    preferredTextLanguage: languages[0],
  });
  player.load(url.trim()).then(() => {
    if (player.isAudioOnly()) {
      video.poster = 'https://shaka-player-demo.appspot.com/assets/audioOnly.gif';
    }
  }).catch((error) => {
    handleError_(error, '');
  });
  player.addEventListener('loaded', () => {
    video.play();
  }, {once: true});
  player.addEventListener('error', (error) => {
    if (error && error.detail) {
      handleError_(error.detail, '');
    }
  });
  adManager.addEventListener('ad-error', (error) => {
    if (error && error.originalEvent && error.originalEvent.detail) {
      handleError_(error.originalEvent.detail, 'AD: ');
    }
  });
  return ui;
}

function remakeHash() {
  const params = [];

  const nativeHlsInput = document.getElementById('native-hls-input');
  if (nativeHlsInput && nativeHlsInput.checked) {
    params.push('hls');
  }

  const nativeDashInput = document.getElementById('native-dash-input');
  if (nativeDashInput && nativeDashInput.checked) {
    params.push('dash');
  }

  const hlsSequenceModeInput = document.getElementById('hls-sequence-mode');
  if (hlsSequenceModeInput && hlsSequenceModeInput.checked) {
    params.push('hlssequencemode');
  }

  const forceVrInput = document.getElementById('force-vr-input');
  if (forceVrInput && forceVrInput.checked) {
    params.push('vr');
  }

  const defaultVrProjectionModeSelect = document.getElementById('vrProjectionMode');
  if (defaultVrProjectionModeSelect &&
      defaultVrProjectionModeSelect.value != 'equirectangular') {
    params.push('defaultVrProjectionMode=' + defaultVrProjectionModeSelect.value);
  }

  const urls = [];
  const inputs = document.querySelectorAll('input[type=url]');
  for (const input of inputs) {
    const url = input.value;
    if (!url) {
      continue;
    }
    urls.push(url);
  }
  if (urls.length) {
    params.push('url=' + urls.join(','));

    if (players.length) {
      params.push('play');
    }
  }

  const state = null;
  const title = '';
  const hash = params.length ? '#' + params.join(';') : '';
  // Calling history.replaceState can change the URL or hash of the page
  // without actually triggering any changes
  history.replaceState(state, title, document.location.pathname + hash);
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
          const localPlayer = player.getControls().getPlayer();
          if (localPlayer.isLive() && localPlayer.getMediaElement().muted) {
            localPlayer.goToLive();
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