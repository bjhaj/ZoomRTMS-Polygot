import zoomSdk from '@zoom/appssdk';

let rtmsStarted = false;
// Track previous speaker and timestamp for determining when to show speaker name
let lastSpeaker = null;
let lastTimestamp = 0;

(async () => {
    try {
        // Configure the Zoom SDK with required capabilities
        const configResponse = await zoomSdk.config({
            capabilities: ['startRTMS', 'stopRTMS', 'shareApp'],
            version: '0.16.0'
        });

        console.log('Zoom JS SDK Configuration:', configResponse);

        const { runningContext } = configResponse;
        
        // Initialize WebSocket connection to our server
        initializeWebSocket();
        
        // Check if we're in a meeting
        if (runningContext === 'inMeeting') {
            console.log('Running in a Zoom meeting, setting up RTMS controls');
            setupRtmsControls();
        } else {
            console.log('Not running in a meeting context. RTMS will not be available.');
            document.getElementById('waiting-message').textContent = 
                'Please join a Zoom meeting to use RTMS features.';
        }
    } catch (e) {
        console.error('Error in Zoom SDK initialization:', e);
        document.getElementById('waiting-message').textContent = 
            'Error initializing Zoom SDK: ' + e.message;
    }
})();

// Set up controls for starting and stopping RTMS
function setupRtmsControls() {
    // Create RTMS control buttons
    const container = document.getElementById('transcription-container');
    const controlDiv = document.createElement('div');
    controlDiv.className = 'rtms-controls';
    
    // Add language selector
    const languages = [
        { code: 'es', name: 'Spanish', flag: '🇪🇸' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'de', name: 'German', flag: '🇩🇪' },
        { code: 'it', name: 'Italian', flag: '🇮🇹' },
        { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
        { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
        { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
        { code: 'ko', name: 'Korean', flag: '🇰🇷' },
        { code: 'ru', name: 'Russian', flag: '🇷🇺' },
        { code: 'ar', name: 'Arabic', flag: '🇸🇦' }
    ];
    
    const languageOptions = languages.map(lang => 
        `<option value="${lang.code}" data-flag="${lang.flag}">${lang.flag} ${lang.name}</option>`
    ).join('');
    
    controlDiv.innerHTML = `
        <div class="control-row">
            <button id="start-rtms" class="rtms-button">Start Transcription</button>
            <button id="stop-rtms" class="rtms-button" disabled>Stop Transcription</button>
        </div>
        <div class="control-row language-selector-container">
            <label for="language-selector">Translation language: </label>
            <select id="language-selector" class="language-selector">
                ${languageOptions}
            </select>
        </div>
    `;
    
    // Insert controls at the top of the container
    container.insertBefore(controlDiv, container.firstChild);
    
    // Add event listeners
    document.getElementById('start-rtms').addEventListener('click', startRtms);
    document.getElementById('stop-rtms').addEventListener('click', stopRtms);
    document.getElementById('language-selector').addEventListener('change', function() {
        window.selectedLanguage = this.value;
        const selectedOption = this.options[this.selectedIndex];
        window.selectedLanguageFlag = selectedOption.getAttribute('data-flag');
        // Clear and retranslate all visible messages
        refreshTranscriptDisplay();
    });
    
    // Set default language
    window.selectedLanguage = 'es';
    window.selectedLanguageFlag = '🇪🇸';
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .rtms-controls {
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .control-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .language-selector-container {
            margin-top: 5px;
        }
        .language-selector {
            padding: 6px 10px;
            border-radius: 4px;
            border: 1px solid #ddd;
            font-size: 14px;
            min-width: 180px;
        }
        .rtms-button {
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-weight: bold;
        }
        #start-rtms {
            background-color: #2D8CFF;
            color: white;
        }
        #stop-rtms {
            background-color: #FF5C5C;
            color: white;
        }
        .rtms-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .minimalist-translation {
            padding: 8px 12px;
            margin-bottom: 8px;
            background-color: rgba(0,0,0,0.7);
            color: white;
            border-radius: 4px;
            font-size: 16px;
            max-width: 90%;
            align-self: flex-start;
            animation: fadeIn 0.3s;
        }
    `;
    document.head.appendChild(style);
}

// Function to start RTMS
async function startRtms() {
    try {
        document.getElementById('waiting-message').textContent = 'Starting transcription...';
        
        console.log('Requesting RTMS start from Zoom...');
        const rtmsResponse = await zoomSdk.callZoomApi('startRTMS');
        console.log('RTMS Start Response:', rtmsResponse);
        
        // Update button states
        document.getElementById('start-rtms').disabled = true;
        document.getElementById('stop-rtms').disabled = false;
        rtmsStarted = true;
        
        // Reset speaker tracking
        lastSpeaker = null;
        lastTimestamp = 0;
        
        document.getElementById('waiting-message').textContent = 'Transcription started. Waiting for speech...';
    } catch (error) {
        console.error('Failed to start RTMS:', error);
        document.getElementById('waiting-message').textContent = 
            'Error starting transcription: ' + error.message;
    }
}

// Function to stop RTMS
async function stopRtms() {
    try {
        console.log('Requesting RTMS stop from Zoom...');
        const stopResponse = await zoomSdk.callZoomApi('stopRTMS');
        console.log('RTMS Stop Response:', stopResponse);
        
        // Update button states
        document.getElementById('start-rtms').disabled = false;
        document.getElementById('stop-rtms').disabled = true;
        rtmsStarted = false;
        
        document.getElementById('waiting-message').textContent = 'Transcription stopped.';
    } catch (error) {
        console.error('Failed to stop RTMS:', error);
    }
}

// Initialize WebSocket connection to receive transcriptions
function initializeWebSocket() {
    // Determine if we're using secure WebSocket (wss://) or not (ws://)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const socket = new WebSocket(wsUrl);
    const transcriptionList = document.getElementById('transcription-list');
    const waitingMessage = document.getElementById('waiting-message');
    
    // Keep track of all messages and speakers
    window.participantMessages = window.participantMessages || {};
    window.currentUserId = window.currentUserId || null;
    window.lastSpeakerId = null; // Track last speaker for labeling
    
    socket.onopen = () => {
        console.log('WebSocket connection established with server');
    };
    
    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('Received WebSocket message:', message);
            
            if (message.type === 'speech' && message.data) {
                // Extract data safely with fallbacks
                const data = message.data;
                const speech = data.data || (typeof data === 'string' ? data : JSON.stringify(data));
                const timestamp = data.timestamp || Date.now() * 1000;
                const currentSpeaker = data.user_name || 'Unknown Speaker';
                const speakerId = data.user_id || currentSpeaker;
                
                // Skip empty messages
                if (!speech || speech.trim() === '') {
                    console.log('Skipping empty speech message');
                    return;
                }
                
                // Store the current message 
                if (!window.participantMessages[speakerId]) {
                    window.participantMessages[speakerId] = [];
                }
                
                // Is this a new speaker compared to the last message?
                const isNewSpeaker = window.lastSpeakerId !== speakerId;
                window.lastSpeakerId = speakerId;
                
                // Store message data
                const messageData = {
                    speech,
                    timestamp,
                    speakerName: currentSpeaker,
                    speakerId,
                    isNewSpeaker,
                    isMuted: window.mutedParticipants && window.mutedParticipants.has(speakerId)
                };
                
                // Add to message history
                window.participantMessages[speakerId].push(messageData);
                
                // If this is from you (first message from you identifies your ID)
                if (!window.currentUserId && currentSpeaker === 'Baaz Jhaj') {
                    console.log(`Identified current user as ${currentSpeaker} with ID ${speakerId}`);
                    window.currentUserId = speakerId;
                }
                
                // Skip your own messages and muted participants
                if ((window.currentUserId && speakerId === window.currentUserId) || 
                    (window.mutedParticipants && window.mutedParticipants.has(speakerId))) {
                    return;
                }
                
                // Hide the waiting message once we receive data
                if (waitingMessage) {
                    waitingMessage.style.display = 'none';
                }
                
                // Add only this new message to the display instead of refreshing everything
                createMinimalistTranslationElement(
                    speakerId, 
                    speech, 
                    timestamp, 
                    transcriptionList, 
                    currentSpeaker,
                    isNewSpeaker
                );
                
                // Scroll to the bottom
                const container = document.getElementById('transcription-container');
                if (container) container.scrollTop = container.scrollHeight;
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        waitingMessage.textContent = 'Error connecting to transcription service.';
    };
    
    socket.onclose = () => {
        console.log('WebSocket connection closed');
        // Attempt to reconnect after a brief delay
        setTimeout(initializeWebSocket, 3000);
    };
    
    // Clean up the WebSocket connection when the page is unloaded
    window.addEventListener('beforeunload', () => {
        if (rtmsStarted) {
            // Try to stop RTMS if it's running
            zoomSdk.callZoomApi('stopRTMS').catch(console.error);
        }
        
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close();
        }
    });
}

// Function to create a minimalist translation element with speaker indication when needed
function createMinimalistTranslationElement(speakerId, speech, timestamp, container, speakerName, isNewSpeaker) {
    // Create a translation ID for this message
    const translationId = `trans-${timestamp}-${speakerId}`;
    
    // Create a new minimalist translation item
    const translationItem = document.createElement('div');
    translationItem.className = 'minimalist-translation translating';
    translationItem.id = translationId;
    translationItem.setAttribute('data-speaker-id', speakerId);
    
    // If it's a new speaker, add the speaker's name
    if (isNewSpeaker) {
        const speakerLabel = document.createElement('div');
        speakerLabel.className = 'speaker-label';
        speakerLabel.textContent = speakerName + ':';
        container.appendChild(speakerLabel);
    }
    
    // Add loading indicator
    translationItem.innerHTML = `<em>Translating...</em>`;
    
    // Add the item to the container
    container.appendChild(translationItem);
    
    // Request translation
    translateText(speech, translationId);
}

// Function to request translation from the server
async function translateText(text, translationId) {
    try {
        // Get the currently selected language
        const targetLanguage = window.selectedLanguage || 'es';
        const languageFlag = window.selectedLanguageFlag || '🇪🇸';
        
        // Make API request
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text,
                targetLanguage // Add target language to request
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Translation request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update the translation in the UI
        const translationElement = document.getElementById(translationId);
        if (translationElement) {
            // Remove the translating class that shows the loading state
            translationElement.classList.remove('translating');
            
            // Add the translated text
            translationElement.textContent = data.translated;
        }
    } catch (error) {
        console.error('Error translating text:', error);
        
        // Show error in the UI
        const translationElement = document.getElementById(translationId);
        if (translationElement) {
            translationElement.classList.remove('translating');
            translationElement.innerHTML = `<em>Translation failed</em>`;
        }
    }
}

// Function to mute/unmute a specific participant
async function toggleParticipantMute(participantId, isMuted) {
    try {
        if (!participantId) return;
        
        console.log(`Attempting to ${isMuted ? 'unmute' : 'mute'} participant: ${participantId}`);
        
        // Create a map to track muted participants locally
        if (!window.mutedParticipants) {
            window.mutedParticipants = new Set();
        }
        
        if (isMuted) {
            // Unmute participant
            window.mutedParticipants.delete(participantId);
            console.log(`Unmuted participant ${participantId} locally`);
        } else {
            // Mute participant
            window.mutedParticipants.add(participantId);
            console.log(`Muted participant ${participantId} locally`);
        }
        
        // Update UI for all messages from this participant
        const participantMessages = document.querySelectorAll(`[data-speaker-id="${participantId}"]`);
        participantMessages.forEach(msg => {
            const muteButton = msg.querySelector('.mute-button');
            if (muteButton) {
                muteButton.textContent = isMuted ? '🔊' : '🔇';
                muteButton.classList.toggle('muted', !isMuted);
                muteButton.setAttribute('aria-label', isMuted ? 'Mute this speaker' : 'Unmute this speaker');
                muteButton.setAttribute('data-muted', !isMuted);
            }
        });
        
        return !isMuted; // Return new mute state
    } catch (error) {
        console.error('Error toggling participant mute:', error);
        return isMuted; // Return original state if error
    }
}

// Function to display muted messages (with visual distinction)
function displayMutedMessage(speakerId, speakerName, speech, timestamp) {
    const transcriptionList = document.getElementById('transcription-list');
    if (!transcriptionList) return;
    
    // Create a new transcription item with muted styling
    const transcriptionItem = document.createElement('div');
    transcriptionItem.className = 'transcription-item muted-message';
    
    // Add speaker ID as a data attribute for CSS styling
    if (speakerId) {
        transcriptionItem.setAttribute('data-speaker-id', speakerId);
    }
    
    // Get last message info for this speaker
    const speakerTracker = window.speakerTracker || new Map();
    const lastSpeakerInfo = speakerTracker.get(speakerId) || {
        timestamp: 0,
        name: speakerName
    };
    
    // Calculate time since last message in seconds
    const timeSinceLastMessage = (timestamp - lastSpeakerInfo.timestamp) / 1000000; // Convert microseconds to seconds
    
    // Determine if we should show the speaker name
    const showSpeakerName = 
        timeSinceLastMessage > 5 || // More than 5 seconds since last message from this speaker
        !lastSpeakerInfo.timestamp; // First message from this speaker
    
    if (showSpeakerName) {
        transcriptionItem.classList.add('new-speaker');
    }
    
    // Format timestamp for display
    const date = new Date(timestamp / 1000); // Convert microseconds to milliseconds
    const formattedTime = date.toLocaleTimeString();
    
    // Create the HTML content with muted indicator
    let itemContent = '';
    
    if (showSpeakerName) {
        itemContent += `<div class="user-info">
            ${speakerName}
            <button class="mute-button muted" 
                aria-label="Unmute this speaker"
                data-speaker-id="${speakerId}" 
                data-muted="true">
                🔇
            </button>
            <span class="muted-indicator">(muted)</span>
        </div>`;
    }
    
    // Add original text (grayed out)
    itemContent += `<div class="speech-text original muted-text">${speech}</div>`;
    
    // Add timestamp
    itemContent += `<div class="message-time">${formattedTime}</div>`;
    
    transcriptionItem.innerHTML = itemContent;
    
    // Add the item to the transcription list
    transcriptionList.appendChild(transcriptionItem);
    
    // Add event listener for mute button
    const muteButton = transcriptionItem.querySelector('.mute-button');
    if (muteButton) {
        muteButton.addEventListener('click', function(e) {
            const speakerId = this.getAttribute('data-speaker-id');
            const isMuted = this.getAttribute('data-muted') === 'true';
            toggleParticipantMute(speakerId, isMuted);
            e.stopPropagation();
        });
    }
    
    // Update tracking for this speaker
    speakerTracker.set(speakerId, {
        timestamp: timestamp,
        name: speakerName
    });
    window.speakerTracker = speakerTracker;
    
    // Scroll to the bottom
    const container = document.getElementById('transcription-container');
    if (container) container.scrollTop = container.scrollHeight;
}
