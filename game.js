// GLOBAL VARIABLES
let screens, game, canvas, context;
const keys = {};

// Set the audio variables
var jump = new Audio();
var over = new Audio(); 
jump.src = "jumpSound.mp3";
over.src = "gameoverSound.mp3";

// HELPER FUNCTIONS
const $ = (selector) => {
    let elements = document.querySelectorAll(selector);

    if(elements.length === 1) {
        elements = elements[0];
    }

    return elements;
} // $()

const randomInt = (min, max) => Math.round(Math.random() * (max - min) + min);
const getRandomColor = () => `#${Math.floor(Math.random()*16777215).toString(16)}`;
const hide = (element) => element.style.display = 'none';
const show = (element) => element.style.display = 'block';

// CLASS DECLARATIONS
class CanvasItem {
    constructor(x, y, width, height, color, alignment) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.size = width;
        this.color = color || getRandomColor();
        this.alignment = alignment || 'left';
        this.isRectangle = false;
    } // constructor()

    render() {
        context.beginPath();
        context.fillStyle = this.color;

        if(this.isRectangle) {
            context.fillRect(this.x, this.y, this.width, this.height);
        } else {
            context.font = `${this.size}px sans-serif`;
            context.textAlign = this.alignment;
            context.textBaseline = 'hanging';
            context.fillText(this.text, this.x, this.y);
        }

        context.closePath();
    } // render()
} // CanvasItem

class Player extends CanvasItem {
    constructor(emoji, size, gravity, jumpForce, maxJumpForce) {
        super(25, 0, size, size);

        this.text = emoji;
        
        this.dy = 0;
        this.jumpForce = jumpForce;
        this.maxJumpForce = maxJumpForce;
        this.jumpTimer = 0;
        this.gravity = gravity;
        this.grounded = false;
    } // constructor()

    jump() {
        if(this.grounded && !this.jumpTimer) {
            // player jumps if and only if the player is on the ground and the jump timer hasn't started
            this.jumpTimer = 1;
            this.dy = -1 * this.jumpFocre;
            jump.play();
        } else if(this.jumpTimer > 0 && this.jumpTimer < this.maxJumpForce) {
            // the player is coming back to the ground
            this.jumpTimer++;
            this.dy = -1 * this.jumpForce - (this.jumpTimer / 50);
        }
    } // jump()

    update() {
        if(keys['Space'] || keys['KeyW'] || keys['ArrowUp']) {
            this.jump();
        } else {
            this.jumpTimer = 0;
        }

        // apply the y directional force
        this.y += this.dy;

        // apply gravity
        if((this.y + this.height) < canvas.height) {
            this.dy += this.gravity;
            this.grounded = false;
        } else {
            this.dy = 0;
            this.grounded = true;
            this.y = canvas.height - this.height;
        }

        this.render();
    } // update()
} // Player

class Obstacle extends CanvasItem {
    constructor(size, gameSpeed) {
        super(canvas.width + (size * .7), canvas.height - size, size * .7, size);

        this.isRectangle = true;
        this.dx = -1 * gameSpeed;
        this.gameSpeed = gameSpeed;
    } // constructor()

    update() {
        this.x += this.dx;
        this.render();
        this.dx - this.gameSpeed;
    } // update()
} // Obstacle

class ScoreBoard extends CanvasItem {
    constructor(label, score, x, y, size, alignment, color) {
        super(x, y, size, size, color || '#333333', alignment);
        this.label = label;
        this.score = score;
    } // constructor()

    update(score) {
        this.score = score;
        this.text = `${this.label}: ${this.score}`;
        this.render();
    } // update()
} // ScoreBoard

class Game {
    constructor(options = {}) {
        // set the game options or default values
        this.avatar = options.avatar || '🤗';
        
        // set gravity and jump force to make jumps more realistic
        this.gravity = options.gravity || 1;
        this.gameSpeed = options.gameSpeed || 3;
        this.jumpForce = options.jumpForce || 15;
        this.maxJumpForce = options.maxJumpForce || 25;

        // initialize to keep track of the time / the frequency for obstacles
        this.initalSpawnTimer = options.spawnTimer || 200;
        this.spawnTimer = this.initalSpawnTimer;

        // other game components
        this.obstacles = [];

        this.score = 0;
        this.highScore = localStorage.getItem('highscore') || 0;

        this.isPlaying = true;

        // initialize the canvas
        canvas = $('#game');
        context = canvas.getContext('2d');
        context.font = '20px sans-serif';
    } // constructor

