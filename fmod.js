var FMOD = {}; // FMOD global object which must be declared to enable 'main' and 'preRun' and then call the constructor function.
FMOD["preRun"] = prerun; // Will be called before FMOD runs, but after the Emscripten runtime has initialized
FMOD["onRuntimeInitialized"] = main; // Called when the Emscripten runtime has initialized
FMOD["INITIAL_MEMORY"] = 64 * 1024 * 1024; // FMOD Heap defaults to 16mb which is enough for this demo, but set it differently here for demonstration (64mb)
FMODModule(FMOD); // Calling the constructor function with our object

const links = document.querySelectorAll(".navlinks-container a");

var gSystem; // Global 'System' object which has the Studio API functions.
var gSystemCore; // Global 'SystemCore' object which has the Core API functions.
var eventClickButton = {};
var eventTickSlider = {};
var eventHoverLink = {};
var eventSwapToBack = {};
var eventSwapToFront = {};
var eventCardHover = {};
var eventDarkestCanopyMusic = {};
var gEventInstance = {};

var masterVolumeMute = false;
const masterVolumeButton = document.getElementById("volButton");
const masterVolumeSlider = document.getElementById("volSlider");
var playStopState = false;
const playStopButton = document.querySelectorAll("play-stop-button");

links.forEach((link) => {
  link.addEventListener("mouseenter", () => {
    playLinkHover();
  });
  link.addEventListener("click", () => {
    playLinkHover();
  });
});

// Simple error checking function for all FMOD return values.
function CHECK_RESULT(result) {
  if (result != FMOD.OK) {
    var msg = "Error!!! '" + FMOD.ErrorString(result) + "'";

    alert(msg);

    throw msg;
  }
}

// Will be called before FMOD runs, but after the Emscripten runtime has initialized
// Call FMOD file preloading functions here to mount local files.  Otherwise load custom data from memory or use own file system.
function prerun() {
  var fileUrl = "/ressources/FMOD/FModStudioWebProject/Build/Desktop/";
  var fileName;
  var folderName = "/";
  var canRead = true;
  var canWrite = false;

  fileName = ["Master.bank", "Master.strings.bank"];

  for (var count = 0; count < fileName.length; count++) {
    document.querySelector("#display_out2").value =
      "Loading " + fileName[count] + "...";

    FMOD.FS_createPreloadedFile(
      folderName,
      fileName[count],
      fileUrl + fileName[count],
      canRead,
      canWrite
    );
  }
}

// Called when the Emscripten runtime has initialized
function main() {
  // A temporary empty object to hold our system
  var outval = {};
  var result;

  console.log("Creating FMOD System object\n");

  // Create the system and check the result
  result = FMOD.Studio_System_Create(outval);
  CHECK_RESULT(result);

  console.log("grabbing system object from temporary and storing it\n");

  // Take out our System object
  gSystem = outval.val;

  result = gSystem.getCoreSystem(outval);
  CHECK_RESULT(result);

  gSystemCore = outval.val;

  // Optional.  Setting DSP Buffer size can affect latency and stability.
  // Processing is currently done in the main thread so anything lower than 2048 samples can cause stuttering on some devices.
  console.log("set DSP Buffer size.\n");
  result = gSystemCore.setDSPBufferSize(2048, 2);
  CHECK_RESULT(result);

  // Optional.  Set sample rate of mixer to be the same as the OS output rate.
  // This can save CPU time and latency by avoiding the automatic insertion of a resampler at the output stage.
  console.log("Set mixer sample rate");
  result = gSystemCore.getDriverInfo(0, null, null, outval, null, null);
  CHECK_RESULT(result);
  result = gSystemCore.setSoftwareFormat(
    outval.val,
    FMOD.SPEAKERMODE_DEFAULT,
    0
  );
  CHECK_RESULT(result);

  console.log("initialize FMOD\n");

  // 1024 virtual channels
  result = gSystem.initialize(
    1024,
    FMOD.STUDIO_INIT_NORMAL,
    FMOD.INIT_NORMAL,
    null
  );
  CHECK_RESULT(result);

  // Starting up your typical JavaScript application loop
  console.log("initialize Application\n");

  initApplication();

  // Set the framerate to 50 frames per second, or 20ms.
  console.log("Start game loop\n");

  window.setInterval(updateApplication, 20);

  return FMOD.OK;
}

