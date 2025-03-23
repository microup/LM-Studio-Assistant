document.addEventListener('DOMContentLoaded', function () {
    const MAX_LEN_PAGE_CONTENT = 8000;
    let currentLang = "English";

    // Theme management
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        themeToggle.textContent = theme === 'light' ? '🌓' : '☀️';
    }

    // Predefined prompts for different actions
    const PROMPTS = {
        default: (lang) => `Generate a response only in ${lang}. Analyze the highlighted text, extract the most important points, and create an analytical summary in the form of a prioritized list. If you are analyzing source code, specify its purpose and usage. At the very beginning, provide a detailed conclusion with an analysis of the content. Responses should be only in ${lang}.`,
        translate: (lang) => `Translate the highlighted text into ${lang}. Preserve the original formatting and structure. Do not add any additional comments.`,
        code_review: (lang) => `Generate a response only in ${lang}. Review the code, point out possible errors, suggest optimizations or improvements, and check for adherence to coding style. Responses should be only in ${lang}.`,
        simplify: (lang) => `Generate a response only in ${lang}. Simplify the text for better understanding. Make it more structured by breaking it into logical sections while preserving the key ideas. Responses should be only in ${lang}.`,
        correct: (lang) => `Generate a response only in ${lang}. Correct any errors in the text while maintaining writing style. Do not change the meaning or restructure sentences. The response should be in ${lang}.`
    };

    const LANG = {
        russian: 'Russian',
        english: 'English',
        spanish: 'Spanish',
        french: 'French',
        portuguese: 'Portuguese',
        chinese: 'Chinese'
    };

    const analyzeBtn = document.getElementById('analyze');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const promptSelect = document.getElementById('promptSelect');
    const llmSelect = document.getElementById('llmSelect');
    const langSelect = document.getElementById('langSelect');

    langSelect.addEventListener('change', function () {
        currentLang = LANG[this.value];
        console.log(`Language changed to: ${currentLang}`);
    });

    analyzeBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        analyzeBtn.disabled = true;
        loadingDiv.style.display = 'block';
        resultDiv.textContent = '';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error("No active tab found.");
            }

            const selectedModel = llmSelect.value;
            const promptType = promptSelect.value;
            currentLang = LANG[langSelect.value];

            const contentToSend = await getPageContent(tab.id);
            if (!contentToSend) {
                alert("No text found to analyze!");
                return;
            }

            const promptText = PROMPTS[promptType](currentLang);

            const response = await fetch('http://localhost:1234/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: "system", content: promptText },
                        { role: "user", content: contentToSend }
                    ],
                    temperature: contentToSend.length > 1000 ? 0.8 : 0.6,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }

            const data = await response.json();
            resultDiv.textContent = data.choices[0]?.message?.content || 'No response received from the API.';

        } catch (error) {
            console.error('Error during analysis:', error);
            resultDiv.textContent = `Error: ${error.message}`;
        } finally {
            analyzeBtn.disabled = false;
            loadingDiv.style.display = 'none';
        }
    });

    async function getPageContent(tabId) {
        try {
            const selection = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => window.getSelection().toString().trim()
            });

            if (selection[0]?.result) {
                return selection[0].result.substring(0, MAX_LEN_PAGE_CONTENT);
            }

            const pageContent = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => document.body.innerText.trim()
            });

            return pageContent[0]?.result?.substring(0, MAX_LEN_PAGE_CONTENT) || '';
        } catch (error) {
            console.error('Error extracting page content:', error);
            return '';
        }
    }
});