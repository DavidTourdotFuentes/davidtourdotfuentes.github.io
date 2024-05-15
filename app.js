const firstScreen = document.querySelector(".start-experience");
const firstScreenButton = document.querySelector(".start-experience button");
const loaderAnim = document.querySelector(".loader");
const fade = document.querySelector(".fade-transition");
const body = document.querySelector("body");
const navLinks = [...document.querySelectorAll(".navlinks-container > a")]
const sections = [...document.querySelectorAll("main > section")]

const TLAnim = gsap.timeline();

var isAnimating = false;

function reloadPage(){
  location.reload();
}

navLinks.forEach(link => link.addEventListener("click", addScrollSmooth))

function addScrollSmooth(e){
  const linkIndex = navLinks.indexOf(e.target);
  window.scrollTo({
    top: sections.map(section => section.offsetTop)[linkIndex],
    behavior: "smooth"
  })
}


window.addEventListener('load', () => {
  firstScreenButton.textContent = "Visit Portfolio";
  firstScreenButton.classList.add('loaded');
  loaderAnim.classList.add('loaded');
  firstScreenButton.disabled = false;

  document.body.style.backgroundImage = "url('ressources/generic/background.jpg')";
})

function startExperience(){
  TLAnim.from(firstScreen, {display: "flex", opacity: '100%', duration: 1})
  TLAnim.to(firstScreen, {opacity: '0%', ease: "power2.in"})
  .set(firstScreen, {display: "none"})
  main();
  playStartExperience();
}

function toggleAnimationPM01(target, animate){
  if(animate){
    document.querySelector('.' + target).classList.add(target + '-extend');
  }else{
    document.querySelector('.' + target).classList.remove(target + '-extend');
  }
}