import { db, doc, getDoc, setDoc, storage, ref, uploadBytes, getDownloadURL } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE VARIABLES ---
    let currentData = {};
    const saveBtn = document.getElementById('save-btn');
    const CONTENT_DOC_ID = "main"; // ID for the single content document

    let cropper; // Cropper instance
    const cropperModal = document.getElementById('cropper-modal');
    const cropperImage = document.getElementById('cropper-image');
    const btnCancelCrop = document.getElementById('btn-cancel-crop');
    const btnSaveCrop = document.getElementById('btn-save-crop');

    // Ensure modal is hidden initially
    if (cropperModal) cropperModal.style.display = 'none';

    // Helper to open Cropper
    function openCropper(file) {
        console.log('Opening cropper for file:', file.name);
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                cropperImage.src = e.target.result;
                cropperModal.style.display = 'flex';
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
                cropper = new Cropper(cropperImage, {
                    aspectRatio: NaN,
                    viewMode: 1,
                    autoCropArea: 0.8,
                    responsive: true,
                });
                btnSaveCrop.onclick = () => {
                    if (!cropper) return reject('Cropper not initialized');
                    cropper.getCroppedCanvas().toBlob((blob) => {
                        cropperModal.style.display = 'none';
                        resolve(blob);
                    });
                };
                btnCancelCrop.onclick = () => {
                    cropperModal.style.display = 'none';
                    reject('Cropping cancelled');
                };
            };
            reader.readAsDataURL(file);
        });
    }

    // --- 1. INITIALIZATION: FETCH CONTENT FROM FIRESTORE ---
    async function loadContent() {
        try {
            const docRef = doc(db, "content", CONTENT_DOC_ID);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                currentData = docSnap.data();
                populateForm(currentData);
                console.log("Document data:", currentData);
            } else {
                console.log("No such document! Creating usage default...");
                currentData = {}; // Initialize empty if new
            }
        } catch (error) {
            console.error("Error getting document:", error);
            showToast("Error loading data", true);
        }
    }
    loadContent();

    // --- 2. TAB NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.admin-view');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.textContent.includes("Logout")) return;
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');
            pageTitle.textContent = item.textContent;
        });
    });

    // --- HELPER: FIREBASE STORAGE UPLOAD ---
    async function uploadToFirebase(file, folder = "uploads") {
        try {
            const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.name || 'image.jpg'}`;
            const storageRef = ref(storage, `${folder}/${uniqueName}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            return url;
        } catch (error) {
            console.error("Upload failed:", error);
            throw error;
        }
    }

    // --- HELPER: UPDATE PREVIEW ELEMENT ---
    function updatePreview(id, url) {
        const el = document.getElementById(id);
        if (!el) return;
        const parent = el.parentElement;
        const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
        const currentTag = el.tagName.toLowerCase();

        if ((isVideo && currentTag === 'img') || (!isVideo && currentTag === 'video')) {
            const newEl = document.createElement(isVideo ? 'video' : 'img');
            newEl.id = id;
            newEl.style.cssText = el.style.cssText;
            newEl.style.display = 'block';
            if (isVideo) newEl.controls = true;
            newEl.src = url;
            parent.replaceChild(newEl, el);
        } else {
            el.src = url;
            el.style.display = 'block';
        }
    }

    // --- 3. POPULATE FORM ---
    function populateForm(data) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        // Hero
        setVal('hero-title', data.hero?.title);
        setVal('hero-subtitle', data.hero?.subtitle);
        setVal('hero-buttonText', data.hero?.buttonText);
        setVal('hero-backgroundImage', data.hero?.backgroundImage);
        if (data.hero?.backgroundImage) updatePreview('hero-image-preview', data.hero.backgroundImage);

        // Story
        setVal('story-title', data.story?.title);
        setVal('story-date', data.story?.date);
        setVal('story-text', data.story?.text);
        setVal('story-imageUrl', data.story?.imageUrl);
        if (data.story?.imageUrl) updatePreview('story-image-preview', data.story.imageUrl);

        renderTimeline();
        renderGallery();

        // Collage
        setVal('collage-caption', data.collage?.caption);
        if (data.collage?.images) {
            setVal('collage-url-1', data.collage.images[0]);
            updatePreview('collage-preview-1', data.collage.images[0]);
            setVal('collage-url-2', data.collage.images[1]);
            updatePreview('collage-preview-2', data.collage.images[1]);
            setVal('collage-url-3', data.collage.images[2]);
            updatePreview('collage-preview-3', data.collage.images[2]);
        }

        setVal('letter-title', data.letter?.title);
        setVal('letter-text', data.letter?.text);

        setVal('future-title', data.future?.title);
        setVal('future-intro', data.future?.intro);
        setVal('future-buttonText', data.future?.buttonText);
        setVal('future-password', data.future?.password);
        setVal('future-secretTitle', data.future?.secretTitle);
        setVal('future-secretMessage', data.future?.secretMessage);
        setVal('future-videoUrl', data.future?.secretVideoUrl);
        if (data.future?.secretVideoUrl) updatePreview('future-video-preview', data.future.secretVideoUrl);

        // Vibes
        if (data.vibes) {
            [1, 2, 3, 4, 5].forEach(i => {
                setVal(`vibe-url-${i}`, data.vibes[`vibe${i}`]);
                updatePreview(`vibe-preview-${i}`, data.vibes[`vibe${i}`]);
            });
        }

        // Music
        if (data.music) {
            setVal('music-url', data.music.url);
            setVal('music-startTime', data.music.startTime);
            setVal('music-endTime', data.music.endTime);
            setVal('music-volume', data.music.volume);
            const musicAudio = document.getElementById('music-preview');
            const volumeDisplay = document.getElementById('volume-display');
            if (musicAudio && data.music.url) musicAudio.src = data.music.url;
            if (volumeDisplay && data.music.volume) volumeDisplay.textContent = data.music.volume + "%";
        }
    }

    // --- RENDERERS ---
    function renderTimeline() {
        const container = document.getElementById('timeline-list');
        if (!container) return;
        container.innerHTML = '';

        (currentData.timeline || []).forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'item-card';
            div.innerHTML = `
                <div class="item-header">
                    <span>Event #${index + 1}</span>
                    <button type="button" class="btn-remove" onclick="removeTimeline(${index})">Remove</button>
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" value="${item.title || ''}" onchange="updateTimeline(${index}, 'title', this.value)">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="text" value="${item.date || ''}" onchange="updateTimeline(${index}, 'date', this.value)">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea rows="2" onchange="updateTimeline(${index}, 'description', this.value)">${item.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Image</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="hidden" value="${item.imageUrl || ''}" id="timeline-url-${index}">
                        <img src="${item.imageUrl || ''}" id="timeline-preview-${index}" style="width: 40px; height: 40px; object-fit: cover; display: ${item.imageUrl ? 'block' : 'none'}; border-radius: 4px;">
                        <input type="file" id="timeline-file-${index}" style="display:none" onchange="uploadItemImage('timeline', ${index})">
                        <button type="button" class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="document.getElementById('timeline-file-${index}').click()">📁 Upload</button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    function renderGallery() {
        const container = document.getElementById('gallery-list');
        if (!container) return;
        container.innerHTML = '';

        (currentData.gallery || []).forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'item-card gallery-card';
            div.innerHTML = `
                <button type="button" class="btn-remove" style="position:absolute; top:5px; right:5px; z-index:10;" onclick="removeGallery(${index})">X</button>
                <img src="${item.imageUrl || 'https://placehold.co/100?text=No+Image'}" id="gallery-preview-${index}" style="width:100%; height:120px; object-fit:cover; margin-bottom:10px;">
                
                <div class="form-group" style="text-align: center;">
                    <input type="hidden" value="${item.imageUrl || ''}" id="gallery-url-${index}">
                    <input type="file" id="gallery-file-${index}" style="display:none" onchange="uploadItemImage('gallery', ${index})">
                    <button type="button" class="btn-primary" style="width:100%; padding: 5px;" onclick="document.getElementById('gallery-file-${index}').click()">📁 Upload Photo</button>
                </div>
                
                <div class="form-group">
                    <label>Caption</label>
                    <input type="text" value="${item.caption || ''}" onchange="updateGallery(${index}, 'caption', this.value)">
                </div>
            `;
            container.appendChild(div);
        });
    }

    // --- GLOBAL ACTIONS ---
    window.removeTimeline = i => { currentData.timeline.splice(i, 1); renderTimeline(); };
    window.removeGallery = i => { currentData.gallery.splice(i, 1); renderGallery(); };
    window.updateTimeline = (i, f, v) => currentData.timeline[i][f] = v;
    window.updateGallery = (i, f, v) => currentData.gallery[i][f] = v;

    // ADD BUTTONS
    const addTimelineBtn = document.getElementById('add-timeline-btn');
    if (addTimelineBtn) {
        addTimelineBtn.addEventListener('click', () => {
            if (!currentData.timeline) currentData.timeline = [];
            currentData.timeline.push({ title: "New Event", date: "", description: "" });
            renderTimeline();
        });
    }

    const addGalleryBtn = document.getElementById('add-gallery-btn');
    if (addGalleryBtn) {
        addGalleryBtn.addEventListener('click', () => {
            if (!currentData.gallery) currentData.gallery = [];
            currentData.gallery.push({ caption: "", imageUrl: "" });
            renderGallery();
        });
    }

    // --- GENERIC UPLOAD WITH CROP ---
    window.uploadItemImage = (type, index) => {
        const fileInput = document.getElementById(`${type}-file-${index}`);
        if (!fileInput || !fileInput.files[0]) return;

        openCropper(fileInput.files[0]).then(async (blob) => {
            const btn = fileInput.nextElementSibling;
            const originalText = btn.textContent;
            btn.textContent = "Uploading...";

            try {
                const url = await uploadToFirebase(blob, 'uploads');
                if (type === 'timeline') currentData.timeline[index].imageUrl = url;
                if (type === 'gallery') currentData.gallery[index].imageUrl = url;

                const urlInput = document.getElementById(`${type}-url-${index}`);
                if (urlInput) urlInput.value = url;
                updatePreview(`${type}-preview-${index}`, url);
                showToast("Uploaded!");
            } catch (e) {
                console.error(e);
                showToast("Upload Failed", true);
            } finally {
                btn.textContent = originalText;
            }
        });
    };

    // --- OTHER UPLOADS (Hero, Story, Collage, Vibes, Video, Music) ---

    // Generic Handler for Single Elements
    function setupSingleUpload(btnId, inputId, previewId, hiddenInputId, isCropped = true, customName = null) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;

        btn.addEventListener('click', () => input.click());
        input.addEventListener('change', async function () {
            if (!this.files[0]) return;
            const originalText = btn.textContent;

            const doUpload = async (fileToUpload) => {
                btn.textContent = "Uploading...";
                try {
                    const url = await uploadToFirebase(fileToUpload, 'uploads');
                    const hidden = document.getElementById(hiddenInputId);
                    if (hidden) hidden.value = url;
                    updatePreview(previewId, url);
                    showToast("Uploaded!");

                    // Specific logic for Audio Preview update
                    if (previewId === 'music-preview') {
                        const audioObj = document.getElementById('music-preview');
                        if (audioObj) audioObj.src = url;
                    }

                } catch (e) {
                    console.error(e);
                    showToast("Upload Failed", true);
                } finally {
                    btn.textContent = originalText;
                }
            };

            if (isCropped) {
                openCropper(this.files[0]).then(blob => doUpload(blob)).catch(e => console.log(e));
            } else {
                doUpload(this.files[0]);
            }
        });
    }

    setupSingleUpload('hero-upload-btn', 'hero-file-input', 'hero-image-preview', 'hero-backgroundImage');
    setupSingleUpload('story-upload-btn', 'story-file-input', 'story-image-preview', 'story-imageUrl', false); // Story often already good ratio
    setupSingleUpload('future-video-upload-btn', 'future-video-input', 'future-video-preview', 'future-videoUrl', false);
    setupSingleUpload('music-upload-btn', 'music-file-input', 'music-preview', 'music-url', false);

    // Collages
    [1, 2, 3].forEach(num => {
        setupSingleUpload(`btn-upload-collage-${num}`, `file-collage-${num}`, `collage-preview-${num}`, `collage-url-${num}`);
    });

    // Vibes
    [1, 2, 3, 4, 5].forEach(num => {
        setupSingleUpload(`btn-upload-vibe-${num}`, `file-vibe-${num}`, `vibe-preview-${num}`, `vibe-url-${num}`);
    });


    // --- 4. SAVE LOGIC (FIRESTORE) ---
    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            saveBtn.textContent = "Saving...";

            // Construct Data Object (Same as before)
            const updatedData = {
                ...currentData,
                hero: {
                    title: document.getElementById('hero-title').value,
                    subtitle: document.getElementById('hero-subtitle').value,
                    buttonText: document.getElementById('hero-buttonText').value,
                    backgroundImage: document.getElementById('hero-backgroundImage') ? document.getElementById('hero-backgroundImage').value : ''
                },
                story: {
                    title: document.getElementById('story-title').value,
                    date: document.getElementById('story-date').value,
                    text: document.getElementById('story-text').value,
                    imageUrl: document.getElementById('story-imageUrl') ? document.getElementById('story-imageUrl').value : ''
                },
                collage: {
                    caption: document.getElementById('collage-caption').value,
                    images: [
                        document.getElementById('collage-url-1').value,
                        document.getElementById('collage-url-2').value,
                        document.getElementById('collage-url-3').value
                    ]
                },
                letter: {
                    title: document.getElementById('letter-title').value,
                    text: document.getElementById('letter-text').value
                },
                future: {
                    title: document.getElementById('future-title').value,
                    intro: document.getElementById('future-intro').value,
                    buttonText: document.getElementById('future-buttonText').value,
                    password: document.getElementById('future-password').value,
                    secretTitle: document.getElementById('future-secretTitle').value,
                    secretMessage: document.getElementById('future-secretMessage').value,
                    secretVideoUrl: document.getElementById('future-videoUrl') ? document.getElementById('future-videoUrl').value : ''
                },
                vibes: {
                    vibe1: document.getElementById('vibe-url-1').value,
                    vibe2: document.getElementById('vibe-url-2').value,
                    vibe3: document.getElementById('vibe-url-3').value,
                    vibe4: document.getElementById('vibe-url-4').value,
                    vibe5: document.getElementById('vibe-url-5').value
                },
                music: {
                    url: document.getElementById('music-url').value,
                    startTime: document.getElementById('music-startTime').value,
                    endTime: document.getElementById('music-endTime').value,
                    volume: document.getElementById('music-volume').value
                }
            };

            try {
                await setDoc(doc(db, "content", CONTENT_DOC_ID), updatedData);
                showToast('Saved to Firebase!');
                currentData = updatedData;
            } catch (error) {
                console.error("Error writing document: ", error);
                showToast('Error saving data', true);
            } finally {
                saveBtn.textContent = "💾 Save All Changes";
            }
        });
    }

    // --- TOAST NOTIFICATION ---
    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.style.backgroundColor = isError ? '#ef4444' : '#10b981';
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // Volume/Music Preview Logic (Client Side only)
    const volumeInput = document.getElementById('music-volume');
    const volumeDisplay = document.getElementById('volume-display');
    const musicAudio = document.getElementById('music-preview');
    if (volumeInput && volumeDisplay && musicAudio) {
        volumeInput.addEventListener('input', (e) => {
            const val = e.target.value;
            volumeDisplay.textContent = val + "%";
            musicAudio.volume = val / 100;
        });
    }

});
