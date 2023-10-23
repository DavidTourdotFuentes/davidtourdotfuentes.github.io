const firstScreen = document.querySelector(".start-experience");
const fade = document.querySelector(".fade-transition");
const body = document.querySelector("body");

const TLAnim = gsap.timeline();

var isAnimating = false;


var allLinks = document.querySelectorAll('a[href]');
var cbk = function(e) {
 if((e.currentTarget.href === window.location.href)) {
   e.preventDefault();
   e.stopPropagation();
 }

 if(isAnimating === true){
  e.preventDefault();
  e.stopPropagation();
 }
};

for(var i = 0; i < allLinks.length; i++) {
  allLinks[i].addEventListener('click', cbk);
}

function startExperience(){
  TLAnim.from(firstScreen, {display: "flex", opacity: '100%', duration: 1})
  TLAnim.to(firstScreen, {opacity: '0%', ease: "power2.in"})
  .set(firstScreen, {display: "none"})
  main();
  playStartExperience();
}
function startExperiencePlayground(){
  TLAnim.from(firstScreen, {display: "flex", opacity: '100%', duration: 1})
  TLAnim.to(firstScreen, {opacity: '0%', ease: "power2.in", duration: 0})
  .set(firstScreen, {display: "none"})
  main();
  playStartExperience();
  setParam(0, "MusicState_param", false);
}

function delay(n){
  return new Promise((done) => {
    setTimeout(()=> {
      done();
    }, n)
  })
}

barba.init({
  transitions: [
    {
      async leave(data){
        isAnimating = true;

        // Sound
        playSwitchPages();

        // System
        const done = this.async();
        TLAnim.to(fade, {display: "block", opacity: '100%', ease: "power2.out", duration: 0.5})
        //.set(body, {overflow: "hidden"})

        await delay(1500);
        done();

        let href = data.next.url.path;
        if(href == "/projects.html"){
          refreshProjectsPage();
        }
        if(data.next.url.path == "/playground.html"){
          setParam(0, "MusicState_param", false);
        }else{
          setParam(1, "MusicState_param", false);
        }
      },
      enter(){
        TLAnim.from(fade, {display: "block", opacity: '100%', duration: 1})
        TLAnim.to(fade, {opacity: '0%', ease: "power2.in", duration: 0})
        .set(fade, {display: "none"}) 
        isAnimating = false;
      }
    }
  ]
});