document.addEventListener("DOMContentLoaded", () => {
    const instructionsMap = {
        basic: "Analyse the full page of the website and get me information on what it says.",
        quiz: "Please read each question carefully and provide the most accurate answer. For multiple-choice questions, identify the correct choice. If choices aren’t numbered (e.g., 1, 2, 3 or A, B, C), assign numbers to each option from left to right, and indicate the answer by referencing the option number. For written responses, provide a clear and concise answer to input. In cases where there are multiple questions, answer each one in sequence, labeling them by question number or a unique portion of the question text. If a question appears incomplete or cut off, disregard it and answer only those that are fully visible. Additionally, some questions may contain images; examine these closely and respond accurately based on what is displayed.",
        linkedin: "Read the profile and draft a marketing message I can send.",
        custom: "" // Custom leaves the text area empty initially
    };

    const presetInstructions = document.getElementById("presetInstructions");
    const instructionsTextarea = document.getElementById("instructions");
    const instructionsLabel = document.getElementById("instructionsLabel");
    const saveButton = document.getElementById("saveButton");
    const authSection = document.getElementById("authSection");

    const updateLabel = (selectedPreset) => {
        const labelText = selectedPreset === "custom" ? "Prompt your custom instructions" : `${selectedPreset.charAt(0).toUpperCase() + selectedPreset.slice(1)} Instruction`;
        instructionsLabel.textContent = labelText;
    };

    const loadCustomMessage = (callback) => {
        chrome.storage.local.get("customMessage", (result) => {
            callback(result.customMessage || "");
        });
    };

    chrome.storage.local.get(["defaultQuestion", "captureMode", "selectedPreset", "customMessage", "userEmail"], (result) => {
        const selectedPreset = result.selectedPreset || "basic";
        presetInstructions.value = selectedPreset;

        if (selectedPreset === "custom") {
            instructionsTextarea.disabled = false;
            instructionsTextarea.value = result.customMessage || "";
        } else {
            instructionsTextarea.disabled = true;
            instructionsTextarea.value = instructionsMap[selectedPreset];
        }

        updateLabel(selectedPreset);

        const captureMode = result.captureMode || "viewport";
        document.querySelector(`input[name="captureMode"][value="${captureMode}"]`).checked = true;

        if (result.userEmail) {
            authSection.innerHTML = `
                <p style="color: green; font-size: 14px;">Logged in as ${result.userEmail}</p>
                <a id="logoutText" style="color: #0078d7; font-size: 14px; cursor: pointer; text-decoration: none; font-weight: bold;">Logout</a>
            `;

            document.getElementById("logoutText").addEventListener("click", () => {
                if (confirm("Are you sure you want to log out?")) {
                    chrome.storage.local.remove("userEmail", () => {
                        alert("You have been logged out. Please log in again to use the plugin.");
                        window.location.reload();
                    });
                }
            });
        } else {
            authSection.innerHTML = `
                <p style="color: red; font-size: 14px;">Not logged in. Please log in to use the plugin.</p>
                <button id="loginButton" style="background-color: #1a73e8; color: white; margin-top: 15px;">Login</button>
            `;

            document.getElementById("loginButton").addEventListener("click", () => {
                chrome.identity.getAuthToken({ interactive: true }, (token) => {
                    if (chrome.runtime.lastError || !token) {
                        alert("Failed to log in with Google. Please try again.");
                        console.error("Google Login Error:", chrome.runtime.lastError);
                        return;
                    }

                    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                        .then((response) => response.json())
                        .then((user) => {
                            if (user.email) {
                                chrome.storage.local.set({ userEmail: user.email }, () => {
                                    alert(`Logged in as ${user.email}`);
                                    window.location.reload();
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

    presetInstructions.addEventListener("change", () => {
        const selectedValue = presetInstructions.value;

        if (selectedValue === "custom") {
            loadCustomMessage((customMessage) => {
                instructionsTextarea.value = customMessage;
            });
        } else {
            instructionsTextarea.value = instructionsMap[selectedValue];
        }

        instructionsTextarea.disabled = selectedValue !== "custom";
        updateLabel(selectedValue);
    });

    saveButton.addEventListener("click", () => {
        const question = instructionsTextarea.value;
        const captureMode = document.querySelector('input[name="captureMode"]:checked').value;
        const selectedPreset = presetInstructions.value;

        if (selectedPreset === "custom" && !question.trim()) {
            showNotification("Content must not be empty when using the custom preset.", "error");
            return;
        }

        const storageData = {
            defaultQuestion: question,
            captureMode: captureMode,
            selectedPreset: selectedPreset
        };

        if (selectedPreset === "custom") {
            storageData.customMessage = question;
        }

        chrome.storage.local.set(storageData, () => {
            showNotification("Settings saved successfully!");
        });
    });


    function showNotification(message, type = "success") {
        const notificationBar = document.getElementById("notificationBar");
        notificationBar.textContent = message;

        // Adjust background color based on the type of message
        notificationBar.style.backgroundColor = type === "success" ? "#4CAF50" : "#f44336"; // Green for success, Red for error

        // Show the notification
        notificationBar.style.display = "block";

        // Automatically hide the notification after 3 seconds
        setTimeout(() => {
            notificationBar.style.opacity = "1";
            notificationBar.style.transition = "opacity 0.5s ease";
            notificationBar.style.opacity = "0";
            setTimeout(() => {
                notificationBar.style.display = "none";
                notificationBar.style.opacity = "1"; // Reset opacity for next use
            }, 500); // Match the fade-out duration
        }, 3000); // Show for 3 seconds
    }


});
