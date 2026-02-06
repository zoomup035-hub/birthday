// ===== BIRTHDAY LOADING SCREEN MANAGER =====
class BirthdayLoadingScreen {
    constructor() {
        this.container = document.getElementById('loading-screen');
        this.canvas = document.getElementById('loading-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.percentText = document.getElementById('loading-percent');
        this.loadingStatusText = document.querySelector('.loading-text p');
        this.giftBox = document.querySelector('.gift-box');
        this.giftLid = document.querySelector('.gift-lid');

        this.particles = [];
        this.floatingElements = [];
        this.progress = 0;
        this.isComplete = false;
        this.priority1Loaded = false;

        // Initialize Loading Manager
        this.manager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.manager);

        this.setupManager();
        this.init();
    }

    setupManager() {
        // Fail-Safe Timeout: 12 seconds
        this.failSafeTimeout = setTimeout(() => {
            if (!this.priority1Loaded) {
                console.warn("Loading Fail-Safe triggered after 12s");
                this.completeLoading();
            }
        }, 12000);

        this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            this.progress = (itemsLoaded / itemsTotal) * 100;
            const displayProgress = Math.floor(this.progress);
            this.percentText.textContent = displayProgress;

            if (this.loadingStatusText) {
                this.loadingStatusText.textContent = `Unwrapping the magic... ${displayProgress}%`;
            }

            // Occasionally spawn specialized particles based on progress
            if (Math.random() < 0.1) {
                this.spawnProgressParticle();
            }
        };

        this.manager.onLoad = () => {
            clearTimeout(this.failSafeTimeout);
            if (!this.priority1Loaded) {
                this.completeLoading();
            }
        };

        this.manager.onError = (url) => {
            console.error('There was an error loading ' + url);
        };
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Start background loop
        this.createInitialFloatingElements();
        this.animate();

        // Start REAL asset loading
        this.loadAssets();

        // Initial gift box float animation
        gsap.to(this.giftBox, {
            y: -20,
            rotation: 2,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }

    loadAssets() {
        // Priority 1: Core Assets (Introduction)
        // These are items that MUST be loaded before we show the "Click to Begin"
        // Since this is a client-side app with mostly local files, we'll pre-load key textures
        const priority1Assets = [
            'paper-rustle.mp3',
            'magic-whoosh.mp3',
            'blow-out.mp3'
        ];

        // Background Priority: Memory Cloud textures
        const memoryImages = ['./img1.jpg', './img2.jpg', './img3.jpg', './img4.jpg', './img5.jpg', './img6.jpg', './img7.jpg'];

        // We load them all through the manager
        // But the 'onLoad' logic will trigger when the manager thinks everything is done.
        // If we wanted true "background" we would use a separate manager, but the user 
        // asked for a single LoadingManager with a timeout.

        // Load textures
        memoryImages.forEach(img => {
            this.textureLoader.load(img);
        });

        // For non-Three.js assets, we can manually increment/decrement or just let them be
        // THREE.LoadingManager tracks ANY loader that uses it.
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createInitialFloatingElements() {
        for (let i = 0; i < 15; i++) {
            this.floatingElements.push(new FloatingElement(this.canvas.width, this.canvas.height));
        }
    }

    spawnProgressParticle() {
        const x = this.canvas.width / 2 + (Math.random() - 0.5) * 100;
        const y = this.canvas.height / 2 + 50;
        this.particles.push(new Particle(x, y, true));
    }

    completeLoading() {
        if (this.priority1Loaded) return;
        this.priority1Loaded = true;
        this.isComplete = true;

        // Premium GSAP Sequence for Gift Opening
        const tl = gsap.timeline();

        tl.to(this.giftBox, {
            scale: 1.2,
            rotation: 0,
            duration: 0.5,
            ease: "back.out(1.7)"
        })
            .to(this.giftLid, {
                y: -150,
                rotation: 15,
                opacity: 0,
                duration: 0.8,
                ease: "power2.out"
            }, "-=0.1")
            .call(() => {
                this.createExplosion();
                if (audioManager) audioManager.play('magic');
            })
            .to(this.container, {
                opacity: 0,
                duration: 1.2,
                delay: 1,
                ease: "power2.inOut",
                onComplete: () => {
                    this.container.style.visibility = 'hidden';
                    // Show main content
                    const mainContent = document.getElementById('main-content');
                    if (mainContent) mainContent.classList.remove('hidden');

                    // Trigger intro text reveal and enable start button
                    if (window.storyApp) {
                        window.storyApp.revealIntroText();
                    }
                }
            });
    }

    createExplosion() {
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;

        for (let i = 0; i < 150; i++) {
            this.particles.push(new Particle(x, y, false));
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update & Draw Floating Background Elements
        this.floatingElements.forEach((el, index) => {
            el.update(this.canvas.height);
            el.draw(this.ctx);
        });

        // Update & Draw Particles
        this.particles.forEach((p, index) => {
            p.update();
            p.draw(this.ctx);
            if (p.alpha <= 0) {
                this.particles.splice(index, 1);
            }
        });

        if (!this.isComplete || this.particles.length > 0) {
            requestAnimationFrame(() => this.animate());
        }
    }
}

class FloatingElement {
    constructor(canvasWidth, canvasHeight) {
        this.reset(canvasWidth, canvasHeight);
        this.y = Math.random() * canvasHeight; // Start at random height initially
    }

    reset(canvasWidth, canvasHeight) {
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + 50;
        this.size = 10 + Math.random() * 20;
        this.speed = 0.5 + Math.random() * 1.5;
        this.type = Math.random() > 0.5 ? 'heart' : 'balloon';
        this.color = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff'][Math.floor(Math.random() * 5)];
        this.opacity = 0.1 + Math.random() * 0.2;
        this.angle = Math.random() * Math.PI * 2;
        this.wobble = Math.random() * 2;
    }

    update(canvasHeight) {
        this.y -= this.speed;
        this.angle += 0.02;

        if (this.y < -50) {
            this.y = canvasHeight + 50;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.translate(this.x + Math.sin(this.angle) * 10, this.y);

        if (this.type === 'heart') {
            const s = this.size / 20;
            ctx.scale(s, s);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-10, -10, -20, 5, 0, 15);
            ctx.bezierCurveTo(20, 5, 10, -10, 0, 0);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.8, this.size, 0, 0, Math.PI * 2);
            ctx.fill();
            // Balloon string
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.moveTo(0, this.size);
            ctx.lineTo(Math.sin(this.angle) * 5, this.size + 15);
            ctx.stroke();
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, isRise = false) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * (isRise ? 2 : 15);
        this.vy = isRise ? -(Math.random() * 3 + 2) : (Math.random() - 0.5) * 15 - 5;
        this.size = Math.random() * 6 + 2;
        this.color = ['#ff4d94', '#ffea00', '#48dbfb', '#ffffff', '#ff9ff3'][Math.floor(Math.random() * 5)];
        this.alpha = 1;
        this.gravity = isRise ? 0 : 0.25;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.decay = 0.01 + Math.random() * 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= this.decay;
        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (Math.random() > 0.5) {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// Initialize loading screen when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // We wait for window.load for the StoryManager, but loading screen can start early
    if (window.THREE && window.gsap) {
        window.loadingScreen = new BirthdayLoadingScreen();
    } else {
        console.error("Critical libraries (THREE or GSAP) not detected. Loading halted.");
        const status = document.querySelector('.loading-text p');
        if (status) status.textContent = "Error: Magic libraries missing. Please refresh.";
    }
});

// --- Cinematic Effects Manager (God Rays, Parallax, Bokehs) ---
// --- Audio Manager ---
class AudioManager {
    constructor() {
        this.sounds = {
            envelope: new Audio('paper-rustle.mp3'),
            magic: new Audio('magic-whoosh.mp3'),
            blowout: new Audio('blow-out.mp3')
        };
        // Pre-setup volumes
        Object.values(this.sounds).forEach(s => s.volume = 0.5);
    }

    play(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log(`SFX ${soundName} blocked:`, e));
        }
    }
}
const audioManager = new AudioManager();

class CinematicEffectsManager {
    constructor() {
        this.mouseX = 0;
        this.mouseY = 0;
        this.godRaysOverlay = document.querySelector('.god-rays-overlay');
        this.blurredLeaves = {
            tl: document.getElementById('leaf-tl'),
            tr: document.getElementById('leaf-tr'),
            br: document.getElementById('leaf-br')
        };

        // Environmental elements
        this.firefliesContainer = document.getElementById('fireflies');
        this.dustContainer = document.getElementById('dust-motes');
        this.petalLayer = document.getElementById('petal-layer');
        this.vignette = document.querySelector('.vignette-overlay');

        // State holders
        this.fireflies = [];
        this.dustMotes = [];
        this.petalTimeout = null;

        // Petal spawn configuration
        this.maxPetals = 14;         // maximum petals on-screen
        this.initialPetalBurst = 6;  // spawn a small burst immediately to avoid empty first-frame
        // Runtime flag to prevent double-starting loops
        this.petalsRunning = false;
        this.particleTimeScale = 1.0;

        this.init();
    }

    init() {
        // Setup mouse tracking for parallax
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Initialize subtle effects
        this.initFireflies();
        this.initDustMotes();
        // Petals are intentionally started only after the user clicks Start
        // (call this.cinemaEffectsManager.startPetalLoop() from StoryManager.startExperience())

        // Slight vignette fade-in for subtlety
        if (this.vignette) gsap.to(this.vignette, { opacity: 0.6, duration: 2, ease: 'power1.out' });
    }

    // Fireflies: twinkling, drifting orbs
    initFireflies() {
        if (!this.firefliesContainer) return;
        const count = 6; // 5-8 range
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'firefly';
            this.firefliesContainer.appendChild(el);
            this.fireflies.push(el);

            // Initial random position
            const startX = Math.random() * window.innerWidth;
            const startY = Math.random() * window.innerHeight;
            gsap.set(el, { x: startX, y: startY, opacity: 0.6, scale: 1 });

            // Twinkle (opacity pulse)
            gsap.to(el, {
                opacity: () => 0.2 + Math.random() * 0.9,
                duration: 0.8 + Math.random() * 1.8,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut',
                delay: Math.random() * 2
            });

            // Gentle wandering movement
            const drift = () => {
                const anim = gsap.to(el, {
                    x: '+= ' + (Math.random() * 300 - 150),
                    y: '+= ' + (Math.random() * 300 - 150),
                    duration: 6 + Math.random() * 8,
                    ease: 'sine.inOut',
                    onComplete: drift,
                    overwrite: 'auto'
                });
                if (this.particleTimeScale !== 1) anim.timeScale(this.particleTimeScale);
            };
            drift();
        }
    }