function toggleMute() {
  playClickButton();

  if (!masterVolumeMute) {
    masterVolumeButton.style.backgroundImage =
      "url(../../ressources/generic/VolumeMute.png)";
    masterVolumeSlider.value = 0;
    const event = new Event("input");
    masterVolumeSlider.dispatchEvent(event);

    masterVolumeMute = true;
  } else {
    masterVolumeButton.style.backgroundImage =
      "url(../../ressources/generic/VolumeFull.png)";
    masterVolumeSlider.value = 75;
    const event = new Event("input");
    masterVolumeSlider.dispatchEvent(event);

    masterVolumeMute = false;
  }
}

// Fonction qui modifie le parametre de volume master
function setVolume(val) {
  playTickSlider();

  if (val == 0) {
    masterVolumeButton.style.backgroundImage =
      "url(../../ressources/generic/VolumeMute.png)";
    masterVolumeMute = true;
  } else {
    masterVolumeButton.style.backgroundImage =
      "url(../../ressources/generic/VolumeFull.png)";
  }
  if (gEventInstance) {
    var result = gSystem.setParameterByName(
      "MasterVol_param",
      parseFloat(val),
      false
    );
    CHECK_RESULT(result);
  }
  console.log("La valeur du slider est : " + val);
}

function setParam(val, paramName, ignoreSeekSpeed) {
  playTickSlider();

  var result = gSystem.setParameterByName(
    paramName,
    parseFloat(val),
    ignoreSeekSpeed
  );
  CHECK_RESULT(result);

  console.log("Nouvelle valeur : " + val);
}

function playClickButton() {
  // One-shot event
  var eventInstance = {};
  CHECK_RESULT(eventClickButton.val.createInstance(eventInstance));
  CHECK_RESULT(eventInstance.val.start());

  // Release will clean up the instance when it completes
  CHECK_RESULT(eventInstance.val.release());
}
function playTickSlider() {
  // One-shot event
  var eventInstance = {};
  CHECK_RESULT(eventTickSlider.val.createInstance(eventInstance));
  CHECK_RESULT(eventInstance.val.start());

  // Release will clean up the instance when it completes
  CHECK_RESULT(eventInstance.val.release());
}
function playLinkHover() {
  // One-shot event
  var eventInstance = {};
  CHECK_RESULT(eventHoverLink.val.createInstance(eventInstance));
  CHECK_RESULT(eventInstance.val.start());

  // Release will clean up the instance when it completes
  CHECK_RESULT(eventInstance.val.release());
}

function playSwapToBack() {
  // One-shot event
  var eventInstance = {};
  CHECK_RESULT(eventSwapToBack.val.createInstance(eventInstance));
  CHECK_RESULT(eventInstance.val.start());

  // Release will clean up the instance when it completes
  CHECK_RESULT(eventInstance.val.release());
}
function playSwapToFront() {
  // One-shot event
  var eventInstance = {};
  CHECK_RESULT(eventSwapToFront.val.createInstance(eventInstance));
  CHECK_RESULT(eventInstance.val.start());

  // Release will clean up the instance when it completes
  CHECK_RESULT(eventInstance.val.release());
}
function playCardHover() {
  // One-shot event
  var eventInstance = {};
  CHECK_RESULT(eventCardHover.val.createInstance(eventInstance));
  CHECK_RESULT(eventInstance.val.start());

  // Release will clean up the instance when it completes
  CHECK_RESULT(eventInstance.val.release());
}
function playStopToggle(button, name) {
  playClickButton();

  if (button.dataset.clicked === "true") {
    // Audio
    if (name === "DarkestCanopy_Music") {
      CHECK_RESULT(
        eventDarkestCanopyMusic.val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT)
      );
    }

    // Visuels
    button.style.backgroundImage = "url(../../ressources/generic/Play.png)";

    // Logique
    button.dataset.clicked = "false";
  } else {
    // Audio
    if (name === "DarkestCanopy_Music") {
      CHECK_RESULT(eventDarkestCanopyMusic.val.start());
    }

    // Visuels
    button.style.backgroundImage = "url(../../ressources/generic/Stop.png)";

    // Logique
    button.dataset.clicked = "true";
  }

  console.log(button.dataset.clicked);
}

