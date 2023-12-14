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

var playgroundEventsMap = new Map([
  ["DarkestCanopy_Music", {}],
  ["PhantomMemories_MindMap_open", {}],
  ["PhantomMemories_MindMap_close", {}],
  ["PhantomMemories_MindMap_connect", {}],
  ["PhantomMemories_MindMap_connecting_loop", {}],
  ["PhantomMemories_MindMap_connect_fail", {}],
  ["PhantomMemories_MindMap_connect_success", {}],
  ["HideAndFlee_Amb", {}],
  ["LofiClicker_Music_Forest", {}],
  ["LofiClicker_Music_Desert", {}],
  ["LofiClicker_Music_City", {}]
]);

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

function stopAllExamples(){
  CHECK_RESULT(playgroundEventsMap.get("DarkestCanopy_Music").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
  var eventInstance = {};
  CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_close").val.createInstance(eventInstance));
  CHECK_RESULT(eventInstance.val.start());
  CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_connecting_loop").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
  CHECK_RESULT(playgroundEventsMap.get("HideAndFlee_Amb").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
  CHECK_RESULT(playgroundEventsMap.get("LofiClicker_Music_Forest").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
  CHECK_RESULT(playgroundEventsMap.get("LofiClicker_Music_Desert").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
  CHECK_RESULT(playgroundEventsMap.get("LofiClicker_Music_City").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
}

function playOneShotPM(name) {
  // One-shot event
  var eventInstance = {};
  CHECK_RESULT(playgroundEventsMap.get(name).val.createInstance(eventInstance));
  CHECK_RESULT(eventInstance.val.start());
  resetPlayStopToggle(document.querySelector('.media-player#connect .play-stop-button'));
  CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_connecting_loop").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
  toggleAnimationPM01('graphic-line-02', false);
  toggleAnimationPM01('graphic-line-03', false);
}

function ButtonSet(button, state) {
  if(state){
    button.style.backgroundImage = "url(../../ressources/generic/Stop.png)";
    button.dataset.clicked = "true";
  }else{
    button.style.backgroundImage = "url(../../ressources/generic/Play.png)";
    button.dataset.clicked = "false";
  }
}

function resetPlayStopToggle(button){
  button.style.backgroundImage = "url(../../ressources/generic/Play.png)";
  button.dataset.clicked = "false";
}

function playStopToggle(button, name) {
  if (button.dataset.clicked === "true") 
  {
    CHECK_RESULT(playgroundEventsMap.get(name).val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
    
    ButtonSet(button, false);
  } else {
    CHECK_RESULT(playgroundEventsMap.get(name).val.start());

    ButtonSet(button, true);
  }
}

function playStopMusicToggle(button) {
  if (button.dataset.clicked === "true") {

    var result = gSystem.setParameterByName("MusicVol_param", 0.0, false);
    CHECK_RESULT(result);

    button.style.backgroundImage = "url(../../ressources/generic/Music_on.png)";
    button.dataset.clicked = "false";

  } else {

    var result = gSystem.setParameterByName("MusicVol_param", 1.0, false);
    CHECK_RESULT(result);

    button.style.backgroundImage = "url(../../ressources/generic/Music_off.png)";
    button.dataset.clicked = "true";
  }
}

function playStopTogglePM(button, name) {
  if (button.dataset.clicked === "true") {
    if (name === "PhantomMemories_MindMap") {
      // One-shot event
      var eventInstance = {};
      CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_close").val.createInstance(eventInstance));
      CHECK_RESULT(eventInstance.val.start());
      CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_connecting_loop").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
      toggleAnimationPM01('graphic-line-01', false);
    }
    if (name === "PhantomMemories_MindMap_connect") {
      CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_connect").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
      CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_connecting_loop").val.stop(FMOD.STUDIO_STOP_ALLOWFADEOUT));
      toggleAnimationPM01('graphic-line-02', false);
      toggleAnimationPM01('graphic-line-03', false);
    }

    ButtonSet(button, false);

  } else {
    if (name === "PhantomMemories_MindMap") {
      // One-shot event
      var eventInstance = {};
      CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_open").val.createInstance(eventInstance));
      CHECK_RESULT(eventInstance.val.start());
      toggleAnimationPM01('graphic-line-01', true);
    }
    if (name === "PhantomMemories_MindMap_connect") {
      CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_connect").val.start());
      CHECK_RESULT(playgroundEventsMap.get("PhantomMemories_MindMap_connecting_loop").val.start());
      toggleAnimationPM01('graphic-line-02', true);
      toggleAnimationPM01('graphic-line-03', true);
    }

    ButtonSet(button, true);
  }
}

function playStopTrackToggleLC(button, paramName){
  if (button.dataset.clicked === "true") 
  {
    var result = gSystem.setParameterByName(
      paramName,
      parseFloat(0),
      false
    );
    CHECK_RESULT(result);
    
    ButtonSet(button, false);
  } else {
    var result = gSystem.setParameterByName(
      paramName,
      parseFloat(1),
      false
    );
    CHECK_RESULT(result);

    ButtonSet(button, true);
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
  CHECK_RESULT(descDarkestCanopyMusic.val.createInstance(playgroundEventsMap.get("DarkestCanopy_Music")));

  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_open", playgroundEventsMap.get("PhantomMemories_MindMap_open")));
  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_close", playgroundEventsMap.get("PhantomMemories_MindMap_close")));
  
  var descPMMindMapConnect = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_connect", descPMMindMapConnect));
  CHECK_RESULT(descPMMindMapConnect.val.createInstance(playgroundEventsMap.get("PhantomMemories_MindMap_connect")));

  var descPMMindMapConnectingLoop = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_connecting_loop", descPMMindMapConnectingLoop));
  CHECK_RESULT(descPMMindMapConnectingLoop.val.createInstance(playgroundEventsMap.get("PhantomMemories_MindMap_connecting_loop")));

  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_connect_fail", playgroundEventsMap.get("PhantomMemories_MindMap_connect_fail")));
  CHECK_RESULT(gSystem.getEvent("event:/Playground/PhantomMemories_MindMap_connect_success", playgroundEventsMap.get("PhantomMemories_MindMap_connect_success")));

  var descHideAndFleeAmb = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/HideAndFlee_Amb", descHideAndFleeAmb));
  CHECK_RESULT(descHideAndFleeAmb.val.createInstance(playgroundEventsMap.get("HideAndFlee_Amb")));

  var descLofiClikerForest = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/LofiClicker_Music_Forest", descLofiClikerForest));
  CHECK_RESULT(descLofiClikerForest.val.createInstance(playgroundEventsMap.get("LofiClicker_Music_Forest")));
  var descLofiClikerDesert = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/LofiClicker_Music_Desert", descLofiClikerDesert));
  CHECK_RESULT(descLofiClikerDesert.val.createInstance(playgroundEventsMap.get("LofiClicker_Music_Desert")));
  var descLofiClikerCity = {};
  CHECK_RESULT(gSystem.getEvent("event:/Playground/LofiClicker_Music_City", descLofiClikerCity));
  CHECK_RESULT(descLofiClikerCity.val.createInstance(playgroundEventsMap.get("LofiClicker_Music_City")));

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