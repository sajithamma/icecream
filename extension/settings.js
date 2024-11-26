document.addEventListener("DOMContentLoaded", () => {
    // Preset instructions for dropdown
    const instructionsMap = {
        basic: "Analyse the full page of the website and get me information on what it says.",
        quiz: "Please read each question carefully and provide the most accurate answer. For multiple-choice questions, identify the correct choice. If choices aren’t numbered (e.g., 1, 2, 3 or A, B, C), assign numbers to each option from left to right, and indicate the answer by referencing the option number. For written responses, provide a clear and concise answer to input. In cases where there are multiple questions, answer each one in sequence, labeling them by question number or a unique portion of the question text. If a question appears incomplete or cut off, disregard it and answer only those that are fully visible. Additionally, some questions may contain images; examine these closely and respond accurately based on what is displayed.",
        linkedin: "Read the profile and draft a marketing message I can send.",
        custom: "" // Custom leaves the text area empty
    };

    const presetInstructions = document.getElementById("presetInstructions");
    const instructionsTextarea = document.getElementById("instructions");
    const saveButton = document.getElementById("saveButton");
    const authSection = document.getElementById("authSection"); // Placeholder for login/logout buttons

    // Load saved settings
    chrome.storage.local.get(["defaultQuestion", "captureMode", "selectedPreset", "userEmail"], (result) => {
        // Handle default instructions
        if (result.defaultQuestion) {
            instructionsTextarea.value = result.defaultQuestion;
        }
        if (result.captureMode) {
            document.querySelector(`input[name="captureMode"][value="${result.captureMode}"]`).checked = true;
        }
        if (result.selectedPreset) {
            presetInstructions.value = result.selectedPreset;
            instructionsTextarea.value = instructionsMap[result.selectedPreset];
        }

        // Display appropriate auth button
        if (result.userEmail) {
            authSection.innerHTML = `
                <p style="color: green; font-size: 14px;">Logged in as ${result.userEmail}</p>
                <a id="logoutText" style="color: #0078d7; font-size: 14px; cursor: pointer; text-decoration: none; font-weight: bold;">Logout</a>
            `;

            // Attach logout text link event listener
            document.getElementById("logoutText").addEventListener("click", () => {
                if (confirm("Are you sure you want to log out?")) {
                    chrome.storage.local.remove("userEmail", () => {
                        alert("You have been logged out. Please log in again to use the plugin.");
                        window.location.reload(); // Reload the page after logout
                    });
                }
            });
        }
        else {
            authSection.innerHTML = `
                <p style="color: red; font-size: 14px;">Not logged in. Please log in to use the plugin.</p>
                <button id="loginButton" style="background-color: #1a73e8; color: white; margin-top: 15px;">Login</button>
            `;

            // Attach login button event listener
            document.getElementById("loginButton").addEventListener("click", () => {
                chrome.identity.getAuthToken({ interactive: true }, (token) => {
                    if (chrome.runtime.lastError || !token) {
                        alert("Failed to log in with Google. Please try again.");
                        console.error("Google Login Error:", chrome.runtime.lastError);
                        return;
                    }

                    // Fetch user info using the token
                    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                        .then((response) => response.json())
                        .then((user) => {
                            if (user.email) {
                                console.log("Google User:", user);
                                chrome.storage.local.set({ userEmail: user.email }, () => {
                                    alert(`Logged in as ${user.email}`);
                                    window.location.reload(); // Reload the page after login
                                });
                            } else {
                                alert("Failed to fetch user information.");
                            }
                        })
                        .catch((error) => {
                            console.error("Error fetching user info:", error);
                            alert("An error occurred. Please try again.");
                        });
                });
            });
        }
    });

    // Update instructions text area based on selected preset
    presetInstructions.addEventListener("change", () => {
        const selectedValue = presetInstructions.value;
        instructionsTextarea.value = instructionsMap[selectedValue];
    });

    // Save settings
    saveButton.addEventListener("click", () => {
        const question = instructionsTextarea.value;
        const captureMode = document.querySelector('input[name="captureMode"]:checked').value;
        const selectedPreset = presetInstructions.value;

        chrome.storage.local.set({
            defaultQuestion: question,
            captureMode: captureMode,
            selectedPreset: selectedPreset
        }, () => {
            alert("Settings saved!");
        });
    });
});