    // Dust motes: very small particles that brighten when inside god rays
    initDustMotes() {
        if (!this.dustContainer) return;
        const count = 30;
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'dust-mote';
            this.dustContainer.appendChild(el);
            this.dustMotes.push(el);

            const startX = Math.random() * window.innerWidth;
            const startY = Math.random() * window.innerHeight;
            gsap.set(el, { x: startX, y: startY, opacity: 0.02 });

            const drift = () => {
                const anim = gsap.to(el, {
                    x: '+= ' + (Math.random() * 300 - 150),
                    y: '+= ' + (Math.random() * 200 - 100),
                    duration: 12 + Math.random() * 18,
                    ease: 'none',
                    repeat: -1,
                    yoyo: true,
                    onUpdate: () => {
                        const rect = el.getBoundingClientRect();
                        const cx = rect.left + rect.width / 2;
                        const cy = rect.top + rect.height / 2;
                        if (this.isInGodRay(cx, cy)) {
                            gsap.to(el, { opacity: 0.16, duration: 0.25, overwrite: 'auto' });
                        } else {
                            gsap.to(el, { opacity: 0.02, duration: 0.6, overwrite: 'auto' });
                        }
                    }
                });
                if (this.particleTimeScale !== 1) anim.timeScale(this.particleTimeScale);
            }
            drift();
        }
    }

    // Approximate whether a screen point (x,y) is within the diagonal god rays band
    isInGodRay(x, y) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const nx = x / w;
        const ny = y / h;
        // For the 135deg diagonal beam, points where nx and ny are similar sit along the diagonal
        return Math.abs(nx - ny) < 0.08; // tweak threshold for width
    }

    // Falling petals: schedule and spawn frequent petals with an initial burst
    startPetalLoop() {
        if (this.petalsRunning) return; // already running
        this.petalsRunning = true;

        // Initial burst so the screen doesn't feel empty on start
        const burst = this.initialPetalBurst || 5;
        for (let i = 0; i < burst; i++) {
            this.spawnPetal();
        }

        const schedule = () => {
            const next = 800 + Math.random() * 1200; // 0.8 - 2.0s
            this.petalTimeout = setTimeout(() => {
                const spawnCount = Math.random() < 0.25 ? 2 : 1; // occasionally spawn doubles for density
                for (let i = 0; i < spawnCount; i++) this.spawnPetal();
                schedule();
            }, next);
        };
        schedule();
    }

    spawnPetal() {
        if (!this.petalLayer) return;

        // Prevent too many on-screen petals
        const current = this.petalLayer.children.length;
        if (this.maxPetals && current >= this.maxPetals) return;

        const petal = document.createElement('div');
        petal.className = 'petal';

        // Slightly vary the SVG size for depth
        const size = 28 + Math.random() * 28; // 28px - 56px
        const colorVariants = ['#f7a6b0', '#f8b3bd', '#f7c7d0'];
        const color = colorVariants[Math.floor(Math.random() * colorVariants.length)];

        petal.innerHTML = `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><path d="M32 4 C40 12, 56 24, 40 44 C24 64, 16 52, 12 36 C8 20, 24 8, 32 4 Z" fill="${color}"/></svg>`;
        this.petalLayer.appendChild(petal);

        const startX = Math.random() * 100; // percent across screen
        const startLeft = `${startX}%`;
        gsap.set(petal, { left: startLeft, top: -60, rotation: Math.random() * 60 - 30, opacity: 0.95, scale: 0.9 + Math.random() * 0.4 });

        // Slight variation for duration so petals don't all land together
        const duration = 4 + Math.random() * 6; // 4 - 10s
        const driftX = (Math.random() * 240 - 120);
        const anim = gsap.to(petal, {
            top: window.innerHeight + 80,
            left: `+=${driftX}`,
            rotation: `+=${(Math.random() * 360 - 180)}`,
            duration: duration,
            ease: 'power1.inOut',
            onComplete: () => { if (petal && petal.parentNode) petal.parentNode.removeChild(petal); }
        });

        if (this.petalTimeScale) {
            anim.timeScale(this.petalTimeScale);
        }
    }

    onMouseMove(event) {
        // Normalize mouse position to -1 to 1
        this.mouseX = (event.clientX / window.innerWidth) - 0.5;
        this.mouseY = (event.clientY / window.innerHeight) - 0.5;

        // Update god rays position (subtle opposite parallax)
        this.updateGodRaysParallax();

        // Update blurred leaves parallax (stronger effect)
        this.updateBlurredLeavesParallax();
    }

    // Slow down all background particles by 50%
    slowDownParticles() {
        this.particleTimeScale = 0.5;
        this.petalTimeScale = 0.5;
        // Get all GSAP tweens for fireflies and dust
        this.fireflies.forEach(el => {
            gsap.getTweensOf(el).forEach(t => t.timeScale(0.5));
        });
        this.dustMotes.forEach(el => {
            gsap.getTweensOf(el).forEach(t => t.timeScale(0.3)); // Even slower for dust
        });

        // And update existing ones
        if (this.petalLayer) {
            const petals = this.petalLayer.querySelectorAll('.petal');
            petals.forEach(p => gsap.getTweensOf(p).forEach(t => t.timeScale(0.5)));
        }
    }

    resetParticleSpeed() {
        this.particleTimeScale = 1.0;
        this.petalTimeScale = 1.0;
        this.fireflies.forEach(el => {
            gsap.getTweensOf(el).forEach(t => t.timeScale(1.0));
        });
        this.dustMotes.forEach(el => {
            gsap.getTweensOf(el).forEach(t => t.timeScale(1.0));
        });
        if (this.petalLayer) {
            const petals = this.petalLayer.querySelectorAll('.petal');
            petals.forEach(p => gsap.getTweensOf(p).forEach(t => t.timeScale(1.0)));
        }
    }

    updateGodRaysParallax() {
        if (!this.godRaysOverlay) return;

        // God rays move in opposite direction of mouse (creates depth illusion)
        const offsetX = -this.mouseX * 15; // Subtle 15px max offset
        const offsetY = -this.mouseY * 15;

        gsap.to(this.godRaysOverlay, {
            x: offsetX,
            y: offsetY,
            duration: 0.8,
            overwrite: 'auto'
        });
    }

    updateBlurredLeavesParallax() {
        // Each leaf has different parallax strength for depth effect
        const strengths = {
            tl: 40,  // Stronger parallax
            tr: 50,  // Strongest
            br: 35   // Medium
        };

        Object.keys(this.blurredLeaves).forEach(key => {
            const leaf = this.blurredLeaves[key];
            if (!leaf) return;

            const offsetX = this.mouseX * strengths[key];
            const offsetY = this.mouseY * strengths[key];

            gsap.to(leaf, {
                x: offsetX,
                y: offsetY,
                duration: 1,
                overwrite: 'auto'
            });
        });
    }

    destroy() {
        // Cleanup when scene changes
        document.removeEventListener('mousemove', (e) => this.onMouseMove(e));

        // Kill GSAP tweens for generated elements
        gsap.killTweensOf('.firefly');
        gsap.killTweensOf('.dust-mote');
        gsap.killTweensOf('.petal');

        // Clear any scheduled petal timeouts
        if (this.petalTimeout) {
            clearTimeout(this.petalTimeout);
            this.petalTimeout = null;
        }
        this.petalsRunning = false;

        // Remove DOM children
        if (this.firefliesContainer) this.firefliesContainer.innerHTML = '';
        if (this.dustContainer) this.dustContainer.innerHTML = '';
        if (this.petalLayer) this.petalLayer.innerHTML = '';
    }
}

// --- Story Manager ---
class StoryManager {
    constructor() {
        this.scenes = ['intro', 'memory', 'letter', 'finale'];
        this.currentSceneIndex = 0;
        this.audioContext = null;
        this.bgMusic = document.getElementById('bg-music');
        this.isMusicPlaying = false;
        this.cinemaEffectsManager = null;

        this.init();
    }

    init() {
        // Setup initial state
        this.showScene(this.scenes[0]);
        this.setupEventListeners();

        // Setup visualizer/background effects (Particles)
        this.initBackgroundVisuals();

        // Setup cinematic effects for intro scene
        this.cinemaEffectsManager = new CinematicEffectsManager();

        // Reveal Intro Text is now called via the Pre-loader Lifecycle in window.load
        // this.revealIntroText();
    }

    revealIntroText() {
        // Target all h1 elements and potential p elements in the intro scene
        const introElements = document.querySelectorAll('#scene-intro .happy h1, #scene-intro .happy p');

        // Ensure they are visible but starting from offset
        gsap.fromTo(introElements,
            {
                y: 30,
                opacity: 0
            },
            {
                y: 0,
                opacity: 1,
                duration: 1.2,
                stagger: 0.3,
                ease: 'power3.out',
                delay: 0.5
            }
        );

        // Also animate the start button slightly after the text and enable it
        const startBtn = document.querySelector('.btn-start');
        if (startBtn) {
            gsap.fromTo(startBtn,
                { y: 20, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 1,
                    delay: 1.5,
                    ease: 'power2.out',
                    onComplete: () => {
                        startBtn.style.pointerEvents = 'auto';
                    }
                }
            );
        }
    }

    setupEventListeners() {
        // Start Button (Intro)
        const startBtn = document.querySelector('.btn-start');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                // --- Pre-Request Microphone Permission ---
                // Ask now so the browser saves the preference for the Finale scene
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(stream => {
                            console.log("Audio Permission Granted (Pre-check).");
                            // Release immediately, we just needed the permission bit flipped
                            stream.getTracks().forEach(track => track.stop());
                        })
                        .catch(err => {
                            console.warn("Audio Permission Denied or Error (Pre-check):", err);
                            // We continue anyway; the finale will just fail gracefully or ask again
                        });
                }

