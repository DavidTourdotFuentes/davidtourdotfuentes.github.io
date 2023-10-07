const fade = document.querySelector(".fade-transition");

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
        TLAnim.set(fade, {display: "block"});
        TLAnim.to(fade, {opacity: '100%', ease: "power2.out", duration: 0.5});

        await delay(2000);
        done();
      },
      enter(){
        TLAnim
        .to(fade, {left: '-100%', ease: "power2.in", duration: 0.5})
        .set(fade, {display: "none"}) 
      }
    }
  ]
});