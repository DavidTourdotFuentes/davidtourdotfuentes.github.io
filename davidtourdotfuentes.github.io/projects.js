const videos = document.querySelectorAll(".card-wrapper video");
const cards = document.querySelectorAll(".card");

const cardFaceStatut = []

for (var i = 0; i < videos.length; i++) {
  cardFaceStatut.push(false);
}

// Ajouter un gestionnaire d'évènements à chaque carte
cards.forEach((card) => {
  card.addEventListener("click", () => {

    // Récupération de la position
    let id;
    for (let i = 0; i < cards.length; i++) {
      if (cards[i] === card) {
        id = i;
        break;
      }
    }

    if(cardFaceStatut[id] == false){
      cardFaceStatut[id] = true;
      playSwapToBack();
    }else{
      cardFaceStatut[id] = false;
      playSwapToFront();
    }

    const videoComp = card.querySelector(".card-wrapper video");

    card.classList.toggle("turn");

    videoComp.currentTime = 0;
    videoComp.play();
  });

  card.addEventListener("mouseenter", () => {
    playCardHover();
  });
  card.addEventListener("mouseleave", () => {
    stopCardHover();
  });
});