                this.startExperience();
            });
        }

        // Scene Transition Buttons
        document.getElementById('to-memory-btn').addEventListener('click', () => {
            this.transitionTo('memory');
            // Redundant call removed here because transitionTo handles initMemoryScene now
            // But we keep it if user logic expects pre-loading, though safer to let transitionTo handle it
        });

        document.getElementById('to-letter-btn').addEventListener('click', () => {
            this.transitionTo('letter');
            // Init Letter interactions
            if (!this.letterSceneInitialized) {
                initLetterInteraction();
                this.letterSceneInitialized = true;
            }
        });

        // Back button from letter scene to memory scene
        const backToMemoryBtn = document.getElementById('back-to-memory-btn');
        if (backToMemoryBtn) {
            backToMemoryBtn.addEventListener('click', () => {
                resetEnvelopeState();
                this.transitionTo('memory');
            });
        }

        const openLetterBtn = document.getElementById('open-letter-btn');
        if (openLetterBtn) {
            openLetterBtn.addEventListener('click', (e) => {
                // Envelope logic handled separately, but this triggers the flow
            });
        }

        // Envelope click also handled in specific logic section, 
        // but we need to listen for when reading is done.

        // Direct Listener for Make a Wish Button
        const wishBtn = document.getElementById('make-wish-btn');
        if (wishBtn) {
            wishBtn.addEventListener('click', (e) => {
                console.log("Direct Click: Make a Wish Clicked!");
                e.preventDefault();
                e.stopPropagation();

                this.transitionTo('finale');

                requestAnimationFrame(() => {
                    if (window.initFinale) window.initFinale();
                    else if (typeof initFinale === 'function') initFinale();
                });
            });
        }

        // Backup Delegation (in case of re-renders)
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('#make-wish-btn');
            if (btn && btn !== wishBtn) { // Avoid double fire if direct listener worked
                console.log("Delegation Click: Make a Wish Clicked!");
                e.preventDefault();
                e.stopPropagation();
                this.transitionTo('finale');
                requestAnimationFrame(() => {
                    if (window.initFinale) window.initFinale();
                    else if (typeof initFinale === 'function') initFinale();
                });
            }
        });

        // Music Toggle
        document.getElementById('music-toggle').addEventListener('click', () => {
            this.toggleMusic();
        });
    }

    playMusic() {
        if (this.isMusicPlaying) return;

        // Init Audio Context for auto-play policy
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        this.bgMusic.volume = 0.5;
        this.bgMusic.loop = true;
        this.bgMusic.play().then(() => {
            this.isMusicPlaying = true;
            const icon = document.getElementById('music-icon');
            if (icon) {
                icon.classList.remove('fa-volume-mute');
                icon.classList.add('fa-volume-up');
            }
        }).catch(e => {
            console.log("Audio play failed, will retry on interaction:", e);
            // Browser might block it, we'll try again on the next user click
            const playOnInteraction = () => {
                this.bgMusic.play().then(() => {
                    this.isMusicPlaying = true;
                    const icon = document.getElementById('music-icon');
                    if (icon) {
                        icon.classList.remove('fa-volume-mute');
                        icon.classList.add('fa-volume-up');
                    }
                    document.removeEventListener('click', playOnInteraction);
                    document.removeEventListener('touchstart', playOnInteraction);
                }).catch(() => { });
            };
            document.addEventListener('click', playOnInteraction);
            document.addEventListener('touchstart', playOnInteraction);
        });
    }

    startExperience() {
        // Play Music via shared method
        this.playMusic();

        // FAISAFE: Guaranteed button show after 9 seconds (8s animation + 1s delay)
        // Moved here so it runs INDEPENDENTLY of the animation success/failure
        setTimeout(() => {
            const nextBtn = document.getElementById('to-memory-btn');
            if (nextBtn) {
                console.log("Global Failsafe: Revealing next button");
                nextBtn.classList.add('visible');
                nextBtn.style.opacity = '1';
                nextBtn.style.pointerEvents = 'auto';
            }
        }, 9000);

        // Start petals after user clicked Start
        if (this.cinemaEffectsManager && typeof this.cinemaEffectsManager.startPetalLoop === 'function') {
            this.cinemaEffectsManager.startPetalLoop();
        }

        // Hide Start Button and Start Animation
        gsap.to('.happy', {
            opacity: 0, duration: 0.5, onComplete: () => {
                document.querySelector('.happy').style.display = 'none';

                // Start Flower Animation
                initFlowerAnimation(() => {
                    // Add 1 second delay after flower animation completes
                    setTimeout(() => {
                        const nextBtn = document.getElementById('to-memory-btn');
                        if (nextBtn) nextBtn.classList.add('visible');
                    }, 1000);
                });
            }
        });
    }

    transitionTo(sceneName) {
        const targetIndex = this.scenes.indexOf(sceneName);
        if (targetIndex === -1 || targetIndex === this.currentSceneIndex) return;

        // Custom transition for Scene 3 (Letter) -> Scene 4 (Finale)
        if (this.currentSceneIndex === 2 && sceneName === 'finale') {
            const currentScene = document.getElementById(`scene-${this.scenes[2]}`);
            const targetScene = document.getElementById(`scene-finale`);

            gsap.to(currentScene, {
                opacity: 0,
                duration: 1,
                ease: 'power2.inOut',
                onComplete: () => {
                    currentScene.classList.remove('active');
                    resetEnvelopeState();

                    // Swap indices before revealing next scene
                    this.currentSceneIndex = 3;

                    gsap.set(targetScene, { opacity: 0 });
                    targetScene.classList.add('active');

                    gsap.to(targetScene, {
                        opacity: 1,
                        duration: 1,
                        ease: 'power2.inOut'
                    });
                }
            });
            return;
        }

        const shutter = document.querySelector('.scene-shutter');
        const tl = gsap.timeline();

        // 1. Shutter slides UP to cover
        tl.to(shutter, {
            top: 0,
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
                // 2. SWAP SCENES (Exactly when covered)

                // If leaving letter scene, reset envelope state
                if (this.currentSceneIndex === 2 && sceneName !== 'letter') {
                    resetEnvelopeState();
                }

                // Cleanup cinematic effects when leaving intro scene
                if (this.currentSceneIndex === 0 && this.cinemaEffectsManager) {
                    this.cinemaEffectsManager.destroy();
                }

                // --- MEMORY SCENE LIFECYCLE MANAGEMENT ---
                // If we are LEAVING memory scene, destroy it completely
                if (this.currentSceneIndex === 1 && sceneName !== 'memory') {
                    destroyMemoryScene();
                }

                // Hide ALL scenes
                this.scenes.forEach(s => {
                    const el = document.getElementById(`scene-${s}`);
                    if (el) el.classList.remove('active');
                });

                // Show target scene
                const nextId = `scene-${sceneName}`;
                const nextEl = document.getElementById(nextId);
                if (nextEl) nextEl.classList.add('active');

                // Reinitialize cinematic effects if transitioning to intro
                if (sceneName === 'intro' && !this.cinemaEffectsManager) {
                    this.cinemaEffectsManager = new CinematicEffectsManager();
                }

                // Init Three.js if transitioning to memory (Enter Logic)
                if (sceneName === 'memory') {
                    // Check if it's already running (redundancy check)
                    if (!memorySceneVars.isInitialized) {
                        initMemoryScene();
                    }
                }

                this.currentSceneIndex = targetIndex;
            }
        });

        // 3. Shutter slides further UP to reveal
        tl.to(shutter, {
            top: '-100%',
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
                // Reset shutter position to bottom for next time
                gsap.set(shutter, { top: '100%' });
            }
        }, '+=0.1');
    }

    toggleMusic() {
        if (this.bgMusic.paused) {
            this.bgMusic.play();
            document.getElementById('music-icon').classList.remove('fa-volume-mute');
            document.getElementById('music-icon').classList.add('fa-volume-up');
        } else {
            this.bgMusic.pause();
            document.getElementById('music-icon').classList.remove('fa-volume-up');
            document.getElementById('music-icon').classList.add('fa-volume-mute');
        }
    }

    initBackgroundVisuals() {
        // Simple Canvas Particles for background
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 2 + 1,
                dx: (Math.random() - 0.5) * 0.5,
                dy: (Math.random() - 0.5) * 0.5,
                alpha: Math.random()
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';

            particles.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });
            requestAnimationFrame(animate);
        };
        animate();
    }

    showScene(sceneName) {
        this.scenes.forEach(s => {
            const el = document.getElementById(`scene-${s}`);
            if (s === sceneName) el.classList.add('active');
            else el.classList.remove('active');
        });
    }
}

// --- Scene 1: Flower Animation (Ported from script.js) ---
function initFlowerAnimation(onCompleteCallback) {
    // Note: Replaced Premium DrawSVG with Vanilla GSAP strokeDashoffset logic
    // gsap.registerPlugin(DrawSVGPlugin); 

    // Data Preparation
    const stems = document.querySelectorAll("path[id^='Stem']");
    const leaves = document.querySelectorAll("path[id^='Leaf']");
    const buds = document.querySelectorAll("g[id^='Bud']");
    const flowers = document.querySelectorAll("[id^='PinkFlowerGroup']");

    // Setup initial states
    // Stems: Prepare for stroke animation
    stems.forEach(el => {
        try {
            const len = el.getTotalLength();
            el.style.strokeDasharray = len;
            el.style.strokeDashoffset = len;
            el.style.opacity = '1';
            // We set opacity 1 here because we are hiding it via dashoffset
        } catch (e) {
            gsap.set(el, { opacity: 0 });
        }
    });

    // Leaves, Buds, Flowers: Scale from 0
    gsap.set(leaves, { scale: 0, opacity: 0, transformOrigin: "center" });
    gsap.set(buds, { scale: 0, opacity: 0, transformOrigin: "bottom center" });
    gsap.set(flowers, { scale: 0, opacity: 0, transformOrigin: "center bottom", rotation: -15 });

    const tl = gsap.timeline({
        onComplete: onCompleteCallback
    });

    // 1. Draw Stems (Manual Stroke Dash Animation)
    // We animate the 'strokeDashoffset' attribute/style to 0
    tl.to(stems, {
        strokeDashoffset: 0,
        duration: 2.5,
        stagger: { each: 0.05, from: "center" },
        ease: "power2.inOut"
    })
        // 2. Pop Leaves (Energetic pop)
        .to(leaves, {
            scale: 1,
            opacity: 1,
            duration: 1.2,
            stagger: { each: 0.03, from: "random" },
            ease: "back.out(2)"
        }, "-=1.5")
        // 3. Bloom Buds & Flowers (Big finish)
        .to(buds, {
            scale: 1,
            opacity: 1,
            duration: 1,
            stagger: 0.05,
            ease: "elastic.out(1, 0.75)"
        }, "-=1.0")
        .to(flowers, {
            scale: 1,
            opacity: 1,
            rotation: 0,
            duration: 1.8,
            stagger: 0.1,
            ease: "elastic.out(1, 0.5)"
        }, "-=0.8");

    // Fallback: If no elements found (timeline empty), fire callback explicitly
    if (tl.duration() < 0.1) {
        if (onCompleteCallback) onCompleteCallback();
    }
}


// --- Enhanced Interactive Memory Manager (Raycasting, Zooming & Physics) ---
class InteractiveMemoryManager {
    constructor(scene, camera, floatGroup, memories) {
        this.scene = scene;
        this.camera = camera;
        this.floatGroup = floatGroup;
        this.memories = memories; // Array of memory plane meshes

        // State management
        this.isZoomedIn = false;
        this.currentFocusedMemory = null;
        this.originalCameraPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
        this.floatingPaused = false;
        this.floatGroupRotationSpeed = 0.002; // Normal rotation speed
        this.floatGroupRotationSpeedPaused = 0.0001; // Paused rotation speed (very slow)

        // Raycasting
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.mousePos = { x: 0, y: 0 }; // For parallax effect

        // Hover state
        this.hoveredMemory = null;
        this.hoveredMemoryOriginalScale = null;
        this.hoveredMemoryOriginalEmissive = null;

        // Advanced floating physics
        this.floatTime = 0;
        this.floatingEnabled = true;
        this.cardPhysicsData = new Map(); // Store each card's physics data

        // Parallax settings
        this.parallaxStrength = 0.3; // How much fog/background moves (0-1)
        this.parallaxOriginalFogColor = this.scene.fog ? this.scene.fog.color.getHex() : 0x000000;

        // Configuration
        this.zoomDistance = 80; // Distance from card when zoomed in
        this.zoomDuration = 1.2; // GSAP animation duration (seconds)

        this.init();
    }

