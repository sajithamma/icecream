document.getElementById("saveButton").addEventListener("click", () => {
    const question = document.getElementById("question").value;
    const captureMode = document.querySelector('input[name="captureMode"]:checked').value;

    chrome.storage.local.set({ defaultQuestion: question, captureMode: captureMode }, () => {
        alert("Settings saved!");
    });
});

// Load saved settings
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(["defaultQuestion", "captureMode"], (result) => {
        if (result.defaultQuestion) {
            document.getElementById("question").value = result.defaultQuestion;
        }
        if (result.captureMode) {
            document.querySelector(`input[name="captureMode"][value="${result.captureMode}"]`).checked = true;
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    // Preset instructions for dropdown
    const instructionsMap = {
        basic: "Analyse the full page of the website and get me information on what it says.",
        quiz: "Read the question and help me to answer it.",
        linkedin: "Read the profile and draft a marketing message I can send.",
        custom: "" // Custom leaves the text area empty
    };

    // Populate the instructions text area based on the selected preset
    const presetInstructions = document.getElementById("presetInstructions");
    const instructionsTextarea = document.getElementById("instructions");

    if (presetInstructions && instructionsTextarea) {
        presetInstructions.addEventListener("change", () => {
            const selectedValue = presetInstructions.value;
            instructionsTextarea.value = instructionsMap[selectedValue];
        });

        // Initialize with the default preset
        instructionsTextarea.value = instructionsMap[presetInstructions.value];
    } else {
        console.error("Unable to find preset instructions or instructions textarea.");
    }
});

