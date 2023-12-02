var FMOD = {}; // FMOD global object which must be declared to enable 'main' and 'preRun' and then call the constructor function.
FMOD["preRun"] = prerun; // Will be called before FMOD runs, but after the Emscripten runtime has initialized
//FMOD["onRuntimeInitialized"] = main; // Called when the Emscripten runtime has initialized
FMOD["INITIAL_MEMORY"] = 64 * 1024 * 1024; // FMOD Heap defaults to 16mb which is enough for this demo, but set it differently here for demonstration (64mb)
FMODModule(FMOD); // Calling the constructor function with our object

const links = document.querySelectorAll(".navlinks-container a, .softwares-used-section a");

var gSystem; // Global 'System' object which has the Studio API functions.
var gSystemCore; // Global 'SystemCore' object which has the Core API functions.
var eventStartExperience = {};
var eventClickButton = {};
var eventTickSlider = {};
var eventHoverLink = {};
var eventSwitchPages = {};
var eventSwapToBack = {};
var eventSwapToFront = {};
var eventCardHover = {};
var eventWebsiteMusic = {};
var eventDarkestCanopyMusic = {};
var eventPMMindMapOpen = {};
var eventPMMindMapClose = {};
var eventPMMindMapConnect = {};
var eventPMMindMapConnectLoop = {};
var eventPMMindMapConnectionFail = {};
var eventPMMindMapConnectionSucess = {};
var eventHideAndFleeAmb = {};
var gEventInstance = {};

var masterVolumeMute = false;
const masterVolumeButton = document.getElementById("volButton");
const masterVolumeSlider = document.getElementById("volSlider");
var playStopState = false;

