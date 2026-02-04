let storyData = [];

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
        
        // Show the game container
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

    // --- BACKGROUND IMAGE ---
    const bgLayer = document.getElementById('background-layer');
    if (scene.image && scene.image.trim() !== "") {
        bgLayer.style.backgroundImage = "url('images/" + scene.image + "')";
    } else {
        bgLayer.style.backgroundImage = "none";
        bgLayer.style.backgroundColor = "#2b2d42";
    }

    // Animation Reflow
    bgLayer.classList.remove('animate-zoom');
    void bgLayer.offsetWidth; 
    bgLayer.classList.add('animate-zoom');

    // --- BACKGROUND MUSIC ---
    const bgMusic = document.getElementById('bg-music');
    // Ensure BG music is at full volume (or you can add a column for this too later)
    bgMusic.volume = 0.5; // Setting BG music to 50% globally so SFX pops more

    if (scene.audio && scene.audio.trim() !== "") {
        const newAudioSource = "audio/" + scene.audio;
        if (!bgMusic.src.includes(newAudioSource)) {
            bgMusic.src = newAudioSource;
            bgMusic.play().catch(e => console.log("BG Music play error:", e));
        } else if (bgMusic.paused) {
             bgMusic.play().catch(e => console.log("BG Music play error:", e));
        }
    } else {
        // Optional: bgMusic.pause(); 
    }

    // --- NEW: SOUND EFFECTS WITH VOLUME CONTROL ---
    const sfxPlayer = document.getElementById('sfx-player');
    
    // 1. Reset
    sfxPlayer.pause();
    sfxPlayer.currentTime = 0;

    // 2. Check for file
    if (scene.sfx && scene.sfx.trim() !== "") {
        sfxPlayer.src = "audio/" + scene.sfx;
        
        // 3. VOLUME LOGIC
        // Default to 1.0 (100%) if the column is empty or invalid
        let volume = 1.0; 
        
        if (scene.sfx_vol && scene.sfx_vol.trim() !== "") {
            // Convert String "50" to Number 50
            let parsedVol = parseFloat(scene.sfx_vol);
            
            // Check if it is a valid number
            if (!isNaN(parsedVol)) {
                // Convert percentage to decimal (50 -> 0.5)
                volume = parsedVol / 100;
                
                // Safety clamp (ensure it stays between 0 and 1)
                if (volume > 1) volume = 1;
                if (volume < 0) volume = 0;
            }
        }

        sfxPlayer.volume = volume;
        sfxPlayer.play().catch(e => console.log("SFX play error:", e));
    }
    // ---------------------------------------------

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

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    const commaCount = (lines[0].match(/,/g) || []).length;
    const semiCount = (lines[0].match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ';' : ',';

    let headers = lines[0].split(delimiter);
    headers = headers.map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());

    const parsedData = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;

        let currentLine = lines[i].split(delimiter);
        
        if (currentLine.length >= headers.length) {
            const obj = {};
            headers.forEach((header, index) => {
                let value = currentLine[index] ? currentLine[index].trim() : "";
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                }
                obj[header] = value;
            });
            parsedData.push(obj);
        }
    }
    return parsedData;
}