// Helper function to load a bank by name.
function loadBank(name) {
  var bankhandle = {};
  CHECK_RESULT(
    gSystem.loadBankFile("/" + name, FMOD.STUDIO_LOAD_BANK_NORMAL, bankhandle)
  );
}

// Called from main, does some application setup.  In our case we will load some sounds.
function initApplication() {
  console.log("Loading events\n");

  loadBank("Master.bank");
  loadBank("Master.strings.bank");

  // Get Events
  CHECK_RESULT(
    gSystem.getEvent("event:/Generic/ClickButton", eventClickButton)
  );
  CHECK_RESULT(gSystem.getEvent("event:/Generic/TickSlider", eventTickSlider));
  CHECK_RESULT(gSystem.getEvent("event:/Generic/HoverLink", eventHoverLink));
  CHECK_RESULT(
    gSystem.getEvent("event:/ProjectsPage/SwapToFront", eventSwapToFront)
  );
  CHECK_RESULT(
    gSystem.getEvent("event:/ProjectsPage/SwapToBack", eventSwapToBack)
  );
  CHECK_RESULT(
    gSystem.getEvent("event:/ProjectsPage/CardHover", eventCardHover)
  );

  var descDarkestCanopyMusic = {};
  CHECK_RESULT(
    gSystem.getEvent("event:/DarkestCanopy/Music", descDarkestCanopyMusic)
  );
  CHECK_RESULT(
    descDarkestCanopyMusic.val.createInstance(eventDarkestCanopyMusic)
  );

  var masterVolParameterValue = 75.0; // Initialisation du volume
  CHECK_RESULT(
    gSystem.setParameterByName(
      "MasterVol_param",
      masterVolParameterValue,
      false
    )
  );

  OutputAudioWorklet_resumeAudio();
}

// Called from main, on an interval that updates at a regular rate (like in a game loop).
// Prints out information, about the system, and importantly calles System::udpate().
function updateApplication() {
  var result;
  var cpu = {};

  result = gSystemCore.getCPUUsage(cpu);
  CHECK_RESULT(result);

  var channelsplaying = {};
  result = gSystemCore.getChannelsPlaying(channelsplaying, null);
  CHECK_RESULT(result);

  document.querySelector("#display_out").value =
    "Channels Playing = " +
    channelsplaying.val +
    " : CPU = dsp " +
    cpu.dsp.toFixed(2) +
    "% stream " +
    cpu.stream.toFixed(2) +
    "% update " +
    cpu.update.toFixed(2) +
    "% total " +
    (cpu.dsp + cpu.stream + cpu.update).toFixed(2) +
    "%";

  var numbuffers = {};
  var buffersize = {};
  result = gSystemCore.getDSPBufferSize(buffersize, numbuffers);
  CHECK_RESULT(result);

  var rate = {};
  result = gSystemCore.getSoftwareFormat(rate, null, null);
  CHECK_RESULT(result);

  var sysrate = {};
  result = gSystemCore.getDriverInfo(0, null, null, sysrate, null, null);
  CHECK_RESULT(result);

  var ms = (numbuffers.val * buffersize.val * 1000) / rate.val;
  document.querySelector("#display_out2").value =
    "Mixer rate = " +
    rate.val +
    "hz : System rate = " +
    sysrate.val +
    "hz : DSP buffer size = " +
    numbuffers.val +
    " buffers of " +
    buffersize.val +
    " samples (" +
    ms.toFixed(2) +
    " ms)";

  // Update FMOD
  result = gSystem.update();
  CHECK_RESULT(result);
}