links.forEach((link) => {
  link.addEventListener("mouseenter", () => {
    playLinkHover();
  });
  link.addEventListener("click", () => {
    playClickButton();
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

  // Create the system and check the result
  result = FMOD.Studio_System_Create(outval);
  CHECK_RESULT(result);

  // Take out our System object
  gSystem = outval.val;

  result = gSystem.getCoreSystem(outval);
  CHECK_RESULT(result);

  gSystemCore = outval.val;

  // Optional.  Setting DSP Buffer size can affect latency and stability.
  // Processing is currently done in the main thread so anything lower than 2048 samples can cause stuttering on some devices.
  result = gSystemCore.setDSPBufferSize(2048, 2);
  CHECK_RESULT(result);

  // Optional.  Set sample rate of mixer to be the same as the OS output rate.
  // This can save CPU time and latency by avoiding the automatic insertion of a resampler at the output stage.
  result = gSystemCore.getDriverInfo(0, null, null, outval, null, null);
  CHECK_RESULT(result);
  result = gSystemCore.setSoftwareFormat(
    outval.val,
    FMOD.SPEAKERMODE_DEFAULT,
    0
  );
  CHECK_RESULT(result);

  // 1024 virtual channels
  result = gSystem.initialize(
    1024,
    FMOD.STUDIO_INIT_NORMAL,
    FMOD.INIT_NORMAL,
    null
  );
  CHECK_RESULT(result);

  // Starting up your typical JavaScript application loop

  initApplication();

  // Set the framerate to 50 frames per second, or 20ms.

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
  var result = gSystem.setParameterByName(
    paramName,
    parseFloat(val),
    ignoreSeekSpeed
  );
  CHECK_RESULT(result);
}

function playStartExperience() {
  // One-shot event
  var eventInstance = {};
  CHECK_RESULT(eventStartExperience.val.createInstance(eventInstance));
  CHECK_RESULT(eventInstance.val.start());

  // Release will clean up the instance when it completes
  CHECK_RESULT(eventInstance.val.release());
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

function playSwitchPages() {
  // One-shot event
  var eventInstance = {};
  CHECK_RESULT(eventSwitchPages.val.createInstance(eventInstance));
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
  CHECK_RESULT(eventCardHover.val.start());
}
function stopCardHover() {
  CHECK_RESULT(eventCardHover.val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
}

function stopAllExemples(){
  CHECK_RESULT(eventDarkestCanopyMusic.val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
  CHECK_RESULT(eventHideAndFleeAmb.val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
}

function playOneShot(name) {
  if(name === "PhantomMemories_MindMap_connect_fail") {
    // One-shot event
    var eventInstance = {};
    CHECK_RESULT(eventPMMindMapConnectionFail.val.createInstance(eventInstance));
    CHECK_RESULT(eventInstance.val.start());
    resetPlayStopToggle(document.querySelector('.media-player#connect .play-stop-button'));
    toggleAnimationPM01('graphic-line-02', false);
    toggleAnimationPM01('graphic-line-03', false);
  }
  if(name === "PhantomMemories_MindMap_connect_success") {
    // One-shot event
    var eventInstance = {};
    CHECK_RESULT(eventPMMindMapConnectionSucess.val.createInstance(eventInstance));
    CHECK_RESULT(eventInstance.val.start());
    resetPlayStopToggle(document.querySelector('.media-player#connect .play-stop-button'));
    toggleAnimationPM01('graphic-line-02', false);
    toggleAnimationPM01('graphic-line-03', false);
  }
}

function resetPlayStopToggle(button){
  button.style.backgroundImage = "url(../../ressources/generic/Play.png)";
  button.dataset.clicked = "false";
}

function playStopToggle(button, name) {
  //playClickButton();

  if (button.dataset.clicked === "true") {
    // Audio
    if (name === "DarkestCanopy_Music") {
      CHECK_RESULT(eventDarkestCanopyMusic.val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
    }
    if (name === "HideAndFlee_Amb") {
      CHECK_RESULT(eventHideAndFleeAmb.val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
    }
    if (name === "PhantomMemories_MindMap") {
      // One-shot event
      var eventInstance = {};
      CHECK_RESULT(eventPMMindMapClose.val.createInstance(eventInstance));
      CHECK_RESULT(eventInstance.val.start());
      toggleAnimationPM01('graphic-line-01', false);
    }
    if (name === "PhantomMemories_MindMap_connect") {
      CHECK_RESULT(eventPMMindMapConnect.val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
      CHECK_RESULT(eventPMMindMapConnectLoop.val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
      toggleAnimationPM01('graphic-line-02', false);
      toggleAnimationPM01('graphic-line-03', false);
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
    if (name === "HideAndFlee_Amb") {
      CHECK_RESULT(eventHideAndFleeAmb.val.start());
    }
    if (name === "PhantomMemories_MindMap") {
      // One-shot event
      var eventInstance = {};
      CHECK_RESULT(eventPMMindMapOpen.val.createInstance(eventInstance));
      CHECK_RESULT(eventInstance.val.start());
      toggleAnimationPM01('graphic-line-01', true);
    }
    if (name === "PhantomMemories_MindMap_connect") {
      CHECK_RESULT(eventPMMindMapConnect.val.start());
      toggleAnimationPM01('graphic-line-02', true);
      toggleAnimationPM01('graphic-line-03', true);
    }

    // Visuels
    button.style.backgroundImage = "url(../../ressources/generic/Stop.png)";

    // Logique
    button.dataset.clicked = "true";
  }
}

function initApplication() {
  loadBank("Master.bank");
  loadBank("Master.strings.bank");

  // Get Events
  var descWebsiteMusic = {};
  CHECK_RESULT(gSystem.getEvent("event:/Music/Music", descWebsiteMusic));
  CHECK_RESULT(descWebsiteMusic.val.createInstance(eventWebsiteMusic));
  CHECK_RESULT(eventWebsiteMusic.val.start());

  CHECK_RESULT(gSystem.getEvent("event:/Generic/StartExperience", eventStartExperience));
  CHECK_RESULT(gSystem.getEvent("event:/Generic/ClickButton", eventClickButton));
  CHECK_RESULT(gSystem.getEvent("event:/Generic/TickSlider", eventTickSlider));
  CHECK_RESULT(gSystem.getEvent("event:/Generic/HoverLink", eventHoverLink));
  CHECK_RESULT(gSystem.getEvent("event:/Generic/SwitchPages", eventSwitchPages));
  CHECK_RESULT(gSystem.getEvent("event:/ProjectsPage/SwapToFront", eventSwapToFront));
  CHECK_RESULT(gSystem.getEvent("event:/ProjectsPage/SwapToBack", eventSwapToBack));

  var descCardHover = {};
  CHECK_RESULT(gSystem.getEvent("event:/ProjectsPage/CardHover", descCardHover));
  CHECK_RESULT(descCardHover.val.createInstance(eventCardHover));

  var descDarkestCanopyMusic = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/DarkestCanopy_Music", descDarkestCanopyMusic));
  CHECK_RESULT(descDarkestCanopyMusic.val.createInstance(eventDarkestCanopyMusic));

  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_open", eventPMMindMapOpen));
  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_close", eventPMMindMapClose));
  
  var descPMMindMapConnect = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_connect", descPMMindMapConnect));
  CHECK_RESULT(descPMMindMapConnect.val.createInstance(eventPMMindMapConnect));

  var descPMMindMapConnectLoop = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_connecting_loop", descPMMindMapConnectLoop));
  CHECK_RESULT(descPMMindMapConnectLoop.val.createInstance(eventPMMindMapConnectLoop));

  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_connect_fail", eventPMMindMapConnectionFail));
  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_connect_success", eventPMMindMapConnectionSucess));

  var descHideAndFleeAmb = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/HideAndFlee_Amb", descHideAndFleeAmb));
  CHECK_RESULT(descHideAndFleeAmb.val.createInstance(eventHideAndFleeAmb));

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

// Helper function to load a bank by name.
function loadBank(name) {
  var bankhandle = {};
  CHECK_RESULT(
    gSystem.loadBankFile("/" + name, FMOD.STUDIO_LOAD_BANK_NORMAL, bankhandle)
  );
}

// Called from main, on an interval that updates at a regular rate (like in a game loop).
// Prints out information, about the system, and importantly calles System::udpate().
function updateApplication() {
  var result;
  var cpu = {};

  result = gSystemCore.getCPUUsage(cpu);
  CHECK_RESULT(result);

  var sysrate = {};
  result = gSystemCore.getDriverInfo(0, null, null, sysrate, null, null);
  CHECK_RESULT(result);

  document.querySelector("#display_out").value = "(" + sysrate.val + "Hz, CPU : " + (cpu.dsp + cpu.stream + cpu.update).toFixed(2) + "%)";

  // Update FMOD
  result = gSystem.update();
  CHECK_RESULT(result);
}