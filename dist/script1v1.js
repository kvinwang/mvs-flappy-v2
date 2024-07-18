const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.src = "https://i.ibb.co/Q9yv5Jk/flappy-bird-set.png";

// Bird 2
const img2 = new Image();
img2.src = "https://i.ibb.co/Q9yv5Jk/flappy-bird-set.png";

// general settings
let gamePlaying = false;
// all these need to be on a contract
const gravity = -0.5;   //--> contract
const speed = 6.2; //--> contract
const bird = [51, 36];  //--> contract?
const bird2 = [51, 36]; //--> contract ?
const jump =  9.5; //--> contract
const jump2 =  9.5; //--> contract
const cTenth = (canvas.width / 10); //--> contract, the horizontal position of the bird, same for the 2 birds

let index = 0,
    bestScore = 0, 
    flight, 
    flyHeight, 
    flight2, 
    flyHeight2, 
    currentScore, 
    pipe;

// pipe settings
const pipeWidth = 78; //--> contract
const pipeGap = 270; //--> contract

// do the math random on chain?/in nillion?
const pipeLoc = () => (Math.random() * ((canvas.height - (pipeGap + pipeWidth)) - pipeWidth)) + pipeWidth;

const setup = () => {
  currentScore = 0;
  flight = jump;
  flight2 = jump;

  // set initial flyHeight (middle of screen - size of the bird)
  flyHeight = (canvas.height / 2) - (bird[1] / 2);
  flyHeight2 = (canvas.height / 2) - (bird[1] / 2) + 10;

  // setup first 3 pipes
  pipes = Array(3).fill().map((a, i) => [canvas.width + (i * (pipeGap + pipeWidth)), pipeLoc()]);
}

const render = () => {
  // make the pipe and bird moving 
  index++;

  // ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background first part 
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height, -((index * (speed / 2)) % canvas.width) + canvas.width, 0, canvas.width, canvas.height);
  // background second part
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height, -(index * (speed / 2)) % canvas.width, 0, canvas.width, canvas.height);
  
  // pipe display
  if (gamePlaying){
    pipes.map(pipe => {
      // console.log("pipe",pipe)
      // pipe moving
      pipe[0] -= speed;

      // top pipe
      ctx.drawImage(img, 432, 588 - pipe[1], pipeWidth, pipe[1], pipe[0], 0, pipeWidth, pipe[1]);
      // bottom pipe
      ctx.drawImage(img, 432 + pipeWidth, 108, pipeWidth, canvas.height - pipe[1] + pipeGap, pipe[0], pipe[1] + pipeGap, pipeWidth, canvas.height - pipe[1] + pipeGap);

      // give 1 point & create new pipe
      if(pipe[0] <= -pipeWidth){ // todo count score per player
        currentScore++;
        // check if it's the best score
        bestScore = Math.max(bestScore, currentScore);
        
        // remove & create new pipe --> creating pipe should come from a contract/nillion/be
        pipes = [...pipes.slice(1), [pipes[pipes.length-1][0] + pipeGap + pipeWidth, pipeLoc()]];
        console.log("pipes",pipes);
      }
    
      // if hit the pipe, end (bird1) 
      // need to understand how to manage that in a un-manipolable method
      // need to send all this data to an external code (smart contract or else) and make this check
      if ([
        pipe[0] <= cTenth + bird[0], 
        pipe[0] + pipeWidth >= cTenth, 
        pipe[1] > flyHeight || pipe[1] + pipeGap < flyHeight + bird[1]
      ].every(elem => elem)) {
        gamePlaying = false;
        setup();
      }

      /**
       * This checks if the front edge of the pipe (represented by pipe[0]) is less than or equal to the bird's horizontal position (cTenth + bird[0]).
       * pipe[0] <= cTenth + bird2[0], 
       * 
       * This checks if the back edge of the pipe (calculated by adding      pipeWidth to pipe[0]) is greater than or equal to cTenth.
       * pipe[0] + pipeWidth >= cTenth, 
       * 
       * This checks if the bird has collided with either the top part of the *pipe or the bottom part of the pipe.
       * pipe[1] > flyHeight2 || pipe[1] + pipeGap < flyHeight2 + bird2[1]
       */
      
      // if hit the pipe, end (bird2)
      if ([
        pipe[0] <= cTenth + bird2[0], 
        pipe[0] + pipeWidth >= cTenth, 
        pipe[1] > flyHeight2 || pipe[1] + pipeGap < flyHeight2 + bird2[1]
      ].every(elem => elem)) {
        gamePlaying = false;
        setup();
      }
    })
  }
  
  // draw bird 1
  if (gamePlaying) {

    ctx.drawImage(img, 432, Math.floor((index % 9) / 3) * bird[1], ...bird, cTenth, flyHeight, ...bird);
    flight += gravity;
    flyHeight = Math.min(flyHeight + flight, canvas.height - bird[1]);


    // Display player name on top of the bird
    // ctx.fillStyle = "#000000"; // Set text color
    // ctx.font = "bold 16px Arial"; // Set font size and family
    // ctx.textAlign = "center"; // Align text center
    ctx.fillText("P1", cTenth + bird[0] / 2, flyHeight - 10); // Adjust position as needed
  } else {
    ctx.drawImage(img, 432, Math.floor((index % 9) / 3) * bird[1], ...bird, ((canvas.width / 2) - bird[0] / 2), flyHeight, ...bird);
    flyHeight = (canvas.height / 2) - (bird[1] / 2);
      // text accueil
    ctx.fillText(`Best score : ${bestScore}`, 85, 245);
    ctx.fillText('Click to play', 90, 535);
    ctx.fillText('P1: press s', 100, 600);
    ctx.fillText('P2: press k', 100, 640);
    ctx.font = "bold 30px courier";
  }
  
  // draw bird 2 (example position, adjust as needed)
  if (gamePlaying) {
    ctx.drawImage(img2, 432, Math.floor((index % 9) / 3) * bird2[1], ...bird2, cTenth, flyHeight2, ...bird2);
    flight2 += gravity;
    flyHeight2 = Math.min(flyHeight2 + flight2 , canvas.height - bird2[1]);

    // Display player name on top of the bird
    // ctx.fillStyle = "#000000"; // Set text color
    // ctx.font = "bold 16px Arial"; // Set font size and family
    // ctx.textAlign = "center"; // Align text center
    ctx.fillText("P2", cTenth + bird2[0] / 2, flyHeight2 - 10); // Adjust position as needed
  } else {
    ctx.drawImage(img2, 432, Math.floor((index % 9) / 3) * bird2[1], ...bird2, ((canvas.width / 2) - bird2[0] / 2), flyHeight2, ...bird2);
    flyHeight2 = (canvas.height / 2) - (bird2[1] / 2);
  }

  document.getElementById('bestScore').innerHTML = `Best : ${bestScore}`;
  document.getElementById('currentScore').innerHTML = `Current : ${currentScore}`;

  // tell the browser to perform anim
  window.requestAnimationFrame(render);
}

// launch setup
setup();
img.onload = render;

// start game
document.addEventListener('click', () => gamePlaying = true);
document.addEventListener('keydown', () => gamePlaying = true);
window.addEventListener('keydown', (event) => {
    if (event.key === 's' ) { // 'ArrowUp' or Space key
        flight = jump;
    }
    if (event.key === 'k' ) { // 'ArrowUp' or Space key
        flight2 = jump;
    }
});
window.onclick = () => flight = jump;
