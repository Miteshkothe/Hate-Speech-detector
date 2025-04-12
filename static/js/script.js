const textInput = document.getElementById('textInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const recordBtn = document.getElementById('recordBtn');
const resultSection = document.getElementById('resultSection');
const resultText = document.getElementById('resultText');
const transcriptionSection = document.getElementById('transcriptionSection');
const transcriptionText = document.createElement('div');
transcriptionText.className = 'transcription-box';
transcriptionSection.appendChild(transcriptionText);
const loader = document.getElementById('loader');
const errorMsg = document.getElementById('errorMsg');
const emojiSection = document.getElementById('emojiSection');
const body = document.body;

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Handle text analysis
analyzeBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
        showError('Please enter text to analyze');
        return;
    }

    resetUI();
    analyzeBtn.disabled = true;
    loader.style.display = 'block';

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }

        displayResults(data);
    } catch (error) {
        showError(error.message || 'An error occurred while analyzing the text');
    } finally {
        analyzeBtn.disabled = false;
        loader.style.display = 'none';
    }
});

// Handle audio recording
recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Try to use WAV if supported, fallback to WebM
            const mimeType = MediaRecorder.isTypeSupported('audio/wav') ? 'audio/wav' : 'audio/webm';
            mediaRecorder = new MediaRecorder(stream, { mimeType });
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const extension = mimeType === 'audio/wav' ? 'wav' : 'webm';
                const audioBlob = new Blob(audioChunks, { type: mimeType });
                const formData = new FormData();
                formData.append('audio', audioBlob, `recording.${extension}`);

                resetUI();
                recordBtn.disabled = true;
                loader.style.display = 'block';

                try {
                    const response = await fetch('/transcribe_mic', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Transcription failed');
                    }

                    // Update textarea with transcription
                    textInput.value = data.transcription || '';
                    transcriptionText.textContent = data.transcription ? `Transcribed: ${data.transcription}` : 'No transcription available';
                    transcriptionSection.classList.add('show');

                    // Display analysis
                    displayResults(data);
                } catch (error) {
                    showError(error.message || 'An error occurred while processing the audio');
                } finally {
                    recordBtn.disabled = false;
                    loader.style.display = 'none';
                }

                // Clean up stream
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            recordBtn.textContent = '⏹️ Stop';
            recordBtn.classList.add('recording');
        } catch (error) {
            showError('Failed to access microphone. Please allow microphone access.');
            console.error('Microphone error:', error);
        }
    } else {
        // Stop recording
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.textContent = '🎙️ Record';
        recordBtn.classList.remove('recording');
    }
});

function displayResults(data) {
    resultText.textContent = data.analysis || 'No analysis available';
    resultSection.classList.add('show');

    if (data.verdict === 'Yes') {
        body.classList.add('red');
        emojiSection.textContent = '😣😡';
    } else if (data.verdict === 'No') {
        body.classList.add('green');
        emojiSection.textContent = '😊✅';
    } else {
        emojiSection.textContent = '🤔';
    }
}

function resetUI() {
    hideError();
    resultSection.classList.remove('show');
    transcriptionSection.classList.remove('show');
    emojiSection.textContent = '';
    body.classList.remove('red', 'green');
}

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
}

function hideError() {
    errorMsg.style.display = 'none';
}