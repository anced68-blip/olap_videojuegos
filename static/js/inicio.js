// ============================================================
// MARIO GAME - inicio.js
// ============================================================

(function () {
    "use strict";

    // ── CANVAS STARS ────────────────────────────────────────
    const canvas = document.getElementById("stars-canvas");
    const ctx    = canvas.getContext("2d");
    let stars    = [];

    function resizeCanvas() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initStars() {
        stars = [];
        for (let i = 0; i < 140; i++) {
            stars.push({
                x:    Math.random() * canvas.width,
                y:    Math.random() * canvas.height * 0.75,
                r:    Math.random() * 1.4 + 0.3,
                a:    Math.random(),
                da:   (Math.random() * 0.006 + 0.002) * (Math.random() < 0.5 ? 1 : -1),
            });
        }
    }

    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            s.a = Math.max(0.1, Math.min(1, s.a + s.da));
            if (s.a <= 0.1 || s.a >= 1) s.da *= -1;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${s.a})`;
            ctx.fill();
        });
        requestAnimationFrame(drawStars);
    }

    resizeCanvas();
    initStars();
    drawStars();
    window.addEventListener("resize", () => { resizeCanvas(); initStars(); });

    // ── GAME STATE ───────────────────────────────────────────
    const mario      = document.getElementById("mario");
    const openBlock  = document.getElementById("openBlock");
    const gameScene  = document.querySelector(".game-scene");
    const winOverlay = document.getElementById("win-overlay");
    const scoreEl    = document.getElementById("score-value");

    let posX       = 100;
    let posY       = 0;
    let velX       = 0;
    let velY       = 0;
    let isJumping  = false;
    let gameOver   = false;
    let score      = 0;
    let facingLeft = false;

    const GROUND_Y    = 0;
    const GRAVITY     = 0.55;
    const MOVE_SPEED  = 4.5;
    const JUMP_FORCE  = 14;
    const MARIO_W     = 44;
    const MARIO_H     = 60;

    // Block position (set after DOM ready, from computed styles or defaults)
    // ── INPUT ────────────────────────────────────────────────
    const keys = { left: false, right: false, jump: false };

    document.addEventListener("keydown", e => {
        if (gameOver) return;
        if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft")  keys.left  = true;
        if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keys.right = true;
        if ((e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") && !isJumping) {
            jump();
            e.preventDefault();
        }
    });

    document.addEventListener("keyup", e => {
        if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft")  keys.left  = false;
        if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keys.right = false;
    });

    // Mobile buttons
    const btnLeft  = document.getElementById("btn-left");
    const btnRight = document.getElementById("btn-right");
    const btnJump  = document.getElementById("btn-jump");

    if (btnLeft) {
        btnLeft.addEventListener("pointerdown",  () => { keys.left  = true;  });
        btnLeft.addEventListener("pointerup",    () => { keys.left  = false; });
        btnLeft.addEventListener("pointerleave", () => { keys.left  = false; });
    }
    if (btnRight) {
        btnRight.addEventListener("pointerdown",  () => { keys.right = true;  });
        btnRight.addEventListener("pointerup",    () => { keys.right = false; });
        btnRight.addEventListener("pointerleave", () => { keys.right = false; });
    }
    if (btnJump) {
        btnJump.addEventListener("pointerdown", () => { if (!isJumping) jump(); });
    }

    function jump() {
        isJumping = true;
        velY = JUMP_FORCE;
    }

    // ── SCORE ────────────────────────────────────────────────
    function addScore(pts) {
        score += pts;
        if (scoreEl) scoreEl.textContent = String(score).padStart(6, "0");
    }

    // ── COLLISION ────────────────────────────────────────────
    function checkBlockHit() {
        const groundH    = 80;
        const sceneH     = gameScene.offsetHeight;

        // Mario top in scene pixel coords (y=0 at top of scene)
        const marioTop   = sceneH - groundH - posY - MARIO_H;
        const marioLeft  = posX;
        const marioRight = posX + MARIO_W;

        // Block coords in scene pixel space
        const bRect  = openBlock.getBoundingClientRect();
        const sRect  = gameScene.getBoundingClientRect();
        const bBot   = bRect.bottom - sRect.top;
        const bLeft  = bRect.left   - sRect.left;
        const bRight = bRect.right  - sRect.left;

        // Horizontal overlap (small inset to avoid edge grazes)
        const horizOk = marioRight > bLeft + 4 && marioLeft < bRight - 4;

        // Mario's head hits block bottom while rising (velY > 0 = moving up in this system)
        const hitFromBelow = marioTop <= bBot + 6 && marioTop >= bBot - 30;

        return horizOk && hitFromBelow;
    }

    // ── WIN ──────────────────────────────────────────────────
    let blockHit = false;

    function triggerWin() {
        if (blockHit) return;
        blockHit = true;
        gameOver = true;

        openBlock.classList.add("hit");
        addScore(500);
        spawnParticles();

        // coin pop
        const coin = document.createElement("div");
        coin.className = "coin-pop";
        coin.textContent = "🪙";
        const br = openBlock.getBoundingClientRect();
        const sr = gameScene.getBoundingClientRect();
        coin.style.left = (br.left - sr.left + br.width / 2 - 12) + "px";
        coin.style.top  = (br.top  - sr.top  - 10) + "px";
        coin.style.position = "absolute";
        coin.style.zIndex   = "99";
        gameScene.appendChild(coin);
        setTimeout(() => coin.remove(), 700);

        setTimeout(() => {
            winOverlay.classList.add("show");
        }, 700);
    }

    function spawnParticles() {
        const emojis = ["⭐","🎮","🏆","✨","💥","🎯","🎉"];
        for (let i = 0; i < 18; i++) {
            const p  = document.createElement("div");
            p.className = "particle";
            p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            const bRect = openBlock.getBoundingClientRect();
            p.style.left = bRect.left + bRect.width / 2 + "px";
            p.style.top  = bRect.top  + "px";
            const angle  = (Math.PI * 2 / 18) * i;
            const dist   = 80 + Math.random() * 80;
            p.style.setProperty("--tx", Math.cos(angle) * dist + "px");
            p.style.setProperty("--ty", Math.sin(angle) * dist + "px");
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 1300);
        }
    }

    // ── ENTER DASHBOARD ──────────────────────────────────────
    const btnEnter = document.getElementById("btn-enter-dashboard");
    if (btnEnter) {
        btnEnter.addEventListener("click", () => {
            window.location.href = "/dashboard";
        });
    }

    // ── GAME LOOP ────────────────────────────────────────────
    const sceneW = () => gameScene.offsetWidth;
    const sceneH = () => gameScene.offsetHeight;
    const GROUND_H = 80;

    function update() {
        if (!gameOver) {
            // Horizontal movement
            let moving = false;
            if (keys.left) {
                velX = -MOVE_SPEED;
                facingLeft = true;
                moving = true;
            } else if (keys.right) {
                velX = MOVE_SPEED;
                facingLeft = false;
                moving = true;
            } else {
                velX *= 0.75; // friction
            }

            posX += velX;

            // Clamp horizontal
            const maxX = sceneW() - MARIO_W - 10;
            if (posX < 5)    posX = 5;
            if (posX > maxX) posX = maxX;

            // Gravity
            if (isJumping || posY > 0) {
                velY -= GRAVITY;
                posY += velY;
            }

            // Ground collision
            if (posY <= GROUND_Y) {
                posY      = GROUND_Y;
                velY      = 0;
                isJumping = false;
            }

            // Block collision
            if (isJumping && velY > 0 && checkBlockHit()) {
                triggerWin();
                velY = -8; // bounce down
            }

            // Apply position
            mario.style.left   = posX + "px";
            mario.style.bottom = (GROUND_H + posY) + "px";

            // Direction
            mario.style.transform = facingLeft ? "scaleX(-1)" : "scaleX(1)";

            // Walking class
            if (moving && !isJumping) {
                mario.classList.add("walking");
            } else {
                mario.classList.remove("walking");
            }

            // Passive score
            if (Math.random() < 0.008) addScore(10);
        }

        requestAnimationFrame(update);
    }

    update();

})();