    init() {
        this.setupMouseListeners();
        this.setupCloseButton();
        this.setupKeyboardListeners();
    }

    setupMouseListeners() {
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        document.addEventListener('click', (event) => this.onMouseClick(event));
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isZoomedIn) {
                this.closeZoom();
            }
        });
    }

    setupCloseButton() {
        // Create close button UI
        if (!document.getElementById('memory-close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.id = 'memory-close-btn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
            closeBtn.className = 'memory-close-btn';
            closeBtn.style.position = 'fixed';
            closeBtn.style.top = '20px';
            closeBtn.style.right = '20px';
            closeBtn.style.zIndex = '1000';
            closeBtn.style.padding = '10px 20px';
            closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            closeBtn.style.border = '2px solid rgba(255, 255, 255, 0.3)';
            closeBtn.style.color = '#fff';
            closeBtn.style.borderRadius = '25px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontFamily = "'Outfit', sans-serif";
            closeBtn.style.fontSize = '14px';
            closeBtn.style.opacity = '0';
            closeBtn.style.pointerEvents = 'none';
            closeBtn.style.transition = 'all 0.3s ease';

            closeBtn.addEventListener('click', () => this.closeZoom());
            closeBtn.addEventListener('mouseenter', function () {
                this.style.background = 'rgba(255, 255, 255, 0.2)';
                this.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            });
            closeBtn.addEventListener('mouseleave', function () {
                this.style.background = 'rgba(255, 255, 255, 0.1)';
                this.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            });

            document.body.appendChild(closeBtn);
        }
    }

    onMouseMove(event) {
        // Update mouse position for raycasting
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Store mouse position for parallax effect (normalize to -1 to 1)
        this.mousePos.x = (event.clientX / window.innerWidth) - 0.5;
        this.mousePos.y = (event.clientY / window.innerHeight) - 0.5;

        // Perform raycasting for hover detection
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.memories);

        // Handle hover effects
        if (intersects.length > 0) {
            const hoveredMemory = intersects[0].object;

            if (this.hoveredMemory !== hoveredMemory) {
                // Reset previous hovered memory
                if (this.hoveredMemory && this.hoveredMemory !== this.currentFocusedMemory) {
                    gsap.to(this.hoveredMemory.scale, {
                        x: this.hoveredMemoryOriginalScale.x,
                        y: this.hoveredMemoryOriginalScale.y,
                        z: this.hoveredMemoryOriginalScale.z,
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                    gsap.to(this.hoveredMemory.material, {
                        opacity: 0.8,
                        duration: 0.3
                    });

                    // Remove glow effect
                    if (this.hoveredMemory.material.emissive) {
                        gsap.to(this.hoveredMemory.material.emissive, {
                            r: this.hoveredMemoryOriginalEmissive.r,
                            g: this.hoveredMemoryOriginalEmissive.g,
                            b: this.hoveredMemoryOriginalEmissive.b,
                            duration: 0.3
                        });
                        this.hoveredMemory.material.needsUpdate = true;
                    }
                }

                // New hovered memory
                this.hoveredMemory = hoveredMemory;
                this.hoveredMemoryOriginalScale = { ...this.hoveredMemory.scale };

                // Store original emissive color
                this.hoveredMemoryOriginalEmissive = {
                    r: this.hoveredMemory.material.emissive.r,
                    g: this.hoveredMemory.material.emissive.g,
                    b: this.hoveredMemory.material.emissive.b
                };

                // Scale up and brighten on hover
                gsap.to(this.hoveredMemory.scale, {
                    x: 1.15,
                    y: 1.15,
                    z: 1.15,
                    duration: 0.3,
                    ease: 'back.out'
                });
                gsap.to(this.hoveredMemory.material, {
                    opacity: 1.0,
                    duration: 0.3
                });

                // Add subtle glow (emissive effect - white light)
                gsap.to(this.hoveredMemory.material.emissive, {
                    r: 0.35,
                    g: 0.35,
                    b: 0.35,
                    duration: 0.3
                });
                this.hoveredMemory.material.needsUpdate = true;

                // Update cursor
                document.body.style.cursor = 'pointer';
            }
        } else {
            // No intersection - reset hovered state
            if (this.hoveredMemory && this.hoveredMemory !== this.currentFocusedMemory) {
                gsap.to(this.hoveredMemory.scale, {
                    x: this.hoveredMemoryOriginalScale.x,
                    y: this.hoveredMemoryOriginalScale.y,
                    z: this.hoveredMemoryOriginalScale.z,
                    duration: 0.3,
                    ease: 'power2.out'
                });
                gsap.to(this.hoveredMemory.material, {
                    opacity: 0.8,
                    duration: 0.3
                });

                // Remove glow
                if (this.hoveredMemory.material.emissive && this.hoveredMemoryOriginalEmissive) {
                    gsap.to(this.hoveredMemory.material.emissive, {
                        r: this.hoveredMemoryOriginalEmissive.r,
                        g: this.hoveredMemoryOriginalEmissive.g,
                        b: this.hoveredMemoryOriginalEmissive.b,
                        duration: 0.3
                    });
                    this.hoveredMemory.material.needsUpdate = true;
                }
            }

            this.hoveredMemory = null;
            document.body.style.cursor = 'default';
        }
    }

    onMouseClick(event) {
        // Skip if clicking UI elements
        if (event.target.closest('.memory-ui') || event.target.closest('.memory-close-btn') ||
            event.target.closest('#memory-close-btn')) {
            return;
        }

        // Perform raycasting for click detection
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.memories);

        if (intersects.length > 0) {
            const clickedMemory = intersects[0].object;

            if (this.isZoomedIn && this.currentFocusedMemory === clickedMemory) {
                // Clicking focused card again closes it
                this.closeZoom();
            } else if (this.isZoomedIn && this.currentFocusedMemory !== clickedMemory) {
                // Transition to new card
                this.closeZoom(() => {
                    this.zoomIntoMemory(clickedMemory);
                });
            } else {
                // Initial zoom
                this.zoomIntoMemory(clickedMemory);
            }
        }
    }

    zoomIntoMemory(memory) {
        if (this.isZoomedIn && this.currentFocusedMemory === memory) return; // Prevent double focusing same card

        // If another card is currently focused, return it first then focus this one
        if (this.isZoomedIn && this.currentFocusedMemory && this.currentFocusedMemory !== memory) {
            this.closeZoom(() => this.zoomIntoMemory(memory));
            return;
        }

        this.isZoomedIn = true;
        this.currentFocusedMemory = memory;

        // Do NOT pause floating — other cards should continue subtle motion

        // Target world position: center of screen at depth just in front of camera
        const targetWorld = new THREE.Vector3(0, 0, this.camera.position.z - 50);

        // Convert to local coordinates relative to the floatGroup
        const localTarget = this.floatGroup.worldToLocal(targetWorld.clone());

        // Animate the selected memory to the center position and reset rotation
        gsap.to(memory.position, {
            x: localTarget.x,
            y: localTarget.y,
            z: localTarget.z,
            duration: this.zoomDuration,
            ease: 'power2.inOut'
        });

        gsap.to(memory.rotation, {
            x: 0,
            y: 0.1, // Reduced tilt for better readability
            z: 0,
            duration: this.zoomDuration,
            ease: 'power2.inOut'
        });

        // Bring focused card visually forward: full opacity + preserve aspect ratio
        // Original card dimensions are 24x34, so we scale proportionally to maintain aspect ratio
        gsap.to(memory.material, { opacity: 1.0, duration: this.zoomDuration, ease: 'power2.inOut' });
        gsap.to(memory.scale, { x: 1.0, y: 1.0, z: 1.0, duration: this.zoomDuration, ease: 'power2.inOut' });

        // Dim other cards to create a subtle overlay effect without stopping their motion
        this.memories.forEach(mem => {
            if (mem !== memory) {
                if (mem.material) gsap.to(mem.material, { opacity: 0.22, duration: this.zoomDuration, ease: 'power2.inOut' });
            }
        });

        // Show close button
        const closeBtn = document.getElementById('memory-close-btn');
        if (closeBtn) {
            gsap.to(closeBtn, {
                opacity: 1,
                pointerEvents: 'auto',
                duration: 0.5,
                delay: 0.3
            });
        }
    }

    closeZoom(callback) {
        if (!this.isZoomedIn) {
            if (callback) callback();
            return;
        }

        this.isZoomedIn = false;

        // Get current focused card and reset its rotation/position
        const focusedCard = this.currentFocusedMemory;
        this.currentFocusedMemory = null;

        if (focusedCard) {
            // Restore position and rotation from userData
            const orig = focusedCard.userData.originalPos;
            const oriRot = focusedCard.userData.originalRot;

            gsap.to(focusedCard.position, {
                x: orig.x,
                y: orig.y,
                z: orig.z,
                duration: this.zoomDuration,
                ease: 'power2.inOut'
            });

            gsap.to(focusedCard.rotation, {
                x: oriRot.x,
                y: oriRot.y,
                z: oriRot.z,
                duration: this.zoomDuration,
                ease: 'power2.inOut'
            });

            gsap.to(focusedCard.scale, { x: 1, y: 1, z: 1, duration: this.zoomDuration, ease: 'power2.inOut' });
        }

        // Restore opacity of other cards
        this.memories.forEach(mem => {
            if (mem.material) gsap.to(mem.material, { opacity: 0.8, duration: this.zoomDuration, ease: 'power2.inOut' });
        });

        // Hide close button
        const closeBtn = document.getElementById('memory-close-btn');
        if (closeBtn) {
            gsap.to(closeBtn, {
                opacity: 0,
                pointerEvents: 'none',
                duration: 0.3
            });
        }

        // Call callback after restore completes
        if (callback) {
            setTimeout(() => callback(), (this.zoomDuration + 0.05) * 1000);
        }
    }

    // Create a glowing highlight plane slightly larger than the card and attach it behind the card
    createHighlightFor(memory) {
        if (!memory) return;

        // Avoid duplicate highlight
        if (memory.userData.highlight) return;

        // Derive geometry size from card if possible
        const geoW = (memory.geometry && memory.geometry.parameters && memory.geometry.parameters.width) ? memory.geometry.parameters.width : 25;
        const geoH = (memory.geometry && memory.geometry.parameters && memory.geometry.parameters.height) ? memory.geometry.parameters.height : 35;

        const plane = new THREE.PlaneGeometry(geoW * 1.1, geoH * 1.1);

        // Create a soft gradient texture using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255, 200, 160, 0.95)'); // warm golden center
        grad.addColorStop(0.5, 'rgba(255, 140, 180, 0.45)'); // neon-pink mid
        grad.addColorStop(1, 'rgba(255, 140, 180, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;

        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });

        const mesh = new THREE.Mesh(plane, mat);
        mesh.position.copy(memory.position);
        mesh.position.z = memory.position.z - 1; // place slightly behind
        mesh.renderOrder = (memory.renderOrder || 0) - 1;

        mesh.scale.set(memory.scale.x * 1.08, memory.scale.y * 1.08, 1);

        this.floatGroup.add(mesh);
        memory.userData.highlight = mesh;

        // Animate highlight in (fade+scale)
        gsap.to(mat, { opacity: 1.0, duration: this.zoomDuration, ease: 'power2.inOut' });
        gsap.to(mesh.scale, { x: memory.scale.x * 1.12, y: memory.scale.y * 1.12, duration: this.zoomDuration, ease: 'power2.inOut' });
    }

    removeHighlightFor(memory) {
        if (!memory || !memory.userData.highlight) return;
        const mesh = memory.userData.highlight;
        if (mesh.material) {
            gsap.to(mesh.material, {
                opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: () => {
                    if (mesh.parent) mesh.parent.remove(mesh);
                    mesh.geometry.dispose();
                    if (mesh.material.map) mesh.material.map.dispose();
                    mesh.material.dispose();
                }
            });
        } else {
            if (mesh.parent) mesh.parent.remove(mesh);
        }
        memory.userData.highlight = null;
    }

    // Modularity: Adjust zoom distance
    setZoomDistance(distance) {
        this.zoomDistance = distance;
    }

    // Modularity: Adjust animation speed
    setZoomDuration(duration) {
        this.zoomDuration = duration;
    }

    // Advanced floating physics - improved smooth motion
    updateFloatingPhysics() {
        // Increment time for sine-wave based floating
        this.floatTime += 0.001;

        // If paused, slow rotation significantly (keep some subtle motion)
        const rotationSpeed = this.floatingPaused ? this.floatGroupRotationSpeedPaused : this.floatGroupRotationSpeed;

        // Update each memory card with smooth sine-wave floating motion
        this.memories.forEach((memory, index) => {
            // If this card is locked (focused or returning), skip floating updates to avoid snapping
            if (memory.userData && memory.userData.locked) {
                return; // do not override the animation in progress
            }

            // Create unique physics data if not exists
            if (!this.cardPhysicsData.has(index)) {
                this.cardPhysicsData.set(index, {
                    amplitude: 0.3 + Math.random() * 0.2,
                    frequency: 0.5 + Math.random() * 0.3,
                    phase: Math.random() * Math.PI * 2,
                    axisX: Math.random() - 0.5,
                    axisY: Math.random() - 0.5,
                    axisZ: Math.random() - 0.5
                });
            }

            const physics = this.cardPhysicsData.get(index);

            // Calculate sine-wave based motion for smooth floating
            const floatingMotion = Math.sin(this.floatTime * physics.frequency + physics.phase) * physics.amplitude;

            // Apply subtle rotation
            memory.rotation.x += rotationSpeed * physics.axisX * (this.floatingPaused ? 0.3 : 1);
            memory.rotation.y += rotationSpeed * physics.axisY * (this.floatingPaused ? 0.3 : 1);
            memory.rotation.z += rotationSpeed * physics.axisZ * (this.floatingPaused ? 0.3 : 1);

            // Store original position if not stored
            if (!memory.userData.originalPos) {
                memory.userData.originalPos = {
                    x: memory.position.x,
                    y: memory.position.y,
                    z: memory.position.z
                };
            }

            // Apply floating motion to position
            memory.position.y = memory.userData.originalPos.y + floatingMotion;
        });
    }

    // Parallax effect - camera/fog responds to mouse position
    updateParallaxEffect(camera, fog) {
        if (this.isZoomedIn) return; // Disable parallax when zoomed in

        // Calculate parallax offset based on mouse position
        const parallaxOffsetX = this.mousePos.x * this.parallaxStrength * 5;
        const parallaxOffsetY = -this.mousePos.y * this.parallaxStrength * 5;

        // Smoothly animate camera offset for parallax
        gsap.to(camera.position, {
            x: parallaxOffsetX,
            y: parallaxOffsetY,
            duration: 0.5,
            overwrite: 'auto'
        });

        // Optional: Apply subtle fog color change based on mouse (immersive effect)
        // This creates a depth-based color shift
        const fogTint = 0.15 + this.mousePos.x * 0.1;
        if (fog) {
            // Fog color responds subtly to mouse position
            fog.color.setHSL(0, 0, Math.max(0, Math.min(1, fogTint)));
        }
    }

    // Initialize physics data for all memory cards
    initializeCardPhysics(memories) {
        memories.forEach((memory, index) => {
            // Pre-initialize physics data for smooth startup
            this.cardPhysicsData.set(index, {
                amplitude: 0.3 + Math.random() * 0.2,
                frequency: 0.5 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
                axisX: Math.random() - 0.5,
                axisY: Math.random() - 0.5,
                axisZ: Math.random() - 0.5
            });

            // Store original position
            memory.userData.originalPos = {
                x: memory.position.x,
                y: memory.position.y,
                z: memory.position.z
            };
        });
    }

    // Cleanup on scene change
    destroy() {
        document.removeEventListener('mousemove', (event) => this.onMouseMove(event));
        document.removeEventListener('click', (event) => this.onMouseClick(event));
        document.removeEventListener('keydown', (event) => this.onMouseMove(event));
    }
}

