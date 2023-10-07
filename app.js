const fade = document.querySelector(".fade-transition");
const body = document.querySelector("body");

const TLAnim = gsap.timeline();

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
      },
      enter(){
        TLAnim.from(fade, {display: "block", opacity: '100%', duration: 1})
        TLAnim.to(fade, {opacity: '0%', ease: "power2.in", duration: 0})
        .set(fade, {display: "none"}) 
        //.set(body, {overflow: auto})
      }
    }
  ]
});