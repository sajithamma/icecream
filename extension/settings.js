document.addEventListener("DOMContentLoaded", () => {
    const questionInput = document.getElementById("question");
    const saveButton = document.getElementById("saveButton");

    // Load the saved question when settings page is opened
    chrome.storage.local.get(["defaultQuestion"], (result) => {
        if (result.defaultQuestion) {
            questionInput.value = result.defaultQuestion;
        }
    });

    // Save the question to Chrome storage when clicking save
    saveButton.addEventListener("click", () => {
        const defaultQuestion = questionInput.value || "Tell me about this image";
        chrome.storage.local.set({ defaultQuestion }, () => {
            alert("Question saved successfully!");
        });
    });
});