// Memory Tracker State
let viewedImages = new Set();
const totalUniqueImages = 7;

// --- Global Memory Scene Variables ---
const memorySceneVars = {
    scene: null,
    camera: null,
    renderer: null,
    floatGroup: null,
    controls: null,
    animationId: null,
    isInitialized: false,
    stars: null
};

// --- Destroy Memory Scene Function ---
function destroyMemoryScene() {
    console.log("Cleaning up Memory Scene...");

    // 1. Stop Animation
    if (memorySceneVars.animationId) {
        cancelAnimationFrame(memorySceneVars.animationId);
        memorySceneVars.animationId = null;
    }
    window.stopMemorySceneLoop = null; // Remove global hook
    window.startMemorySceneLoop = null; // Remove global hook

    // 2. Remove Event Listeners
    // Note: Some listeners might be tricky if not named, but we cleared interactions in InteractiveMemoryManager.destroy if used.
    // However, our initMemoryScene adds global listeners directly. 
    // Ideally we should store these listener references to remove them, but for now we rely on the scene replacement.
    // To be clean, we should reload page or have named functions.
    // For this refactor, we focus on Three.js memory.

    // 3. Dispose Three.js Objects
    if (memorySceneVars.scene) {
        memorySceneVars.scene.traverse((object) => {
            if (!object.isMesh) return;

            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((material) => {
                        cleanMaterial(material);
                    });
                } else {
                    cleanMaterial(object.material);
                }
            }
        });
    }

    // 4. Dispose Renderer
    if (memorySceneVars.renderer) {
        memorySceneVars.renderer.dispose();
        if (memorySceneVars.renderer.domElement && memorySceneVars.renderer.domElement.parentNode) {
            memorySceneVars.renderer.domElement.parentNode.removeChild(memorySceneVars.renderer.domElement);
        }
    }

    // 5. Reset State
    memorySceneVars.scene = null;
    memorySceneVars.camera = null;
    memorySceneVars.renderer = null;
    memorySceneVars.floatGroup = null;
    memorySceneVars.controls = null;
    memorySceneVars.stars = null;
    memorySceneVars.isInitialized = false;

    // Clear viewed images to reset progress? Or keep it? 
    // PROBABLY KEEP IT so user doesn't lose progress if they just peek away.
    // confirmed: Goal says "re-initialized", usually implies fresh start, but game logic might want persistence.
    // For now, we only clean visual memory. Game logic (viewedImages) persists.
}

function cleanMaterial(material) {
    material.dispose();
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.aoMap) material.aoMap.dispose();
    if (material.emissiveMap) material.emissiveMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    if (material.alphaMap) material.alphaMap.dispose();
    if (material.roughnessMap) material.roughnessMap.dispose();
    if (material.metalnessMap) material.metalnessMap.dispose();
    if (material.displacementMap) material.displacementMap.dispose();
}

