
window.addEventListener('load', function () {
    document.body.classList.remove('loading');
    var loader = document.getElementById('loader');
    loader.style.display = 'none';
});



async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (userInput.trim() === '') return;

    const chatLog = document.getElementById('chat-log');
    const userMessage = document.createElement('div');
    userMessage.textContent = `You: ${userInput}`;
    chatLog.appendChild(userMessage);

    const responseMessage = document.createElement('div');
    responseMessage.textContent = 'AI: Thinking...';
    chatLog.appendChild(responseMessage);

    try {
        const response = await fetch('https://api.openai.com/v1/engines/davinci-codex/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-proj-insertkey'
            },
            body: JSON.stringify({
                prompt: userInput,
                max_tokens: 150
            })
        });

        const data = await response.json();

        if (response.ok) {
            responseMessage.textContent = `AI: ${data.choices[0].text}`;
        } else {
            responseMessage.textContent = `AI: Error, could not fetch response.`;
        }
    } catch (error) {
        responseMessage.textContent = `AI: Error, ${error.message}`;
    }

    document.getElementById('user-input').value = '';
    chatLog.scrollTop = chatLog.scrollHeight;
}

async function fetchPlaylist() {
    const response = await fetch('https://api.spotify.com/v1/playlists/198205 1980/tracks', {
        headers: {
            'Authorization': 'Bearer YOUR_SPOTIFY_API_KEY'
        }
    });
    const data = await response.json();
    const playlistContainer = document.getElementById('playlist-container');
    data.items.forEach(item => {
        const track = document.createElement('div');
        track.className = 'track';
        track.innerHTML = `
            <img src="${item.track.album.images[0].url}" alt="Album Art">
            <div class="track-info">
                <strong>${item.track.name}</strong><br>
                ${item.track.artists.map(artist => artist.name).join(', ')}
            </div>
        `;
        playlistContainer.appendChild(track);
    });
}

async function getWeather() {
    const city = document.getElementById('city-input').value;
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=21b6a70572599fbe507792676b064cff&units=metric`);
    const data = await response.json();
    const weatherResult = document.getElementById('weather-result');
    if (response.ok) {
        weatherResult.innerHTML = `
            <h3>${data.name}</h3>
            <p>${data.weather[0].description}</p>
            <p>Temperature: ${data.main.temp} °C</p>
        `;
    } else {
        weatherResult.innerHTML = `<p>Error: ${data.message}</p>`;
    }
}

window.addEventListener('load', function () {
    document.body.classList.remove('loading');
    var loader = document.getElementById('loader');
    loader.style.display = 'none';

    // Password Strength Checker and Show/Hide Password
    const passwordField = document.getElementById('password-field');
    const strengthText = document.getElementById('strength-text');
    const strengthBar = document.getElementById('strength-bar');
    const togglePasswordBtn = document.getElementById('toggle-password-btn');

    // Event Listener for password input
    passwordField.addEventListener('input', function () {
        let strength = 0;

        if (this.value.length >= 8) strength++; // Minimum length
        if (/[A-Z]/.test(this.value)) strength++; // At least one uppercase
        if (/[a-z]/.test(this.value)) strength++; // At least one lowercase
        if (/[0-9]/.test(this.value)) strength++; // At least one number
        if (/[@$!%*?&#]/.test(this.value)) strength++; // At least one special character

        // Update strength text and bar
        switch (strength) {
            case 0:
            case 1:
                strengthText.textContent = 'Weak';
                strengthBar.style.backgroundColor = 'red';
                strengthBar.style.width = '20%';
                break;
            case 2:
                strengthText.textContent = 'Moderate';
                strengthBar.style.backgroundColor = 'orange';
                strengthBar.style.width = '40%';
                break;
            case 3:
                strengthText.textContent = 'Good';
                strengthBar.style.backgroundColor = 'yellow';
                strengthBar.style.width = '60%';
                break;
            case 4:
                strengthText.textContent = 'Strong';
                strengthBar.style.backgroundColor = 'blue';
                strengthBar.style.width = '80%';
                break;
            case 5:
                strengthText.textContent = 'Very Strong';
                strengthBar.style.backgroundColor = 'green';
                strengthBar.style.width = '100%';
                break;
        }
    });

    // Toggle password visibility
    togglePasswordBtn.addEventListener('click', function () {
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            this.textContent = 'Hide Password';
        } else {
            passwordField.type = 'password';
            this.textContent = 'Show Password';
        }
    });
});


function validateInput() {
    const userInput = document.getElementById("inputValidationExample").value;
    const sanitizedInput = userInput.replace(/[&<>"'/]/g, function(char) {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            case '/': return '&#x2F;';
            default: return char;
        }
    });
    const output = document.getElementById("validationOutput");
    output.textContent = "Sanitized Input: " + sanitizedInput;
}

function hashPassword() {
    const password = document.getElementById("passwordExample").value;
    const hashedPassword = CryptoJS.SHA256(password).toString();
    const output = document.getElementById("hashOutput");
    output.textContent = "Hashed Password: " + hashedPassword;
}

window.addEventListener('load', function() {
    document.body.classList.remove('loading');
    var loader = document.getElementById('loader');
    loader.style.display = 'none';
});