    start() {
        // Stop the game over sound 
        if(!over.paused && !over.ended) {
            over.pause();
            over.currentTime = 0;
        }

        // update the canvas size
        const container = $('.game__container');
        canvas.height = container.offsetHeight;
        canvas.width = container.offsetWidth;

        // create the player
        this.player = new Player(this.avatar, 40, this.gravity, this.jumpForce, this.maxJumpForce);

        // create the scoreboards
        this.scoreboards = {
            main: new ScoreBoard('Score', this.score, 25, 25, 20),
            high: new ScoreBoard('High Score', this.highScore, canvas.width - 25, 25, 20, 'right')
        };

        // begin animating the canvas
        requestAnimationFrame(() => this.animate());
    } // start()

    animate() {
        // clear the canvas 
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        this.updateObstacles();
        this.player.update();
        this.updateScore();

        // continuously animate the canvas
        if(this.isPlaying) {
            requestAnimationFrame(() => this.animate());
        }
    } // animate()

    updateObstacles() {
        this.spawnTimer--;

        if(this.spawnTimer <= 0) {
            this.addObstacle();

            this.spawnTimer = this.initalSpawnTimer - (this.gameSpeed * 8);

            if(this.spawnTimer < 60) { // max difficulty
                this.spawnTimer = 60;
            }
        }

        this.obstacles.forEach((obstacle, i, array) => {
            obstacle.update();

            // remove the obstacle once it goes off screen
            if((obstacle.x + obstacle.width) < 0) {
                array.splice(i, 1);
            }

            const p = this.player;

            // check for a potential collision
            if((p.x < (obstacle.x + obstacle.width)) &&
               ((p.x + p.width) > obstacle.x) &&
               (p.y < (obstacle.y + obstacle.height)) &&
               ((p.y + p.height) > obstacle. y)) {
                this.end();
            }
        });
    } // updateObstacles()

    addObstacle() {
        const size = randomInt(20, 60);
        this.obstacles.push(new Obstacle(size, this.gameSpeed));
    } // addObstacle()

    updateScore() {
        this.score++;

        if(this.score > this.highScore) {
            this.highScore = this.score;
        }

        this.scoreboards.main.update(this.score);
        this.scoreboards.high.update(this.highScore);
    } // updateScore()

    end() {
        // Play the game over sound
        over.play();

        // stop the animations 
        this.isPlaying = false;

        // update the score one last time
        this.updateScore();

        // save the high score to local storage
        localStorage.setItem('highscore', this.highScore);

        // update the results
        const resultsContainer = $('#results');
        resultsContainer.innerHTML = '';
        resultsContainer.insertAdjacentHTML('afterbegin', `<h2>Score: ${this.score}</h2><h3>High Score: ${this.highScore}</h3>`);

        // display end screen
        hide(screens.game);
        show(screens.end);
    } // end()
} // Game

// INITIALIZE THE GAME
window.addEventListener('load', () => {
      // define the screens
      screens = {
        start: $('#start-screen'),
        instructions: $('#instructions-screen'),
        avatar: $('#avatar-picker'),
        game: $('#game-screen'),
        end: $('#end-screen')
    }

    // move from the welcome screen to the instructions
    $('#start-screen button').addEventListener('click', () => {
        hide(screens.start);
        show(screens.instructions);
    });

    // move from the welcome screen to the avatar picker
    $('#instructions-screen button').addEventListener('click', () => {
        hide(screens.instructions);
        show(screens.avatar);
    });

    // select the avatar
    $('.select-avatar').forEach(option => {
        option.addEventListener('click', event => {
            hide(screens.avatar);
            show(screens.game);

            // start the game
            game = new Game({ avatar: event.target.innerHTML });
            game.start();
        });
    });

    // restart the game, if desired
    $('#end-screen button').addEventListener('click', () => {
        hide(screens.end);
        show(screens.avatar);
    });

    // attach the keyboard events
    document.addEventListener('keydown', event => keys[event.code] = true);
    document.addEventListener('keyup', event => keys[event.code] = false);

    // display the high score
    $('#high-score').innerHTML = localStorage.getItem('highscore') || 0;
});