// --- Scene 2: Memory Cloud (Three.js) ---
function initMemoryScene() {
    if (memorySceneVars.isInitialized) {
        console.log("Memory Scene already initialized");
        return;
    }

    const container = document.getElementById('scene-memory');
    if (!container) return;

    let isLoopRunning = true;

    const scene = new THREE.Scene();
    memorySceneVars.scene = scene;
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    // Calculate responsive dimensions & FOV
    const isSmallScreen = window.innerWidth < 768;

    // Density: Reduce on mobile to prevent "wall of cards"
    const cardCount = isSmallScreen ? 20 : 38;

    // 3. Increase Card Size: (24, 34)
    const cardWidthBase = 24;
    const cardHeightBase = 34;

    // 2. Responsive Cloud Distribution (Expanded for reachability):
    // Use wider spreads to give cards air.
    const spreadX = isSmallScreen ? 110 : 320;
    const spreadY = isSmallScreen ? 170 : 160;

    // Z-Variance Compression: 
    // On mobile, keep cards closer to a single plane (spreadZ: 50) 
    // On Desktop, allow more depth (spreadZ: 180).
    const spreadZ = isSmallScreen ? 50 : 180;

    // 4. Mobile FOV Adjustment: 85 for mobile, 75 for desktop
    const cameraFOV = isSmallScreen ? 85 : 75;
    const camera = new THREE.PerspectiveCamera(cameraFOV, window.innerWidth / window.innerHeight, 0.1, 2000);
    memorySceneVars.camera = camera;
    // Start camera far away for the "flying into memories" effect
    camera.position.z = 1000;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    memorySceneVars.renderer = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- OrbitControls for Zoom In/Out ---
    let controls = null;
    if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.3;
        controls.minDistance = 50;   // Closest zoom
        controls.maxDistance = 400;  // Farthest zoom
        controls.enablePan = false;  // Disable pan for simpler UX
        controls.enableRotate = true; // Keep rotation
        controls.autoRotate = false;
        controls.zoomSpeed = 1.0;
        memorySceneVars.controls = controls;

        // --- Interaction Tutorial Logic ---
        const tutorialOverlay = document.getElementById('interaction-tutorial');
        if (tutorialOverlay) {
            // 1. Fade In after short delay
            setTimeout(() => {
                tutorialOverlay.style.opacity = '1';
            }, 1000);

            // 2. Define Dismiss Function
            const dismissTutorial = () => {
                tutorialOverlay.style.opacity = '0';
                // Remove from DOM after fade out to be clean
                setTimeout(() => {
                    tutorialOverlay.style.display = 'none';
                }, 500);
            };

            // 3. Auto Dismiss after 4 seconds
            const autoDismissTimer = setTimeout(dismissTutorial, 5000);

            // 4. User Interaction Dismiss (One-time listener)
            const onUserInteract = () => {
                clearTimeout(autoDismissTimer); // Stop auto timer if user beats it
                dismissTutorial();
                // Remove listeners so it doesn't fire again
                window.removeEventListener('pointerdown', onUserInteract);
                window.removeEventListener('wheel', onUserInteract);
                window.removeEventListener('touchstart', onUserInteract);
            };

            // Listen for any interaction (click, tap, scroll)
            // Add a small delay before listening so the initial click to enter scene doesn't trigger it immediately
            setTimeout(() => {
                window.addEventListener('pointerdown', onUserInteract, { once: true });
                window.addEventListener('wheel', onUserInteract, { once: true });
                window.addEventListener('touchstart', onUserInteract, { once: true });
            }, 3500);
        }
    }

    // Add responsive resize listener
    const onWindowResize = () => {
        if (!memorySceneVars.renderer) return;
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        const isMobile = newWidth < 768;

        camera.aspect = newWidth / newHeight;
        // Update FOV dynamically on resize
        camera.fov = isMobile ? 85 : 75;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
    };
    window.addEventListener('resize', onWindowResize);

    // --- Lighting FIX: Add soft lighting for premium look ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Increased for clarity
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.0, 1000);
    pointLight.position.set(200, 200, 200);
    scene.add(pointLight);

    const floatGroup = new THREE.Group();
    memorySceneVars.floatGroup = floatGroup;
    scene.add(floatGroup);


    const textureLoader = new THREE.TextureLoader();
    const placeholderImages = ['./img1.jpg', './img2.jpg', './img3.jpg', './img4.jpg', './img5.jpg', './img6.jpg', './img7.jpg'];
    const textures = placeholderImages.map(url => textureLoader.load(url));

    const geometry = new THREE.PlaneGeometry(cardWidthBase, cardHeightBase);

    // Cards create with responsive sizing and standard material
    for (let i = 0; i < cardCount; i++) {
        const texture = textures[i % textures.length];

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            color: 0xffffff, // Pure white for original brightness
            emissive: new THREE.Color(0x000000), // No artificial tint
            roughness: 0.4,
            metalness: 0.2
        });

        const mesh = new THREE.Mesh(geometry, material);
        // Use the smart distribution logic
        mesh.position.set(
            (Math.random() - 0.5) * spreadX,
            (Math.random() - 0.5) * spreadY,
            (Math.random() - 0.5) * spreadZ
        );
        mesh.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);

        // Custom data for animation
        mesh.userData = {
            originalPos: mesh.position.clone(),
            originalRot: mesh.rotation.clone(),
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            floatSpeed: 0.5 + Math.random() * 0.5,
            texture: texture // Store texture reference to access image dimensions later
        };

        floatGroup.add(mesh);
    }


    // Interaction Variables & Drag-to-Rotate
    let isDragging = false;
    let startX, startY;
    let pointerStartX, pointerStartY; // Track start for click detection
    let targetRotX = 0, targetRotY = 0;
    const dragStrength = 0.005;

    // Interaction Listeners
    const handleStart = (x, y) => {
        isDragging = true;
        startX = x;
        startY = y;
        pointerStartX = x;
        pointerStartY = y;
    };

    const handleMove = (x, y) => {
        if (!isDragging) return;
        const dx = x - startX;
        const dy = y - startY;

        targetRotY += dx * dragStrength;
        targetRotX += dy * dragStrength;

        startX = x;
        startY = y;
    };

    const handleEnd = (e) => {
        isDragging = false;

        // Calculate distance moved to distinguish Click vs Drag
        const endX = e.clientX;
        const endY = e.clientY;
        const dist = Math.hypot(endX - pointerStartX, endY - pointerStartY);

        // If moved less than 5 pixels, treat as a CLICK/TAP
        if (dist < 5) {
            onCardClick(e);
        }
    };

    // Attach pointer events
    window.addEventListener('pointerdown', (e) => handleStart(e.clientX, e.clientY));
    window.addEventListener('pointermove', (e) => handleMove(e.clientX, e.clientY));
    window.addEventListener('pointerup', handleEnd);
    // window.addEventListener('pointercancel', handleEnd); // Optional fallback

    // --- Flying into Memories Entry Animation ---
    // 1. Bring Camera Closer: Position Z at 140
    gsap.to(camera.position, {
        z: 140,
        duration: 2.5,
        ease: 'power2.out'
    });

    // Scale in cards with a stagger
    gsap.from(floatGroup.children.map(m => m.scale), {
        x: 0, y: 0, z: 0,
        duration: 1.5,
        stagger: {
            amount: 1.0,
            from: "random"
        },
        ease: "back.out(1.7)",
        delay: 0.5
    });

    // Interaction Variables
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let isZoomed = false;
    let focusedObj = null;
    let isTransitioning = false;

    // Interaction Listeners for Hover & Pop-to-Front
    window.addEventListener('mousemove', (event) => {
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

        mouse.x = mouseX;
        mouse.y = mouseY;

        // Hover Effect
        const targets = [...floatGroup.children];
        if (focusedObj) targets.push(focusedObj);

        raycaster.setFromCamera(mouse, camera);
        // Intersect logic: returns results sorted by distance (nearest first)
        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0 && !isZoomed) {
            document.body.style.cursor = 'pointer';
            // Always pick the NEAREST visible card (intersects[0])
            const target = intersects[0].object;

            // "Pop-to-Front" Hover Effect
            gsap.to(target.scale, { x: 1.15, y: 1.15, duration: 0.3 });
            // Move significantly forward in Z to be above others
            gsap.to(target.position, {
                z: target.userData.originalPos.z + 25,
                duration: 0.3,
                overwrite: true
            });
            target.renderOrder = 10;

            if (target.material) {
                gsap.to(target.material.color, { r: 1.3, g: 1.3, b: 1.3, duration: 0.3 }); // Brighten
            }

            // Reset others
            targets.forEach(child => {
                if (child !== target && child !== focusedObj) {
                    gsap.to(child.scale, { x: 1, y: 1, duration: 0.3 });
                    gsap.to(child.position, {
                        z: child.userData.originalPos.z,
                        duration: 0.3,
                        overwrite: true
                    });
                    child.renderOrder = 0;
                    if (child.material) gsap.to(child.material.color, { r: 1, g: 1, b: 1, duration: 0.3 });
                }
            });
        } else {
            document.body.style.cursor = 'default';
            floatGroup.children.forEach(child => {
                if (child !== focusedObj) {
                    gsap.to(child.scale, { x: 1, y: 1, duration: 0.3 });
                    gsap.to(child.position, {
                        z: child.userData.originalPos.z,
                        duration: 0.3,
                        overwrite: true
                    });
                    child.renderOrder = 0;
                    if (child.material) {
                        gsap.to(child.material.color, { r: 1, g: 1, b: 1, duration: 0.3 });
                    }
                }
            });
        }
    });

    // Click logic (Reuse existing zoomIn/returnToCloud functions with refinements)
    // Unified Click Logic (Triggered by handleEnd if distance < 5px)
    function onCardClick(event) {
        if (isTransitioning) return; // Prevent double-clicks or rapid clicks during movement

        const targets = [...floatGroup.children];
        if (focusedObj) targets.push(focusedObj);

        // Update mouse variable for Raycaster (crucial: use event clientX/Y)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            const clicked = intersects[0].object;
            if (isZoomed && focusedObj === clicked) {
                returnToCloud();
            } else if (isZoomed && focusedObj && focusedObj !== clicked) {
                returnToCloud();
                setTimeout(() => zoomIn(clicked), 800);
            } else if (!isZoomed) {
                zoomIn(clicked);
            }
        } else if (isZoomed) {
            returnToCloud();
        }
    }

    // --- Updated ZoomIn Function for initMemoryScene ---
    function zoomIn(obj) {
        if (!obj || isTransitioning) return;
        isTransitioning = true;
        isZoomed = true;
        focusedObj = obj;

        // Keep zoom enabled during card focus for better readability, but disable rotation
        if (controls) {
            controls.enableRotate = true; // Enable rotation to look around
            // Zoom remains enabled so user can read card text better
        }
        obj.userData.locked = true;

        // 1. Scene mein attach karein taake center mein aa sake
        scene.attach(obj);

        // 2. Position Animation (Center mein lana)
        // Calculate the target Z position based on current camera distance
        // The card should always appear at a comfortable viewing distance in front of the camera
        // Using 75% of camera distance places the card close enough for text to be readable
        const cameraZ = camera.position.z;
        const targetZ = cameraZ * 0.75; // Card appears at 75% of camera distance (closer to camera)

        gsap.to(obj.position, {
            x: 0,
            y: 0,
            z: targetZ, // Dynamic position based on camera zoom
            duration: 1.2,
            ease: 'power2.inOut',
            onStart: () => {
                // Update OrbitControls target to focus on the card
                if (controls) {
                    // We target the final position of the card
                    controls.target.set(0, 0, targetZ);
                    controls.update();
                }
            }
        });

        // 3. FLIP ANIMATION (Ye wo magic part hai!)
        // Card ko seedha karte hue 360 degree ghumana aur slight tilt dena
        gsap.to(obj.rotation, {
            x: 0,
            y: Math.PI * 2 + 0.3, // Fixed readable angle with slight tilt to right
            z: 0,
            duration: 1.2,
            ease: 'back.out(1.2)' // Thora sa bounce effect
        });

        // 4. FLASH EFFECT (Gold Color)
        // Pehle original color save karein
        if (!obj.userData.originalColor) obj.userData.originalColor = obj.material.color.getHex();

        gsap.to(obj.material.color, {
            r: 1, g: 0.8, b: 0.2, // Gold
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                // Wapas White color par lana
                gsap.to(obj.material.color, { r: 1, g: 1, b: 1, duration: 0.5 });
            }
        });

        // --- Memory Tracking Logic ---
        if (obj.userData.texture && obj.userData.texture.image) {
            const imageUrl = obj.userData.texture.image.src;
            if (!viewedImages.has(imageUrl)) {
                viewedImages.add(imageUrl);
                const counter = document.getElementById('memory-counter');
                if (counter) {
                    counter.innerText = `Memories Found: ${viewedImages.size}/7`;
                }

                // Removed Reveal Logic from here (moved to returnToCloud)
            }
        }


        // Subtle notification in counter
        gsap.to('#memory-counter', {
            color: '#ff4757',
            scale: 1.1,
            duration: 0.5,
            yoyo: true,
            repeat: 1
        });

        // 5. Scale & Opacity
        gsap.to(obj.scale, {
            x: 1.2, y: 1.2, z: 1.2,
            duration: 1.2,
            ease: 'power2.inOut',
            onComplete: () => { isTransitioning = false; } // Unlock after movement finishes
        });

        // Baqi cards ko dim karna
        floatGroup.children.forEach(child => {
            if (child.material) gsap.to(child.material, { opacity: 0.1, duration: 1 });
        });

        // Close Button Show karna
        const closeBtn = document.getElementById('memory-close-btn');
        if (closeBtn) {
            gsap.to(closeBtn, {
                opacity: 1,
                pointerEvents: 'auto',
                duration: 0.5,
                delay: 0.3
            });
        }
    }

    // New Function to Trigger Finale Reveal
    function showFinalButton() {
        const revealBtn = document.getElementById('to-letter-btn');
        if (!revealBtn) return;

        // Check if already shown to avoid re-triggering
        if (revealBtn.classList.contains('active')) return;

        // Play Magic Whoosh
        audioManager.play('magic');

        // --- 1. Background Dimming (Enhancement) ---
        // Create a temporary overlay to focus attention
        let dimOverlay = document.getElementById('memory-dim-overlay');
        if (!dimOverlay) {
            dimOverlay = document.createElement('div');
            dimOverlay.id = 'memory-dim-overlay';
            // Styles now handled in CSS (#memory-dim-overlay)

            // Append to scene container so it transitions with the scene
            const sceneContainer = document.getElementById('scene-memory');
            if (sceneContainer) {
                sceneContainer.appendChild(dimOverlay);
                // CRITICAL FIX: Move button to end of container to Ensure it is ABOVE the overlay
                // (Fixes "dim button" issue by relying on DOM order + z-index)
                sceneContainer.appendChild(revealBtn);
            }
        }

        // Fade in overlay via class
        requestAnimationFrame(() => {
            dimOverlay.classList.add('visible');
        });

        // --- 2. Initial Entrance (Scale Up) ---
        gsap.set(revealBtn, { xPercent: -50, yPercent: -50 }); // Ensure centering logic works with GSAP

        gsap.fromTo(revealBtn, {
            scale: 0,
            opacity: 0,
            display: 'flex'
        }, {
            scale: 1,
            opacity: 1,
            duration: 1.5,
            ease: "back.out(1.7)",
            onStart: () => {
                revealBtn.style.pointerEvents = 'auto';
                revealBtn.classList.add('active'); // Styling hooks
            },
            onComplete: () => {
                // --- 3. Continuous Pulse & Glow (Loop via CSS) ---
                revealBtn.classList.add('heartbeat');
            }
        });
    }

    function returnToCloud() {
        if (!focusedObj || isTransitioning) return;
        isTransitioning = true;

        // Re-enable full OrbitControls when returning to cloud view
        if (controls) {
            controls.enableRotate = true; // Re-enable rotation
            controls.target.set(0, 0, 0); // Reset target to center of cloud
            controls.update();
        }

        const obj = focusedObj;
        floatGroup.attach(obj);

        const orig = obj.userData.originalPos;
        const oriRot = obj.userData.originalRot;

        // Wapas apni jagah
        gsap.to(obj.position, {
            x: orig.x, y: orig.y, z: orig.z,
            duration: 1,
            ease: 'power2.inOut',
            onComplete: () => {
                obj.userData.locked = false;
                isTransitioning = false; // Unlock after card returns
                // Un-dim other cards
                floatGroup.children.forEach(child => {
                    if (child.material) gsap.to(child.material, { opacity: 1, duration: 1 });
                });

                // Hide Close Button
                const closeBtn = document.getElementById('memory-close-btn');
                if (closeBtn) {
                    gsap.to(closeBtn, {
                        opacity: 0,
                        pointerEvents: 'none',
                        duration: 0.3
                    });
                }

                focusedObj = null;
                isZoomed = false;

                // CHECK IF ALL MEMORIES FOUND -> REVEAL BUTTON NOW
                // Only if we have found all unique images (7)
                if (viewedImages.size === totalUniqueImages) {
                    // Small delay to let the card settling animation finish slightly
                    setTimeout(() => {
                        showFinalButton();
                    }, 800);
                }
            }
        });

        // Wapas apni rotation
        gsap.to(obj.rotation, {
            x: oriRot.x, y: oriRot.y, z: oriRot.z,
            duration: 1,
            ease: 'power2.inOut'
        });

        gsap.to(obj.scale, { x: 1, y: 1, z: 1, duration: 1 });
    }

    // --- 1. Starfield Logic (Procedural Texture) ---
    function createStarTexture() {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');

        const centerX = size / 2;
        const centerY = size / 2;
        const outerRadius = size * 0.45;
        const innerRadius = size * 0.2;
        const numPoints = 5;

        context.beginPath();
        context.moveTo(centerX, centerY - outerRadius);
        for (let i = 0; i < numPoints; i++) {
            const outerAngle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
            context.lineTo(centerX + outerRadius * Math.cos(outerAngle), centerY + outerRadius * Math.sin(outerAngle));
            const innerAngle = outerAngle + Math.PI / numPoints;
            context.lineTo(centerX + innerRadius * Math.cos(innerAngle), centerY + innerRadius * Math.sin(innerAngle));
        }
        context.closePath();

        const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 220, 0.9)');
        gradient.addColorStop(0.6, 'rgba(255, 200, 150, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');

        context.fillStyle = gradient;
        context.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    function createStarfield() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 70000;
        const posArray = new Float32Array(starCount * 3);
        const texture = createStarTexture();

        for (let i = 0; i < starCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 2000;
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const starMat = new THREE.PointsMaterial({
            size: 4, // Increased from 2 to 6 for visibility
            color: 0xffffff,
            transparent: true,
            opacity: 1.0, // Increased transparency
            map: texture,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            alphaTest: 0.01
        });
        const starMesh = new THREE.Points(starGeo, starMat);
        scene.add(starMesh);
        console.log("Starfield created with " + starCount + " stars");
        return starMesh;
    }
    const stars = createStarfield();
    memorySceneVars.stars = stars;

    const animate = () => {
        if (!isLoopRunning) return;
        memorySceneVars.animationId = requestAnimationFrame(animate);

        const time = Date.now() * 0.001;

        // Update OrbitControls for smooth damping
        if (controls) controls.update();

        // Slow star rotation
        stars.rotation.y += 0.0002;

        if (!isZoomed) {
            // Apply Drag-to-Rotate interpolation (only if OrbitControls not handling it)
            if (!controls) {
                floatGroup.rotation.y += (targetRotY - floatGroup.rotation.y) * 0.1;
                floatGroup.rotation.x += (targetRotX - floatGroup.rotation.x) * 0.1;
            }

            // Natural Floating Movement (Sine Waves) - Increased range for better "mixing"
            floatGroup.children.forEach(obj => {
                if (obj.userData && obj.userData.locked) return;

                const physics = obj.userData;
                // Move cards more significantly to reveal ones behind
                obj.position.y = physics.originalPos.y + Math.sin(time * physics.floatSpeed + physics.phaseY) * 12;
                obj.position.x = physics.originalPos.x + Math.cos(time * 0.5 * physics.floatSpeed + physics.phaseX) * 8;

                // Subtle organic rotation
                obj.rotation.z = physics.originalRot.z + Math.sin(time * 0.3 * physics.floatSpeed) * 0.1;
            });

            // Slow idle drift (only if OrbitControls not active)
            if (!controls) {
                targetRotY += 0.0005;
            }
        }

        renderer.render(scene, camera);
    };

    // --- Performance: Loop Handlers ---
    window.stopMemorySceneLoop = () => {
        console.log("Stopping Three.js Memory Loop");
        isLoopRunning = false;
        if (memorySceneVars.animationId) cancelAnimationFrame(memorySceneVars.animationId);
    };

    window.startMemorySceneLoop = () => {
        if (!isLoopRunning) {
            console.log("Starting Three.js Memory Loop");
            isLoopRunning = true;
            animate();
        }
    };

    animate();
    memorySceneVars.isInitialized = true;
}


