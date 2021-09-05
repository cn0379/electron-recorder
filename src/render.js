const {
  desktopCapturer,
  remote
} = require('electron');

const {
  writeFile
} = require('fs');

// 逻辑为 选择屏幕>>>创建流>>>录制流>>>保存流
// 状态为 暂停、结束、静音、声音大小.....

/*
 * dialog 模块提供了api来展示原生的系统对话框，例如打开文件框，alert框
 * remote 模块提供了一种在渲染进程（网页）和主进程之间进行进程间通讯
 * Menu   模块是一个主进程的模块，并且可以通过 remote 模块给渲染进程调用.
 */

const {
  dialog,
  Menu
} = remote;

// Global state
let mediaRecorder; // MediaRecorder instance to capture footage
const recordedChunks = [];

// Buttons
const videoElement = document.querySelector('video');

const startBtn = document.getElementById('startBtn');
startBtn.onclick = e => {
  mediaRecorder.start();
  console.log(mediaRecorder.start);
  startBtn.classList.add('is-danger');
  startBtn.innerText = 'Recording';
};

const stopBtn = document.getElementById('stopBtn');

stopBtn.onclick = e => {
  mediaRecorder.stop();
  startBtn.classList.remove('is-danger');
  startBtn.innerText = 'Start';
};

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

// Get the available video sources
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen'] // window 代表打开的窗口 screen 代表屏幕
  });

  // 菜单选项
  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map(source => {
      return {
        label: source.name,
        click: () => selectSource(source)
      };
    })
  );

  videoOptionsMenu.popup(); // 展示
}

// Change the videoSource window to record
async function selectSource(source) {

  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id
      }
    }
  };

  // Create a Stream
  // 提示用户给予使用媒体输入的许可，媒体输入会
  // 产生一个MediaStream，里面包含了请求的媒体类型的轨道。
  const stream = await navigator.mediaDevices
    .getUserMedia(constraints);

  // srcObje 是实时流
  videoElement.srcObject = stream;
  videoElement.play(); // 播放流

  // MIME 消息能包含文本、图像、音频、视频以及其他应用程序专用的数据。
  const options = {
    mimeType: 'video/webm; codecs=vp9'
  };

  // 将要录制的流
  mediaRecorder = new MediaRecorder(stream, options);

  // Register Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable; // 录像停止
  mediaRecorder.onstop = handleStop; // 保存录像

  // Updates the UI
}

// Captures all recorded chunks
function handleDataAvailable(e) {
  console.log('video data available');
  recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: 'video/webm; codecs=vp9'
  });

  const buffer = Buffer.from(await blob.arrayBuffer());

  const {
    filePath
  } = await dialog.showSaveDialog({
    buttonLabel: '保存视频',
    defaultPath: `vid-${Date.now()}.webm`
  });

  if (filePath) {
    writeFile(filePath, buffer, () => console.log('video saved successfully!'));
  }

}