import { db, doc, getDoc } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', async () => {

    // DEBUG INDICATOR
    const debugEl = document.createElement('div');
    debugEl.style.position = 'fixed';
    debugEl.style.bottom = '10px';
    debugEl.style.left = '10px';
    debugEl.style.background = 'rgba(0,0,0,0.8)';
    debugEl.style.color = '#fff';
    debugEl.style.padding = '5px';
    debugEl.style.fontSize = '12px';
    debugEl.style.zIndex = '10000';
    debugEl.innerText = 'Loading Data...';
    document.body.appendChild(debugEl);

    // --- 1. FETCH CONTENT FROM FIRESTORE ---
    const CONTENT_DOC_ID = "main";
    let siteData = {};

    try {
        const docRef = doc(db, "content", CONTENT_DOC_ID);
        const docSnap = await getDoc(docRef);
        console.log("Firestore Auth Check:", db.app.options.projectId);

        if (docSnap.exists()) {
            siteData = docSnap.data();
            console.log("DEBUG: Full Data from Firestore:", JSON.stringify(siteData, null, 2)); // Added debug log
            debugEl.innerText = 'Data Loaded ✅';
            setTimeout(() => { debugEl.style.display = 'none'; }, 2000);
            renderContent(siteData);
            // Initialize Music after content load
            if (siteData.music) initMusicSystem(siteData.music);
        } else {
            console.log("DEBUG: No content found in Firestore! (docSnap.exists() is false)");
            debugEl.innerText = 'No Data Found ❌';
        }
    } catch (error) {
        console.error("DEBUG: Error fetching content:", error);
        debugEl.innerText = 'Error: ' + error.message;
    }

    // --- 2. RENDER CONTENT TO UI ---
    function renderContent(data) {
        // Helper to safely set text/src
        const setText = (id, text) => { if (data && text) document.getElementById(id).innerText = text; };
        const setSrc = (id, src) => {
            const el = document.getElementById(id);
            if (el && src) {
                el.src = src;
                el.style.display = 'block';
            }
        };

        // Hero
        if (data.hero) {
            setText('hero-title', data.hero.title);
            setText('hero-subtitle', data.hero.subtitle);
            // Fix: Button ID in HTML is 'hero-button', not 'hero-btn'
            const heroBtn = document.getElementById('hero-button');
            if (heroBtn && data.hero.buttonText) heroBtn.innerText = data.hero.buttonText;

            // Fix: Class is .hero-section in HTML, not .hero
            const heroSection = document.querySelector('.hero-section');
            if (heroSection && data.hero.backgroundImage) {
                // Determine if video or image
                if (data.hero.backgroundImage.match(/\.(mp4|webm|ogg|mov)$/i)) {
                    // Create video background if not exists
                    let videoBg = heroSection.querySelector('.hero-video-bg');
                    if (!videoBg) {
                        videoBg = document.createElement('video');
                        videoBg.className = 'hero-video-bg';
                        videoBg.autoplay = true;
                        videoBg.muted = true;
                        videoBg.loop = true;
                        videoBg.playsInline = true;
                        // ... styles same as before ...
                        videoBg.style.position = 'absolute';
                        videoBg.style.top = '0';
                        videoBg.style.left = '0';
                        videoBg.style.width = '100%';
                        videoBg.style.height = '100%';
                        videoBg.style.objectFit = 'cover';
                        videoBg.style.zIndex = '-1';
                        heroSection.insertBefore(videoBg, heroSection.firstChild);
                    }
                    videoBg.src = data.hero.backgroundImage;
                } else {
                    heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${data.hero.backgroundImage}')`;
                    heroSection.style.backgroundSize = 'cover'; // Ensure cover
                    heroSection.style.backgroundPosition = 'center';
                }
            }
        }

        // Story
        if (data.story) {
            setText('story-title', data.story.title);
            setText('story-date', data.story.date);
            setText('story-text', data.story.text);

            // Fix: Class is .image-content in HTML, not .story-img
            const storyImgContainer = document.querySelector('.image-content');
            if (data.story.imageUrl && storyImgContainer) {
                if (data.story.imageUrl.match(/\.(mp4|webm|ogg|mov)$/i)) {
                    storyImgContainer.innerHTML = `<video src="${data.story.imageUrl}" autoplay muted loop playsinline class="rounded-img shadow-dreamy" style="width:100%" onclick="openLightbox('${data.story.imageUrl}', true)"></video>`;
                } else {
                    // Use existing image tag if possible to keep styles
                    storyImgContainer.innerHTML = `<img src="${data.story.imageUrl}" alt="Our Story" class="rounded-img shadow-dreamy" onclick="openLightbox('${data.story.imageUrl}')">`;
                }
            }
        }

        // Timeline
        const timelineContainer = document.querySelector('.timeline');
        if (timelineContainer && data.timeline) {
            console.log("Rendering Timeline with items:", data.timeline); // Debug Log
            timelineContainer.innerHTML = ''; // Clear defaults

            if (data.timeline.length === 0) {
                timelineContainer.innerHTML = '<p style="text-align:center;">No moments added yet.</p>';
            }

            data.timeline.forEach((item, index) => {
                console.log("Creating Timeline Item:", item); // Debugging each item
                const div = document.createElement('div');
                // Removed 'fade-in' and added inline styles to FORCE VISIBILITY immediately
                div.className = `timeline-item ${index % 2 === 0 ? 'left' : 'right'}`;
                div.style.opacity = '1';
                div.style.transform = 'none';

                let mediaHtml = '';
                if (item.videoUrl) {
                    mediaHtml = getVideoHTML(item.videoUrl);
                } else if (item.imageUrl) {
                    if (item.imageUrl.match(/\.(mp4|webm|ogg|mov)$/i)) {
                        mediaHtml = `<video src="${item.imageUrl}" autoplay muted loop playsinline onclick="openLightbox('${item.imageUrl}', true)"></video>`;
                    } else {
                        mediaHtml = `<img src="${item.imageUrl}" alt="${item.title}" onclick="openLightbox('${item.imageUrl}')">`;
                    }
                }

                div.innerHTML = `
                    <div class="timeline-content glow-box">
                        <h3>${item.title}</h3>
                        <span class="date">${item.date}</span>
                        <p>${item.description}</p>
                        ${mediaHtml}
                    </div>
                `;
                timelineContainer.appendChild(div);
            });
            // Re-init animations called later
        } else {
            console.log("Timeline data missing or container not found", data.timeline);
        }

        // Gallery
        const galleryGrid = document.querySelector('.gallery-grid');
        if (galleryGrid && data.gallery) {
            galleryGrid.innerHTML = '';
            data.gallery.forEach(item => {
                const div = document.createElement('div');
                div.className = 'gallery-item glow-box fade-in-up'; // Add animation class

                let mediaHtml = '';
                if (item.videoUrl) {
                    mediaHtml = getVideoHTML(item.videoUrl);
                } else {
                    mediaHtml = `<img src="${item.imageUrl}" alt="${item.caption}" onclick="openLightbox('${item.imageUrl}')">`;
                }

                div.innerHTML = `
                    ${mediaHtml}
                    <p class="caption">${item.caption}</p>
                `;
                galleryGrid.appendChild(div);
            });
            // Re-init animations called later
        }

        // Collage
        if (data.collage) {
            // FIX: Handle both old array format and new object format {caption, images[]}
            let collageImages = [];
            let collageCaption = "";

            if (Array.isArray(data.collage)) {
                collageImages = data.collage;
            } else if (data.collage.images && Array.isArray(data.collage.images)) {
                collageImages = data.collage.images;
                collageCaption = data.collage.caption || "";
            }

            // Set Caption
            const captionEl = document.getElementById('collage-caption-text');
            if (captionEl) {
                // Use explicit caption if found, otherwise existing text (or empty)
                if (collageCaption) captionEl.innerText = collageCaption;
            }

            // Fix: Target the 3 specific slots
            const slots = [
                document.getElementById('collage-img-1-container'),
                document.getElementById('collage-img-2-container'),
                document.getElementById('collage-img-3-container')
            ];

            // Fill Slots
            console.log("Rendering Collage with images:", collageImages);
            collageImages.slice(0, 3).forEach((imageUrl, index) => {
                const container = slots[index];
                if (container) {
                    // Admin saves simple strings in images[], not objects with imageUrl
                    // BUT previous code used item.imageUrl. 
                    // Let's check if item is string or object.
                    const src = (typeof imageUrl === 'string') ? imageUrl : imageUrl.imageUrl;
                    console.log(`Collage Slot ${index + 1}:`, src);

                    if (src) {
                        container.innerHTML = `<img src="${src}" alt="Memory" onclick="openLightbox('${src}')">`;
                    } else {
                        console.warn(`Collage Slot ${index + 1} has no URL`);
                    }
                }
            });
        }

        // Letter
        if (data.letter) {
            setText('letter-title', data.letter.title);
            // Store text in hidden source div for typewriter effect
            const sourceText = document.getElementById('source-text');
            if (sourceText) sourceText.innerText = data.letter.text || "Your letter text goes here...";
        }

        // Future / Secret
        if (data.future) {
            setText('future-title', data.future.title);
            setText('future-intro', data.future.intro);
            // Fix: ID is reveal-btn, not class btn-secret
            const btn = document.getElementById('reveal-btn');
            if (btn) btn.innerText = data.future.buttonText;

            // Password logic
            window.secretPassword = data.future.password; // Store for check
            window.secretContent = {
                title: data.future.secretTitle,
                message: data.future.secretMessage,
                video: data.future.secretVideoUrl
            };
        }

        // Vibes
        if (data.vibes) {
            console.log("Rendering Vibes with data:", data.vibes);
            [1, 2, 3, 4, 5].forEach(i => {
                // nth-child is 1-based
                const card = document.querySelector(`.vibes-grid .vibe-card:nth-child(${i})`);
                const vibeKey = `vibe${i}`;
                const vibeUrl = data.vibes[vibeKey];

                if (card) {
                    if (vibeUrl) {
                        console.log(`Setting Vibe ${i} (${vibeKey}) to:`, vibeUrl);
                        card.style.backgroundImage = `url('${vibeUrl}')`;
                        card.style.backgroundSize = 'cover';
                        card.style.backgroundPosition = 'center';
                        card.style.backgroundRepeat = 'no-repeat';
                        card.classList.add('has-image');

                        // Add Click to Open Lightbox (Closure to capture URL)
                        card.style.cursor = 'pointer';
                        card.onclick = () => openLightbox(vibeUrl);
                    } else {
                        console.warn(`No URL found for Vibe ${i} (${vibeKey})`);
                    }
                } else {
                    console.error(`Vibe card element ${i} not found!`);
                }
            });
        } else {
            console.warn("No 'vibes' data found in siteData");
        }
        // Re-call observer setup at the end of render
        setTimeout(initItemAnimations, 100);
    }

    // --- TYPEWRITER EFFECT ---
    function startTypewriter() {
        const source = document.getElementById('source-text');
        const target = document.getElementById('typing-text');
        if (!source || !target) {
            console.error("Typewriter elements not found:", { source, target });
            return;
        }

        const text = source.textContent; // Use textContent to read even if hidden
        console.log("Starting Typewriter with text length:", text.length, "Text:", text.substring(0, 20) + "...");

        target.innerHTML = ""; // Clear
        let i = 0;

        function type() {
            if (i < text.length) {
                target.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, 50); // Speed
            } else {
                console.log("Typewriter finished");
                const cursor = document.querySelector('.cursor');
                if (cursor) cursor.style.display = 'none'; // Hide cursor when done
            }
        }
        type();
    }

    // --- 3. ANIMATIONS & INTERACTIONS ---

    function initItemAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');

                    // Trigger Typewriter if Letter Section
                    // FIX: Check for .letter-card since that's what we observe
                    if (entry.target.classList.contains('letter-card') || entry.target.querySelector('.letter-body')) {
                        console.log("Letter section visible! Starting typewriter...");
                        startTypewriter();
                        observer.unobserve(entry.target); // Run once
                    }
                }
            });
        }, { threshold: 0.2 });

        // Fix: Observe ALL animated elements, including Hero, Story card, etc.
        // Added: .hero-content, .glass-card, .collage-frame, .fade-in, .fade-in-up
        document.querySelectorAll('.timeline-item, .gallery-item, .vibe-card, .letter-card, .hero-content, .glass-card, .collage-frame, .fade-in, .fade-in-up').forEach(el => {
            observer.observe(el);
        });

        // SAFETY FALLBACK: Force visibility after 1s if observer fails
        setTimeout(() => {
            document.querySelectorAll('.timeline-item, .gallery-item').forEach(el => {
                if (!el.classList.contains('visible')) {
                    console.log("Force showing item:", el);
                    el.classList.add('visible');
                    el.style.opacity = 1;
                    el.style.transform = 'translateY(0)';
                }
            });
        }, 1000);
    }

    let isTyping = false;
    function startTypewriter() {
        if (isTyping) return;
        const sourceHelper = document.getElementById('source-text');
        const typingTarget = document.getElementById('typing-text');

        if (!sourceHelper || !typingTarget) return;

        const text = sourceHelper.innerText;
        typingTarget.innerHTML = ""; // Clear existing
        isTyping = true;

        let i = 0;
        function type() {
            if (i < text.length) {
                // Add newlines as <br>
                if (text.charAt(i) === '\n') {
                    typingTarget.innerHTML += '<br>';
                } else {
                    typingTarget.innerHTML += text.charAt(i);
                }
                i++;
                setTimeout(type, 50); // Adjust speed here
            } else {
                isTyping = false;
            }
        }
        type();
    }

    // Modal / Lightbox Logic
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const closeLightbox = document.querySelector('.close-lightbox');

    window.openLightbox = (src, isVideo = false) => {
        lightbox.style.display = 'flex';
        if (isVideo) {
            lightboxImg.style.display = 'none';
            lightboxVideo.style.display = 'block';
            lightboxVideo.src = src;

            // Request Fullscreen for native video elements
            if (lightboxVideo.requestFullscreen) {
                lightboxVideo.requestFullscreen();
            } else if (lightboxVideo.webkitRequestFullscreen) { /* Safari */
                lightboxVideo.webkitRequestFullscreen();
            } else if (lightboxVideo.msRequestFullscreen) { /* IE11 */
                lightboxVideo.msRequestFullscreen();
            }
        } else {
            lightboxVideo.style.display = 'none';
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            lightboxVideo.pause();
            lightboxImg.style.display = 'block';
            lightboxImg.src = src;
        }
    };

    if (closeLightbox) {
        closeLightbox.addEventListener('click', () => {
            lightbox.style.display = 'none';
            lightboxVideo.pause();
        });
    }

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
            lightboxVideo.pause();
        }
    });

    // Secret Section Logic
    // Secret logic moved to end of file to consolidate selectors


    // --- 4. MUSIC SYSTEM ---
    function initMusicSystem(musicData) {
        if (!musicData || !musicData.url) return;

        const audio = new Audio(musicData.url);
        audio.volume = (musicData.volume || 50) / 100;

        const startTime = parseFloat(musicData.startTime) || 0;
        const endTime = parseFloat(musicData.endTime) || 0;

        audio.currentTime = startTime;

        // Loop Logic
        if (endTime > 0 && endTime > startTime) {
            audio.addEventListener('timeupdate', () => {
                if (audio.currentTime >= endTime) {
                    audio.currentTime = startTime;
                    audio.play();
                }
            });
        } else {
            audio.loop = true;
        }

        // Floating Button Logic
        const musicBtn = document.querySelector('.music-floating-btn');
        let isPlaying = false;

        if (musicBtn) {
            musicBtn.style.display = 'flex'; // Show button only if music exists
            musicBtn.addEventListener('click', () => {
                if (isPlaying) {
                    audio.pause();
                    musicBtn.classList.remove('playing');
                    musicBtn.innerHTML = '🎵';
                } else {
                    audio.play().catch(e => console.log("Autoplay blocked", e));
                    musicBtn.classList.add('playing');
                    musicBtn.innerHTML = '⏸️';
                }
                isPlaying = !isPlaying;
            });
        }

        // Optional: Auto-play interaction (browsers block auto-audio)
        document.body.addEventListener('click', () => {
            if (!isPlaying && musicBtn) {
                // specific behavior if desired, or leave manual
            }
        }, { once: true });
    }

    // --- 5. VISUAL EFFECTS ---

    // A. Background Floating Hearts (Rising)
    function createFallingHearts() {
        const container = document.createElement('div');
        container.classList.add('hearts-bg-container');
        document.body.appendChild(container);

        const heartCount = 40; // More hearts for slow motion fill
        for (let i = 0; i < heartCount; i++) {
            const h = document.createElement('div');
            h.classList.add('bg-heart');
            h.innerText = '❤'; // Only Love Symbols

            // Randomize position and animation
            h.style.left = Math.random() * 100 + "vw";
            h.style.animationDuration = (Math.random() * 10 + 15) + "s"; // 15-25s duration (Slow Motion)
            h.style.fontSize = (Math.random() * 20 + 10) + "px"; // 10-30px size
            h.style.animationDelay = Math.random() * 15 + "s"; // Spread out start times

            container.appendChild(h);
        }
    }
    createFallingHearts();

    // B. Cursor Heart Particles (Spawns on move)
    const trailContainer = document.createElement('div');
    trailContainer.style.position = 'fixed';
    trailContainer.style.pointerEvents = 'none';
    trailContainer.style.zIndex = '9999';
    document.body.appendChild(trailContainer);

    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;

    window.addEventListener("mousemove", function (e) {
        const x = e.clientX;
        const y = e.clientY;
        const now = Date.now();

        // Throttle creation: More frequent for smoother/denser stream
        if (now - lastTime > 10 || Math.abs(x - lastX) > 10 || Math.abs(y - lastY) > 10) {
            createCursorHeart(x, y);
            lastTime = now;
            lastX = x;
            lastY = y;
        }
    });

    function createCursorHeart(x, y) {
        const h = document.createElement('div');
        h.classList.add('cursor-heart');
        h.innerText = '❤';

        // Randomize size
        const size = Math.random() * 20 + 10; // 10-30px
        h.style.fontSize = `${size}px`;
        h.style.left = `${x - size / 2}px`;
        h.style.top = `${y - size / 2}px`;
        h.style.position = 'fixed';
        h.style.pointerEvents = 'none';

        // Initial State
        h.style.transition = "transform 1s ease-out, opacity 1s ease-out";
        h.style.transform = "scale(0.5) translate(0, 0)";
        h.style.opacity = "1";

        trailContainer.appendChild(h);

        // Animate Out (Next Frame)
        requestAnimationFrame(() => {
            // Move: Random spread X, Float UP Y (negative)
            const moveX = Math.random() * 60 - 30; // -30 to +30
            const moveY = Math.random() * -100 - 20; // -20 to -120 (Always UP)
            const rotate = Math.random() * 360;

            h.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${rotate}deg) scale(1.5)`;
            h.style.opacity = "0";
        });

        // Cleanup
        setTimeout(() => {
            h.remove();
        }, 1000);
    }

    // FIX: Future Button Selector
    const secretBtn = document.getElementById('reveal-btn'); // Changed from .btn-secret
    if (secretBtn) {
        secretBtn.addEventListener('click', () => {
            const userPass = prompt("Enter the secret password:");
            // ... (rest of logic same)
            if (userPass === window.secretPassword) {
                const container = document.querySelector('.hidden-content'); // Changed target to existing container
                if (container) {
                    container.style.display = 'block';
                    container.innerHTML = `
                    <div class="secret-reveal glow-box" style="animation: fadeIn 1s forwards;">
                        <h2>${window.secretContent.title}</h2>
                        <div style="margin: 20px 0;">${window.secretContent.message}</div>
                        ${getVideoHTML(window.secretContent.video)}
                    </div>
                `;
                }
            } else {
                alert("Incorrect password. This secret remains locked. 🔒");
            }
        });
    }

    function getVideoHTML(url) {
        if (!url) return '';

        // 1. Google Drive (view -> preview)
        if (url.includes('drive.google.com') && url.includes('/view')) {
            const embedUrl = url.replace('/view', '/preview');
            return `<iframe src="${embedUrl}" width="100%" height="300" style="border-radius:10px; border:none; box-shadow: 0 0 20px rgba(139,92,246,0.5);" allow="autoplay" allowfullscreen></iframe>`;
        }

        // 2. YouTube (watch?v= -> embed/)
        if (url.includes('youtube.com/watch?v=')) {
            const videoId = url.split('v=')[1].split('&')[0];
            return `<iframe src="https://www.youtube.com/embed/${videoId}" width="100%" height="300" style="border-radius:10px; border:none; box-shadow: 0 0 20px rgba(139,92,246,0.5);" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }
        // 3. YouTube Short (shorts/ -> embed/)
        if (url.includes('youtube.com/shorts/')) {
            const videoId = url.split('shorts/')[1].split('?')[0];
            return `<iframe src="https://www.youtube.com/embed/${videoId}" width="100%" height="300" style="border-radius:10px; border:none; box-shadow: 0 0 20px rgba(139,92,246,0.5);" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }

        // 4. Default: Direct Video File
        return `<div class="video-wrapper">
                    <video src="${url}" controls style="width:100%; border-radius:10px; box-shadow: 0 0 20px rgba(139,92,246,0.5);"></video>
                </div>`;
    }

});