// --- Scene 3: Letter Logic (Realistic Redesign) ---
function initLetterInteraction() {
    const envelopeContainer = document.getElementById('envelopeContainer');
    const envelopeWrapper = document.getElementById('envelopeWrapper');
    const envelope3D = document.getElementById('envelope3D');
    const letterWrapper = document.getElementById('letterWrapper');
    const textContentEl = document.getElementById('textContent');
    const envelopeFlap = document.getElementById('envelopeFlap');
    const waxSeal = document.getElementById('waxSeal');
    const sealLeft = waxSeal?.querySelector('.seal-half.left');
    const sealRight = waxSeal?.querySelector('.seal-half.right');

    let isAnimating = false;
    let isOpen = false;

    // --- 1. Wax Seal Vibration (Hover) ---
    if (waxSeal) {
        waxSeal.addEventListener('mouseenter', () => {
            if (!isOpen && !isAnimating) {
                gsap.to(waxSeal, {
                    x: "+=2",
                    duration: 0.05,
                    repeat: -1,
                    yoyo: true,
                    ease: "power1.inOut"
                });
            }
        });

        waxSeal.addEventListener('mouseleave', () => {
            if (!isOpen) {
                gsap.killTweensOf(waxSeal);
                gsap.to(waxSeal, { x: 0, duration: 0.2 });
            }
        });
    }

    // Clear text content for Typed.js
    if (textContentEl) textContentEl.innerHTML = '';

    // Add click listener to envelope
    envelopeContainer.addEventListener('click', function () {
        if (isOpen || isAnimating) return;

        isAnimating = true;
        isOpen = true;
        gsap.killTweensOf(waxSeal);

        // 1. Play SFX
        audioManager.play('envelope');

        // 2. Start Background Music if not playing (User specifically requested trigger here)
        if (window.storyApp) {
            window.storyApp.playMusic();
        }

        // Slow down background particles (access via StoryManager instance)
        if (window.storyManager && window.storyManager.cinemaEffectsManager) {
            window.storyManager.cinemaEffectsManager.slowDownParticles();
        }

        const tl = gsap.timeline({
            onComplete: () => {
                // Architectural switch to Reading Mode
                gsap.set(letterWrapper, { clearProps: "transform" });
                letterWrapper.classList.add('reading-mode');

                // Add 3D Parallax Tilt once letter is out
                addEnvelopeParallax(envelopeWrapper);

                isAnimating = false;
                startTypewriterEffect();
            }
        });

        // --- SEQUENCE START ---

        // 1. Step 1: The Clean Break - Seal halves slide apart and rotate
        tl.to(sealLeft, {
            x: -50,
            rotate: -20,
            opacity: 0,
            duration: 0.7,
            ease: "power2.inOut"
        });
        tl.to(sealRight, {
            x: 50,
            rotate: 20,
            opacity: 0,
            duration: 0.7,
            ease: "power2.inOut"
        }, 0);

        // 2. Step 2: The Flap - Wait for seal to clear, then rotate flap upwards
        tl.to(envelopeFlap, {
            rotationX: -180,
            duration: 1.2,
            ease: 'power2.inOut'
        }, 0.8); // 0.1s after seal finishes clearing (0.7 + 0.1)

        // 3. Step 3: Layering Fix - Swap Z-Indices (Letter ABOVE top flap)
        tl.set(letterWrapper, { zIndex: 100 }, 2.0);
        tl.set(envelopeFlap, { zIndex: 1 }, 2.0);

        // 4. Step 4: Reveal - Letter Slide Up out of the pocket
        tl.to(letterWrapper, {
            opacity: 1,
            visibility: 'visible',
            y: -280,
            scale: 1.0,
            duration: 0.9,
            ease: 'power2.out'
        }, 2.1);

        // 5. Final Visual Bridge to Viewport Center
        const vh = window.innerHeight;
        const rect = envelopeContainer.getBoundingClientRect();
        const distToCenter = (vh / 2) - (rect.top + rect.height / 2);

        tl.to(letterWrapper, {
            y: distToCenter,
            duration: 0.8,
            ease: 'power3.inOut'
        }, "+=0.1");

        // Hide instruction
        gsap.to('.envelope-instruction', { opacity: 0, duration: 0.3 });
    });

    function addEnvelopeParallax(el) {
        document.addEventListener('mousemove', (e) => {
            if (!isOpen) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 25;
            const y = -(e.clientY / window.innerHeight - 0.5) * 15;

            gsap.to(el, {
                rotationY: x,
                rotationX: y,
                duration: 1.2,
                ease: 'power1.out',
                overwrite: 'auto'
            });
        });
    }

    function startTypewriterEffect() {
        try {
            if (typeof Typed !== 'undefined') {
                new Typed('#textContent', {
                    strings: [
                        "Dear Warisha,<br><br>Happy Birthday! 😍<br>Wishing you endless happiness, success, and beautiful moments as you step into another wonderful year of your life. 🥳🎉🎂 You are not just a friend but a very special blessing, and I hope this year brings you countless reasons to smile and celebrate.<br><br>اللّٰهُمَّ اجْعَلْ عُمْرَهَا بَرَكَةً وَرِزْقًا وَسَعَادَةً، وَاحْفَظْهُ مِنْ كُلِّ شَرٍّ وَبَلَاءٍ۔ آمِين۔<br><br>اللہ تعالیٰ تمہیں لمبی عمر، اچھی صحت، کامیابی اور خوشیوں بھری زندگی عطا فرمائے۔ آمین 🤲<br><br>May all your dreams come true and may your life always be filled with love, peace, and prosperity.<br><br>^500Once again, Happy Birthday! Stay blessed and keep shining.<br><br>Best Wishes,<br>ZaarGull"
                    ],
                    typeSpeed: 40,
                    startDelay: 300,
                    showCursor: false,
                    onComplete: () => {
                        fadeInWishButton();
                    }
                });
            } else {
                textContentEl.innerHTML = 'Wishing you a day filled with laughter, love, and starlight!<br>You are truly special not just today, but every single day.';
                fadeInWishButton();
            }
        } catch (e) {
            console.error('Typed.js error:', e);
            textContentEl.innerHTML = 'Wishing you a day filled with laughter, love, and starlight!<br>You are truly special not just today, but every single day.';
            fadeInWishButton();
        }
    }
}

