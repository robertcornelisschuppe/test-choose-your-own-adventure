let storyData = [];

// Standard volume for background music when no "boost" is active
const BASE_MUSIC_VOL = 0.3; 

window.onload = function() {
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = true;
    startBtn.innerText = "Loading data...";

    fetch('story.csv')
        .then(response => {
            if (!response.ok) throw new Error("HTTP error " + response.status);
            return response.text();
        })
        .then(data => {
            storyData = parseCSV(data);
            console.log("Loaded Story Data:", storyData);

            if (storyData.length > 0) {
                startBtn.disabled = false;
                startBtn.innerText = "START GAME";
            } else {
                startBtn.innerText = "Error: CSV is empty or formatted wrong";
            }
        })
        .catch(error => {
            console.error('Error loading CSV:', error);
            startBtn.innerText = "Error";
            alert("Error loading story.csv: " + error.message);
        });

    startBtn.addEventListener('click', function() {
        const startScreen = document.getElementById('start-screen');
        startScreen.classList.add('hidden');
        
        document.querySelector('.game-container').style.display = 'block';
        
        if(storyData.length > 0) {
            setTimeout(() => {
                showScene(storyData[0].id);
                setTimeout(() => startScreen.style.display = 'none', 500); 
            }, 100);
        }
    });
};

function showScene(sceneId) {
    const scene = storyData.find(row => row.id === sceneId);

    if (!scene) {
        console.error("CRITICAL ERROR: Scene not found:", sceneId);
        document.getElementById('scene-text').innerText = "Error: Scene '" + sceneId + "' not found.";
        return;
    }

    // --- 1. BACKGROUND IMAGE LOGIC (Double Buffering) ---
    const bgFront = document.getElementById('bg-front');
    const bgBack = document.getElementById('bg-back');
    
    // Determine which layer is currently active (visible)
    let currentLayer = bgFront.classList.contains('bg-visible') ? bgFront : bgBack;
    let nextLayer = currentLayer === bgFront ? bgBack : bgFront;

    if (scene.image && scene.image.trim() !== "") {
        const imgUrl = "images/" + scene.image;
        
        // Create a temp image to pre-load
        const imgLoader = new Image();
        imgLoader.src = imgUrl;
        
        imgLoader.onload = () => {
            // Only run this when image is ready
            nextLayer.style.backgroundImage = `url('${imgUrl}')`;
            
            // Reset animation
            nextLayer.classList.remove('animate-zoom');
            void nextLayer.offsetWidth; // Force reflow
            nextLayer.classList.add('animate-zoom');

            // Crossfade
            nextLayer.classList.add('bg-visible');
            currentLayer.classList.remove('bg-visible');
            
            // Clean up old layer after fade (1.2s)
            setTimeout(() => {
                currentLayer.style.backgroundImage = 'none';
                currentLayer.classList.remove('animate-zoom');
            }, 1200);
        };
    } else {
        // Fallback for scenes with no image
        nextLayer.style.backgroundImage = 'none';
        nextLayer.style.backgroundColor = "#2b2d42";
        nextLayer.classList.add('bg-visible');
        currentLayer.classList.remove('bg-visible');
    }

    // --- 2. CALCULATE VOLUMES ---
    let sfxVolume = 1.0;
    let musicVolume = BASE_MUSIC_VOL;

    if (scene.sfx_vol && scene.sfx_vol.trim() !== "") {
        let parsedVol = parseFloat(scene.sfx_vol);
        if (!isNaN(parsedVol)) {
            if (parsedVol > 100) {
                sfxVolume = 1.0;
                // Ducking logic: Lower music if SFX is boosted
                musicVolume = BASE_MUSIC_VOL * (100 / parsedVol); 
            } else {
                sfxVolume = parsedVol / 100;
                musicVolume = BASE_MUSIC_VOL;
            }
        }
    }
    // Safety clamp
    if (sfxVolume < 0) sfxVolume = 0;
    if (musicVolume < 0) musicVolume = 0;

    // --- 3. AUDIO PLAYBACK ---
    const bgMusic = document.getElementById('bg-music');
    bgMusic.volume = musicVolume; 

    if (scene.audio && scene.audio.trim() !== "") {
        const newAudioSource = "audio/" + scene.audio;
        if (!bgMusic.src.includes(newAudioSource)) {
            bgMusic.src = newAudioSource;
            bgMusic.play().catch(e => console.log("BG Music play error:", e));
        } else if (bgMusic.paused) {
             bgMusic.play().catch(e => console.log("BG Music play error:", e));
        }
    }

    const sfxPlayer = document.getElementById('sfx-player');
    sfxPlayer.pause();
    sfxPlayer.currentTime = 0;

    if (scene.sfx && scene.sfx.trim() !== "") {
        sfxPlayer.src = "audio/" + scene.sfx;
        sfxPlayer.volume = sfxVolume;
        sfxPlayer.play().catch(e => console.log("SFX play error:", e));
    }

    // --- 4. UPDATE TEXT & BUTTONS ---
    document.getElementById('scene-text').innerText = scene.text;
    const optionsContainer = document.getElementById('options-area');
    optionsContainer.innerHTML = "";

    if (scene.option1 && scene.target1) {
        createButton(scene.option1, scene.target1, optionsContainer);
    }
    if (scene.option2 && scene.target2) {
        createButton(scene.option2, scene.target2, optionsContainer);
    }
}

function createButton(text, targetId, container) {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.onclick = () => showScene(targetId);
    container.appendChild(btn);
}

// --- CSV PARSER ---
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
    const parsedData = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        const currentLine = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (currentLine.length > 1) {
            const obj = {};
            headers.forEach((header, index) => {
                let value = currentLine[index] ? currentLine[index].trim() : "";
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                }
                value = value.replace(/""/g, '"');
                obj[header] = value;
            });
            parsedData.push(obj);
        }
    }
    return parsedData;
}
