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
