document.addEventListener('DOMContentLoaded', function () {
    const llmSelect = document.getElementById('llmSelect');

    async function fetchModels() {
        try {
            const response = await fetch('http://localhost:1234/api/v0/models');
            if (!response.ok) {
                throw new Error(`error HTTP: ${response.status}`);
            }
            const data = await response.json();
            populateSelect(data.data);
        } catch (error) {
            console.error('error getting models:', error);
        }
    }

    function populateSelect(models) {
        llmSelect.innerHTML = '';

        const llmModels = models.filter(model => model.type === 'llm');

        if (llmModels.length > 0) {
            llmModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.text = `${model.id} (${model.state})`;
                llmSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.text = 'LLM doesnt find';
            llmSelect.appendChild(option);
        }
    }

    fetchModels();
});