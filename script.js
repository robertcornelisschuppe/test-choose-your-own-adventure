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

    // --- BACKGROUND LOADER ---
    const bgFront = document.getElementById('bg-front');
    const bgBack = document.getElementById('bg-back');
    
    // Determine which layer is currently active (visible)
    let currentLayer = bgFront.classList.contains('bg-visible') ? bgFront : bgBack;
    let nextLayer = currentLayer === bgFront ? bgBack : bgFront;

    if (scene.image && scene.image.trim() !== "") {
        const imgUrl = "images/" + scene.image;
        
        // 1. Create a temp image to check when it's fully loaded
        const imgLoader = new Image();
        imgLoader.src = imgUrl;
        
        imgLoader.onload = () => {
            // 2. Only runs when image is downloaded and ready
            nextLayer.style.backgroundImage = `url('${imgUrl}')`;
            
            // 3. Reset animation on the new layer so it starts fresh
            nextLayer.classList.remove('animate-zoom');
            void nextLayer.offsetWidth; // Force reflow (reset CSS animation)
            nextLayer.classList.add('animate-zoom');

            // 4. Crossfade: Show new layer, Hide old layer
            nextLayer.classList.add('bg-visible');
            currentLayer.classList.remove('bg-visible');
            
            // Optional: Clean up old layer after fade is done (1 second)
            setTimeout(() => {
                currentLayer.style.backgroundImage = 'none';
                currentLayer.classList.remove('animate-zoom');
            }, 1000);
        };
    } else {
        // Fallback for scenes with no image
        nextLayer.style.backgroundImage = 'none';
        nextLayer.style.backgroundColor = "#2b2d42";
        nextLayer.classList.add('bg-visible');
        currentLayer.classList.remove('bg-visible');
    }

// ... continue with // --- CALCULATE VOLUMES FIRST --- ...

    bgLayer.classList.remove('animate-zoom');
    void bgLayer.offsetWidth; 
    bgLayer.classList.add('animate-zoom');

    // --- CALCULATE VOLUMES FIRST ---
    let sfxVolume = 1.0;
    let musicVolume = BASE_MUSIC_VOL;

    if (scene.sfx_vol && scene.sfx_vol.trim() !== "") {
        let parsedVol = parseFloat(scene.sfx_vol);
        if (!isNaN(parsedVol)) {
            // Logic: If volume is > 100%, we clamp SFX to 1.0 
            // but LOWER the background music to create contrast.
            if (parsedVol > 100) {
                sfxVolume = 1.0;
                // Example: 200% request -> Music drops to half of its base volume
                musicVolume = BASE_MUSIC_VOL * (100 / parsedVol); 
            } else {
                sfxVolume = parsedVol / 100;
                musicVolume = BASE_MUSIC_VOL;
            }
        }
    }
    // Safety clamp (just in case)
    if (sfxVolume < 0) sfxVolume = 0;
    if (musicVolume < 0) musicVolume = 0;

    // --- BACKGROUND MUSIC ---
    const bgMusic = document.getElementById('bg-music');
    
    // Apply the calculated volume (this creates the "loudness" effect)
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

    // --- SOUND EFFECTS ---
    const sfxPlayer = document.getElementById('sfx-player');
    sfxPlayer.pause();
    sfxPlayer.currentTime = 0;

    if (scene.sfx && scene.sfx.trim() !== "") {
        sfxPlayer.src = "audio/" + scene.sfx;
        sfxPlayer.volume = sfxVolume;
        sfxPlayer.play().catch(e => console.log("SFX play error:", e));
        
        console.log(`Playing SFX at: ${sfxVolume*100}% | Music lowered to: ${musicVolume*100}%`);
    }

    // --- TEXT & BUTTONS ---
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

// --- CSV PARSER (Includes the Regex fix for commas in text) ---
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    // 1. Parse Headers
    const headers = lines[0].split(',').map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());

    const parsedData = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;

        // 2. SMARTER SPLIT: Regex ignores commas inside quotes
        const currentLine = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (currentLine.length > 1) {
            const obj = {};
            headers.forEach((header, index) => {
                let value = currentLine[index] ? currentLine[index].trim() : "";
                
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                }
                
                // Fix Excel double-quotes
                value = value.replace(/""/g, '"');
                
                obj[header] = value;
            });
            parsedData.push(obj);
        }
    }
    return parsedData;
}






