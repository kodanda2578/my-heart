import { db, doc, getDoc } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', async () => {

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
            renderContent(siteData);
            // Initialize Music after content load
            if (siteData.music) initMusicSystem(siteData.music);
        } else {
            console.log("DEBUG: No content found in Firestore! (docSnap.exists() is false)");
        }
    } catch (error) {
        console.error("DEBUG: Error fetching content:", error);
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
                    storyImgContainer.innerHTML = `<video src="${data.story.imageUrl}" autoplay muted loop playsinline class="rounded-img shadow-dreamy" style="width:100%"></video>`;
                } else {
                    // Use existing image tag if possible to keep styles
                    storyImgContainer.innerHTML = `<img src="${data.story.imageUrl}" alt="Our Story" class="rounded-img shadow-dreamy">`;
                }
            }
        }

        // Timeline
        const timelineContainer = document.querySelector('.timeline');
        if (timelineContainer && data.timeline) {
            timelineContainer.innerHTML = ''; // Clear defaults
            data.timeline.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = `timeline-item ${index % 2 === 0 ? 'left' : 'right'} fade-in`; // Add fade-in class

                let mediaHtml = '';
                if (item.imageUrl) {
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
        }

        // Gallery
        const galleryGrid = document.querySelector('.gallery-grid');
        if (galleryGrid && data.gallery) {
            galleryGrid.innerHTML = '';
            data.gallery.forEach(item => {
                const div = document.createElement('div');
                div.className = 'gallery-item glow-box fade-in-up'; // Add animation class
                div.innerHTML = `
                    <img src="${item.imageUrl}" alt="${item.caption}" onclick="openLightbox('${item.imageUrl}')">
                    <p class="caption">${item.caption}</p>
                `;
                galleryGrid.appendChild(div);
            });
            // Re-init animations called later
        }

        // ... (Collage, Letter, Future sections - generally okay, check IDs) ...

        // Re-call observer setup at the end of render
        setTimeout(initItemAnimations, 100);
    }

    // --- 3. ANIMATIONS & INTERACTIONS ---

    function initItemAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        // Fix: Observe ALL animated elements, including Hero, Story card, etc.
        // Added: .hero-content, .glass-card, .collage-frame, .fade-in, .fade-in-up
        document.querySelectorAll('.timeline-item, .gallery-item, .vibe-card, .letter-content, .hero-content, .glass-card, .collage-frame, .fade-in, .fade-in-up').forEach(el => {
            observer.observe(el);
        });
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
        } else {
            lightboxVideo.style.display = 'none';
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

    // --- 5. CURSOR TRAIL ---
    // Create hearts programmatically
    const heartsContainer = document.createElement('div');
    heartsContainer.className = 'hearts-container';
    document.body.appendChild(heartsContainer);

    const heartCount = 20;
    for (let i = 0; i < heartCount; i++) {
        const h = document.createElement('div');
        h.className = 'heart';
        h.innerText = '❤';
        heartsContainer.appendChild(h);
    }

    const coords = { x: 0, y: 0 };
    const hearts = document.querySelectorAll(".heart");

    // Initial Color Reset & Style
    hearts.forEach(function (heart) {
        heart.x = 0;
        heart.y = 0;
        heart.style.position = 'fixed';
        heart.style.pointerEvents = 'none';
        heart.style.zIndex = '9999';
        heart.style.opacity = '0'; // Start hidden
        heart.style.fontSize = '20px';
        heart.style.color = '#d4af37';
        heart.style.textShadow = '0 0 5px rgba(212, 175, 55, 0.6)';
    });

    window.addEventListener("mousemove", function (e) {
        coords.x = e.clientX;
        coords.y = e.clientY;
    });

    function animateHearts() {
        let x = coords.x;
        let y = coords.y;

        hearts.forEach(function (heart, index) {
            heart.style.left = x - 12 + "px";
            heart.style.top = y - 12 + "px";

            // Fade out tail
            heart.style.opacity = (hearts.length - index) / hearts.length;

            // Only show if mouse has moved (coords not 0,0)
            if (coords.x === 0 && coords.y === 0) heart.style.opacity = 0;

            heart.x = x;
            heart.y = y;

            const nextHeart = hearts[index + 1] || hearts[0];
            x += (nextHeart.x - x) * 0.3;
            y += (nextHeart.y - y) * 0.3;
        });

        requestAnimationFrame(animateHearts);
    }

    if (hearts.length > 0) animateHearts();

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
                        ${window.secretContent.video ? `
                        <div class="video-wrapper">
                            <video src="${window.secretContent.video}" controls style="width:100%; border-radius:10px; box-shadow: 0 0 20px rgba(139,92,246,0.5);"></video>
                        </div>` : ''}
                    </div>
                `;
                }
            } else {
                alert("Incorrect password. This secret remains locked. 🔒");
            }
        });
    }

});
