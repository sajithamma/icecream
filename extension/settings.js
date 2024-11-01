document.addEventListener("DOMContentLoaded", () => {
    // Preset instructions for dropdown
    const instructionsMap = {
        basic: "Analyse the full page of the website and get me information on what it says.",
        quiz: "Read the question and help me to answer it.",
        linkedin: "Read the profile and draft a marketing message I can send.",
        custom: "" // Custom leaves the text area empty
    };

    // DOM elements
    const presetInstructions = document.getElementById("presetInstructions");
    const instructionsTextarea = document.getElementById("instructions");
    const saveButton = document.getElementById("saveButton");
    const notificationBar = document.getElementById("notificationBar");

    // Load saved settings
    chrome.storage.local.get(["defaultQuestion", "captureMode", "selectedPreset"], (result) => {
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
    });

    // Update instructions text area based on selected preset
    if (presetInstructions && instructionsTextarea) {
        presetInstructions.addEventListener("change", () => {
            const selectedValue = presetInstructions.value;
            instructionsTextarea.value = instructionsMap[selectedValue];
        });
    } else {
        console.error("Unable to find preset instructions or instructions textarea.");
    }

    // Show notification
    function showNotification(message) {
        notificationBar.textContent = message;
        notificationBar.style.display = "block";
        setTimeout(() => {
            notificationBar.style.opacity = 0;
            setTimeout(() => {
                notificationBar.style.display = "none";
                notificationBar.style.opacity = 1;
            }, 500);
        }, 2000); // Display for 2 seconds before fading out
    }

    // Save settings when Save button is clicked
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            const question = instructionsTextarea.value;
            const captureMode = document.querySelector('input[name="captureMode"]:checked').value;
            const selectedPreset = presetInstructions.value;

            chrome.storage.local.set({
                defaultQuestion: question,
                captureMode: captureMode,
                selectedPreset: selectedPreset
            }, () => {
                showNotification("Settings saved!");
            });
        });
    }
});