function fadeInWishButton() {
    gsap.to('#make-wish-btn', {
        display: 'inline-block',
        opacity: 1,
        duration: 1,
        delay: 0.5,
        onStart: () => {
            const btn = document.getElementById('make-wish-btn');
            if (btn) {
                btn.style.display = 'inline-block';
                btn.style.pointerEvents = 'auto';
            }
        }
    });
}

// Reset envelope state when transitioning away
function resetEnvelopeState() {
    const envelopeWrapper = document.getElementById('envelopeWrapper');
    const letterWrapper = document.getElementById('letterWrapper');
    const envelopeFlap = document.getElementById('envelopeFlap');
    const waxSeal = document.getElementById('waxSeal');
    const sealLeft = waxSeal?.querySelector('.seal-half.left');
    const sealRight = waxSeal?.querySelector('.seal-half.right');

    // Reset particles
    if (window.storyManager && window.storyManager.cinemaEffectsManager) {
        window.storyManager.cinemaEffectsManager.resetParticleSpeed();
    }

    gsap.killTweensOf(envelopeWrapper);
    gsap.killTweensOf(envelopeFlap);
    gsap.killTweensOf(letterWrapper);
    gsap.killTweensOf(waxSeal);
    if (sealLeft) gsap.killTweensOf(sealLeft);
    if (sealRight) gsap.killTweensOf(sealRight);

    if (letterWrapper) {
        letterWrapper.classList.remove('reading-mode');
        letterWrapper.style.opacity = '0';
        letterWrapper.style.visibility = 'hidden';
        letterWrapper.style.transform = '';
        letterWrapper.style.zIndex = '1';
    }
    if (envelopeFlap) {
        envelopeFlap.style.transform = '';
        envelopeFlap.style.zIndex = '4';
    }
    if (waxSeal) {
        gsap.set(waxSeal, { x: 0, opacity: 1, clearProps: "all" });
    }
    if (sealLeft) gsap.set(sealLeft, { x: 0, rotate: 0, opacity: 1 });
    if (sealRight) gsap.set(sealRight, { x: 0, rotate: 0, opacity: 1 });
    if (envelopeWrapper) gsap.set(envelopeWrapper, { rotationX: 0, rotationY: 0 });

    // Clear Typed.js
    const textContent = document.getElementById('textContent');
    if (textContent) textContent.innerHTML = '';

    if (window.Typed && window.Typed.instances) {
        window.Typed.instances.forEach(instance => instance.destroy());
    }

    const makeWishBtn = document.getElementById('make-wish-btn');
    if (makeWishBtn) {
        makeWishBtn.style.opacity = '0';
        makeWishBtn.style.display = 'none';
    }
}


// --- Scene 4: Cake & Finale ---
// --- Scene 4: Cake & Finale ---
function initFinale() {
    if (window.finaleInitialized) return;
    window.finaleInitialized = true;
    console.log("initFinale START");

    // 1. Trigger the SVG Cake Animation Manually
    // 1. Trigger the SVG Cake Animation Manually with DELAY
    setTimeout(() => {
        const firstAnim = document.getElementById('bizcocho_1');
        if (firstAnim && typeof firstAnim.beginElement === 'function') {
            firstAnim.beginElement(); // This starts the chain reaction
            // Play magic whoosh when cake starts appearing
            audioManager.play('magic');
        }
    }, 2000); // 2-second delay as requested

    // 2. Drop the candle AFTER the cake builds (approx 5 seconds later)
    setTimeout(() => {
        const candle = document.querySelector('.candle');
        if (candle) {
            candle.classList.add('drop-in'); // This triggers the CSS animation
        }
    }, 5000); // Increased from 3000 to 5000 to sync with cake delay

    // --- Existing Candle Blow Logic Below ---
    const approaches = ['.candle', '.cake-container .candle'];
    let candle = null;
    for (let sel of approaches) {
        candle = document.querySelector(sel);
        if (candle) break;
    }

    if (!candle) return;
    candle.style.pointerEvents = 'auto';
    candle.style.cursor = 'pointer';

    // Instruction Overlay
    if (!document.querySelector('.candle-instruction')) {
        const instr = document.createElement('div');
        instr.className = 'candle-instruction';
        instr.innerText = "Make a wish and blow out the candle!";
        instr.style.position = 'absolute';
        instr.style.top = '15%';
        instr.style.width = '100%';
        instr.style.textAlign = 'center';
        instr.style.color = '#fff';
        instr.style.fontFamily = "'Amethysta', serif";
        instr.style.fontSize = '1.5rem';
        instr.style.opacity = '0';
        instr.style.transition = 'opacity 1s';
        instr.style.pointerEvents = 'none';
        document.getElementById('scene-finale').appendChild(instr);
        setTimeout(() => { instr.style.opacity = '0.8'; }, 1000);
    }

    let blownOut = false;
    let audioContext = null;
    let micStream = null;

    function blowOutCandle() {
        if (blownOut) return;
        blownOut = true;
        candle.classList.add('out');

        // Play Blow Out SFX
        audioManager.play('blowout');

        gsap.to('#scene-finale', { backgroundColor: '#000', duration: 1 });

        // Hide instruction
        const instr = document.querySelector('.candle-instruction');
        if (instr) instr.style.opacity = '0';

        // Confetti logic...
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }

        setTimeout(() => {
            const finalText = document.querySelector('.finale-text');
            if (finalText) finalText.classList.add('visible');
        }, 1000);

        // --- Cleanup Microphone ---
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            micStream = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }

    candle.addEventListener('click', (e) => {
        e.stopPropagation();
        blowOutCandle();
    });

    // --- Microphone Blow Detection ---
    setTimeout(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    micStream = stream;
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();

                    // Resume context if suspended (browser autoplay policy)
                    if (audioContext.state === 'suspended') {
                        audioContext.resume();
                    }

                    const analyser = audioContext.createAnalyser();
                    const microphone = audioContext.createMediaStreamSource(stream);
                    const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

                    analyser.smoothingTimeConstant = 0.8;
                    analyser.fftSize = 1024;

                    microphone.connect(analyser);
                    analyser.connect(javascriptNode);
                    javascriptNode.connect(audioContext.destination);

                    let blowTriggerCount = 0;

                    javascriptNode.onaudioprocess = function () {
                        if (blownOut) return; // Stop processing if already done

                        const array = new Uint8Array(analyser.frequencyBinCount);
                        analyser.getByteFrequencyData(array);

                        // Calculate volume only from higher frequencies (typical for blow/wind)
                        let blowValue = 0;
                        for (let i = 10; i < 30; i++) {
                            blowValue += array[i];
                        }

                        const averageBlow = blowValue / 20;

                        // FIX: Increased threshold to 75 to avoid instant blowout from background noise
                        if (averageBlow > 75) {
                            blowTriggerCount++;
                            // Require 5 consecutive frames of "blowing" to trigger (approx 0.1s)
                            if (blowTriggerCount > 5) {
                                console.log("Blow Detected! Level:", averageBlow);
                                blowOutCandle();
                            }
                        } else {
                            blowTriggerCount = 0; // Reset if silence/noise drops
                        }
                    };
                })
                .catch(err => {
                    console.log("Microphone access denied or not available. Fallback to click.", err);
                });
        }
    }, 4500); // Increased delay to 4.5s to ensure candle is ready
}


// --- BOOTSTRAP ---
window.initFinale = initFinale; // Expose for button interactions

window.addEventListener('load', () => {
    // Only initialize StoryManager if libraries are present
    if (window.gsap && window.THREE) {
        // Expose manager to window for debugging or easy access
        window.storyApp = new StoryManager();

        // Init scene specific listeners immediately (so they are ready when transitioned)
        initLetterInteraction();
    }
});



