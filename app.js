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
      async leave(){
        const done = this.async();
        TLAnim.to(fade, {display: "block", opacity: '100%', ease: "power2.out", duration: 1})
        //.set(body, {overflow: "hidden"})

        await delay(2000);
        done();
      },
      enter(){
        TLAnim.from(fade, {display: "block", opacity: '100%'})
        TLAnim.to(fade, {opacity: '0%', ease: "power2.in", duration: 1})
        .set(fade, {display: "none"}) 
        //.set(body, {overflow: auto})
      }
    }
  ]
});