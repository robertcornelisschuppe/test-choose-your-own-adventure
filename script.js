let storyData = [];
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
                startBtn.innerText = "Error: CSV is empty";
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
        
        // Prepare the container (make it exist, but it is still invisible due to opacity: 0)
        const gameContainer = document.querySelector('.game-container');
        gameContainer.style.display = 'block';
        
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
        return;
    }

    // --- 1. HIDE TEXT BOX IMMEDIATELY ---
    // We hide it every time a new scene starts so we can fade it in later
    const container = document.querySelector('.game-container');
    container.classList.remove('visible');

// --- 2. BACKGROUND IMAGE LOGIC (With Cinematic Camera) ---
    const bgFront = document.getElementById('bg-front');
    const bgBack = document.getElementById('bg-back');
    
    // Identify which layer is currently active
    let currentLayer = bgFront.classList.contains('bg-visible') ? bgFront : bgBack;
    let nextLayer = currentLayer === bgFront ? bgBack : bgFront;

    if (scene.image && scene.image.trim() !== "") {
        const imgUrl = "images/" + scene.image;
        
        // Preload image
        const imgLoader = new Image();
        imgLoader.src = imgUrl;
        
        imgLoader.onload = () => {
            // 1. Set the new image
            nextLayer.style.backgroundImage = `url('${imgUrl}')`;
            
            // 2. RANDOMIZE THE CAMERA ANGLE
            // This creates the illusion of moving through 3D space.
            // We pick a random point to "zoom towards".
            const x = Math.floor(Math.random() * 100); // 0% to 100%
            const y = Math.floor(Math.random() * 100); // 0% to 100%
            nextLayer.style.transformOrigin = `${x}% ${y}%`;

            // 3. Reset animation classes
            nextLayer.classList.remove('cinematic-move');
            void nextLayer.offsetWidth; // Force browser refresh (Magic trick)
            
            // 4. Start Animation & Fade In
            nextLayer.classList.add('cinematic-move');
            nextLayer.classList.add('bg-visible');
            
            // 5. Hide old layer after fade is done
            currentLayer.classList.remove('bg-visible');
            
            // Clean up the old layer after 1.2s (slightly longer than CSS transition)
            setTimeout(() => {
                currentLayer.style.backgroundImage = 'none';
                currentLayer.classList.remove('cinematic-move');
                // Reset transform so it doesn't get stuck
                currentLayer.style.transform = 'scale(1)'; 
            }, 1200);
        };
    } else {
        // Fallback if no image exists
        nextLayer.style.backgroundImage = 'none';
        nextLayer.style.backgroundColor = "#2b2d42";
        nextLayer.classList.add('bg-visible');
        currentLayer.classList.remove('bg-visible');
    }
    
    // --- 3. CALCULATE VOLUMES ---
    let sfxVolume = 1.0;
    let musicVolume = BASE_MUSIC_VOL;

    if (scene.sfx_vol && scene.sfx_vol.trim() !== "") {
        let parsedVol = parseFloat(scene.sfx_vol);
        if (!isNaN(parsedVol)) {
            if (parsedVol > 100) {
                sfxVolume = 1.0;
                musicVolume = BASE_MUSIC_VOL * (100 / parsedVol); 
            } else {
                sfxVolume = parsedVol / 100;
                musicVolume = BASE_MUSIC_VOL;
            }
        }
    }

    // --- 4. BG MUSIC ---
    const bgMusic = document.getElementById('bg-music');
    bgMusic.volume = musicVolume; 
    if (scene.audio && scene.audio.trim() !== "") {
        const newAudioSource = "audio/" + scene.audio;
        if (!bgMusic.src.includes(newAudioSource)) {
            bgMusic.src = newAudioSource;
            bgMusic.play().catch(e => console.log("BG Music error:", e));
        } else if (bgMusic.paused) {
             bgMusic.play().catch(e => console.log("BG Music error:", e));
        }
    }

    // --- 5. UPDATE TEXT CONTENT (Invisible for now) ---
    document.getElementById('scene-text').innerText = scene.text;
    const optionsContainer = document.getElementById('options-area');
    optionsContainer.innerHTML = "";

    if (scene.option1 && scene.target1) createButton(scene.option1, scene.target1, optionsContainer);
    if (scene.option2 && scene.target2) createButton(scene.option2, scene.target2, optionsContainer);


    // --- 6. SFX & REVEAL LOGIC ---
    const sfxPlayer = document.getElementById('sfx-player');
    
    // Clear any old event listeners so they don't stack up
    sfxPlayer.onended = null;
    sfxPlayer.pause();
    sfxPlayer.currentTime = 0;

    // Check if we have a valid SFX file
    if (scene.sfx && scene.sfx.trim() !== "") {
        sfxPlayer.src = "audio/" + scene.sfx;
        sfxPlayer.volume = sfxVolume;
        
        // When SFX finishes, show the box
        sfxPlayer.onended = () => {
            container.classList.add('visible');
        };

        // Play sound
        sfxPlayer.play().catch(e => {
            console.log("SFX play error (showing text anyway):", e);
            container.classList.add('visible');
        });

    } else {
        // No SFX? Show text immediately (with slight delay for smoothness)
        setTimeout(() => {
            container.classList.add('visible');
        }, 300);
    }
}

function createButton(text, targetId, container) {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.onclick = () => showScene(targetId);
    container.appendChild(btn);
}

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

