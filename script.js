// AI Universal Orchestrator

// Named constants
const MAX_FILE_SIZE_BYTES    = 512 * 1024; // 512 KB per attached file
const MAX_SEARCH_ITERATIONS  = 3;          // max web-search loops per task
const MAX_SEARCH_RESULTS     = 5;          // max search results to include

// Provider display labels (single source of truth)
const PROVIDER_LABELS = {
    openai:    'OpenAI',
    anthropic: 'Claude',
    google:    'Gemini',
    ollama:    'Ollama',
    custom:    'Custom'
};

// Provider configuration hints (single source of truth)
const PROVIDER_HINTS = {
    openai:    { key: 'OpenAI API key (starts with sk- or sk-proj-)', model: 'e.g. gpt-4o, gpt-4-turbo',              baseUrl: 'https://api.openai.com' },
    anthropic: { key: 'Anthropic API key (starts with sk-ant-)',      model: 'e.g. claude-3-5-sonnet-20241022',        baseUrl: 'https://api.anthropic.com' },
    google:    { key: 'Google AI Studio API key',                     model: 'e.g. gemini-1.5-pro, gemini-2.0-flash',  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
    ollama:    { key: 'Not required for local Ollama',                model: 'e.g. llama3.1, mistral',                  baseUrl: 'http://localhost:11434' },
    custom:    { key: 'API key (if required by your endpoint)',       model: 'Model name for your endpoint',            baseUrl: 'https://your-endpoint.example.com' }
};

class AIOrchestrator {
    constructor() {
        this.tasks = [];
        this.currentTaskIndex = 0;
        this.isRunning = false;
        this.executionMode = 'serial';
        this.enableCodeExecution = false;
        this.enableCanvas = false;
        this.enableWebSearch = false;
        this.abortController = null;
        this.currentSessionResults = [];
        this.attachedFiles = [];   // [{name, content, type}]
        this.attachedImage = null; // {dataUrl, name}

        this.initializeDOM();
        this.setupEventListeners();
        this.loadSettings();
        this.checkApiKey();
        this.restoreLastTask();
    }

    // DOM Initialization
    initializeDOM() {
        this.elements = {
            settingsModal: document.getElementById('settingsModal'),
            settingsModalClose: document.getElementById('settingsModalClose'),
            historyModal: document.getElementById('historyModal'),
            historyList: document.getElementById('historyList'),
            historyEmpty: document.getElementById('historyEmpty'),
            // Primary LLM
            providerSelect: document.getElementById('providerSelect'),
            apiKeyInput: document.getElementById('apiKeyInput'),
            apiKeyGroup: document.getElementById('apiKeyGroup'),
            apiKeyHint: document.getElementById('apiKeyHint'),
            baseUrlGroup: document.getElementById('baseUrlGroup'),
            baseUrlInput: document.getElementById('baseUrlInput'),
            modelInput: document.getElementById('modelInput'),
            modelHint: document.getElementById('modelHint'),
            // Secondary LLM
            providerSelect2: document.getElementById('providerSelect2'),
            apiKeyInput2: document.getElementById('apiKeyInput2'),
            apiKeyGroup2: document.getElementById('apiKeyGroup2'),
            apiKeyHint2: document.getElementById('apiKeyHint2'),
            baseUrlInput2: document.getElementById('baseUrlInput2'),
            modelInput2: document.getElementById('modelInput2'),
            modelHint2: document.getElementById('modelHint2'),
            // Search & Routing
            searchProvider: document.getElementById('searchProvider'),
            searchApiKey: document.getElementById('searchApiKey'),
            searchKeyGroup: document.getElementById('searchKeyGroup'),
            routingConfig: document.getElementById('routingConfig'),
            // Modal buttons
            saveApiKeyBtn: document.getElementById('saveApiKey'),
            cancelSettingsBtn: document.getElementById('cancelSettings'),
            configBtn: document.getElementById('configBtn'),
            historyBtn: document.getElementById('historyBtn'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            // Task Input
            taskInput: document.getElementById('taskInput'),
            systemPrompt: document.getElementById('systemPrompt'),
            orchestrateBtn: document.getElementById('orchestrateBtn'),
            stopBtn: document.getElementById('stopBtn'),
            exportBtn: document.getElementById('exportBtn'),
            clearBtn: document.getElementById('clearBtn'),
            // Attachments
            attachFileBtn: document.getElementById('attachFileBtn'),
            attachImageBtn: document.getElementById('attachImageBtn'),
            fileInput: document.getElementById('fileInput'),
            imageInput: document.getElementById('imageInput'),
            attachedFiles: document.getElementById('attachedFiles'),
            imagePreview: document.getElementById('imagePreview'),
            previewImg: document.getElementById('previewImg'),
            imageName: document.getElementById('imageName'),
            removeImageBtn: document.getElementById('removeImageBtn'),
            // Web search toggle
            enableWebSearchChk: document.getElementById('enableWebSearch'),
            // Panels
            taskBreakdown: document.getElementById('taskBreakdown'),
            taskCount: document.getElementById('taskCount'),
            executionResults: document.getElementById('executionResults'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            canvasContainer: document.getElementById('canvasContainer'),
            codeContainer: document.getElementById('codeContainer'),
            outputCanvas: document.getElementById('outputCanvas'),
            codeOutput: document.getElementById('codeOutput')
        };
    }

    // Event Listeners
    setupEventListeners() {
        this.elements.saveApiKeyBtn.addEventListener('click', () => this.saveSettings());
        this.elements.cancelSettingsBtn.addEventListener('click', () => this.hideSettingsModal());
        this.elements.settingsModalClose.addEventListener('click', () => this.hideSettingsModal());
        this.elements.configBtn.addEventListener('click', () => this.openSettings());
        this.elements.historyBtn.addEventListener('click', () => this.openHistory());
        this.elements.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.elements.orchestrateBtn.addEventListener('click', () => this.startOrchestration());
        this.elements.stopBtn.addEventListener('click', () => this.stopOrchestration());
        this.elements.exportBtn.addEventListener('click', () => this.exportResults());
        this.elements.clearBtn.addEventListener('click', () => this.clearResults());

        // Provider change updates UI hints
        this.elements.providerSelect.addEventListener('change', () => this.updateProviderUI());
        this.elements.providerSelect2.addEventListener('change', () => this.updateProviderUI2());

        // Search provider change
        this.elements.searchProvider.addEventListener('change', () => this.updateSearchProviderUI());

        // Execution mode radio buttons
        document.querySelectorAll('input[name="executionMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.executionMode = e.target.value;
            });
        });

        // Feature checkboxes
        document.getElementById('enableCodeExecution').addEventListener('change', (e) => {
            this.enableCodeExecution = e.target.checked;
            this.toggleCodeContainer();
        });

        document.getElementById('enableCanvas').addEventListener('change', (e) => {
            this.enableCanvas = e.target.checked;
            this.toggleCanvasContainer();
        });

        this.elements.enableWebSearchChk.addEventListener('change', (e) => {
            this.enableWebSearch = e.target.checked;
        });

        // File attachment
        this.elements.attachFileBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.attachImageBtn.addEventListener('click', () => this.elements.imageInput.click());

        this.elements.fileInput.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(f => this.handleFileUpload(f));
            e.target.value = '';
        });

        this.elements.imageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) this.handleImageUpload(e.target.files[0]);
            e.target.value = '';
        });

        this.elements.removeImageBtn.addEventListener('click', () => this.removeImage());

        // Auto-save task text on input (debounced to avoid excessive writes)
        let saveTaskTimer = null;
        this.elements.taskInput.addEventListener('input', () => {
            clearTimeout(saveTaskTimer);
            saveTaskTimer = setTimeout(() => {
                localStorage.setItem('last_task_input', this.elements.taskInput.value);
            }, 500);
        });

        // Ctrl+Enter keyboard shortcut to start orchestration
        this.elements.taskInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!this.isRunning) this.startOrchestration();
            }
        });
    }

    // Restore last task text from localStorage
    restoreLastTask() {
        const saved = localStorage.getItem('last_task_input');
        if (saved) this.elements.taskInput.value = saved;
    }

    // Settings Management
    loadSettings() {
        // Primary LLM
        const provider = localStorage.getItem('ai_provider') || 'openai';
        const apiKey = localStorage.getItem('openai_api_key') || '';
        const baseUrl = localStorage.getItem('ai_base_url') || '';
        const model = localStorage.getItem('ai_model') || '';

        this.elements.providerSelect.value = provider;
        this.elements.apiKeyInput.value = apiKey;
        this.elements.baseUrlInput.value = baseUrl;
        this.elements.modelInput.value = model;

        // Secondary LLM
        this.elements.providerSelect2.value = localStorage.getItem('ai_provider_2') || '';
        this.elements.apiKeyInput2.value = localStorage.getItem('ai_api_key_2') || '';
        this.elements.baseUrlInput2.value = localStorage.getItem('ai_base_url_2') || '';
        this.elements.modelInput2.value = localStorage.getItem('ai_model_2') || '';

        // Tools
        this.elements.searchProvider.value = localStorage.getItem('ai_search_provider') || 'none';
        this.elements.searchApiKey.value = localStorage.getItem('ai_search_key') || '';

        this.updateProviderUI();
        this.updateProviderUI2();
        this.updateSearchProviderUI();
        this.buildRoutingUI();
    }

    saveSettings() {
        // Primary LLM
        const provider = this.elements.providerSelect.value;
        const apiKey = this.elements.apiKeyInput.value.trim();
        const baseUrl = this.elements.baseUrlInput.value.trim();
        const model = this.elements.modelInput.value.trim();

        if (provider !== 'ollama' && !apiKey) {
            alert('Please enter an API key for the Primary LLM provider.');
            return;
        }

        localStorage.setItem('ai_provider', provider);
        localStorage.setItem('openai_api_key', apiKey);
        localStorage.setItem('ai_base_url', baseUrl);
        localStorage.setItem('ai_model', model);

        // Secondary LLM
        // Note: API keys are stored in localStorage by design — this app is purely
        // client-side and keys are never transmitted to any server other than the
        // chosen AI provider. Users are advised of this in Settings and the README.
        const provider2 = this.elements.providerSelect2.value;
        localStorage.setItem('ai_provider_2', provider2);
        localStorage.setItem('ai_api_key_2', this.elements.apiKeyInput2.value.trim());
        localStorage.setItem('ai_base_url_2', this.elements.baseUrlInput2.value.trim());
        localStorage.setItem('ai_model_2', this.elements.modelInput2.value.trim());

        // Tools
        localStorage.setItem('ai_search_provider', this.elements.searchProvider.value);
        // Search API key stored locally — same policy as LLM API keys above.
        localStorage.setItem('ai_search_key', this.elements.searchApiKey.value.trim());

        // Routing
        this.saveRoutingFromUI();

        this.hideSettingsModal();
    }

    getSettings() {
        return {
            provider: localStorage.getItem('ai_provider') || 'openai',
            apiKey: localStorage.getItem('openai_api_key') || '',
            baseUrl: localStorage.getItem('ai_base_url') || '',
            model: localStorage.getItem('ai_model') || ''
        };
    }

    // Return settings for 'primary' or 'secondary' profile
    getProfile(key) {
        if (key === 'secondary') {
            return {
                provider: localStorage.getItem('ai_provider_2') || '',
                apiKey: localStorage.getItem('ai_api_key_2') || '',
                baseUrl: localStorage.getItem('ai_base_url_2') || '',
                model: localStorage.getItem('ai_model_2') || ''
            };
        }
        return {
            provider: localStorage.getItem('ai_provider') || 'openai',
            apiKey: localStorage.getItem('openai_api_key') || '',
            baseUrl: localStorage.getItem('ai_base_url') || '',
            model: localStorage.getItem('ai_model') || ''
        };
    }

    isProfileConfigured(key) {
        const p = this.getProfile(key);
        if (!p.provider) return false;
        if (p.provider !== 'ollama' && !p.apiKey) return false;
        return true;
    }

    getRouting() {
        try {
            return JSON.parse(localStorage.getItem('ai_routing') || '{}');
        } catch {
            return {};
        }
    }

    getProfileForTask(task) {
        if (!this.isProfileConfigured('secondary')) return 'primary';
        const routing = this.getRouting();
        return routing[task.type] === 'secondary' ? 'secondary' : 'primary';
    }

    // Build Task Routing UI inside the routingTab
    buildRoutingUI() {
        const container = this.elements.routingConfig;
        if (!container) return;
        container.innerHTML = '';
        const taskTypes = ['research', 'analysis', 'creation', 'execution', 'review'];
        const routing = this.getRouting();
        const secondaryConfigured = this.isProfileConfigured('secondary');

        if (!secondaryConfigured) {
            const note = document.createElement('p');
            note.className = 'text-muted small';
            note.textContent = 'Configure a Secondary LLM first to enable task routing.';
            container.appendChild(note);
            return;
        }

        taskTypes.forEach(type => {
            const row = document.createElement('div');
            row.className = 'row align-items-center mb-2';

            const labelCol = document.createElement('div');
            labelCol.className = 'col-5 text-capitalize';
            labelCol.textContent = type;

            const selectCol = document.createElement('div');
            selectCol.className = 'col-7';

            const select = document.createElement('select');
            select.className = 'form-select form-select-sm';
            select.dataset.taskType = type;

            ['primary', 'secondary'].forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt === 'primary' ? 'Primary LLM' : 'Secondary LLM';
                if ((routing[type] || 'primary') === opt) o.selected = true;
                select.appendChild(o);
            });

            selectCol.appendChild(select);
            row.appendChild(labelCol);
            row.appendChild(selectCol);
            container.appendChild(row);
        });
    }

    saveRoutingFromUI() {
        const selects = this.elements.routingConfig.querySelectorAll('select[data-task-type]');
        const routing = {};
        selects.forEach(sel => { routing[sel.dataset.taskType] = sel.value; });
        localStorage.setItem('ai_routing', JSON.stringify(routing));
    }

    checkApiKey() {
        const settings = this.getSettings();
        if (!settings.apiKey && settings.provider !== 'ollama') {
            this.showSettingsModal();
        }
    }

    showSettingsModal() {
        this.loadSettings();
        const existing = bootstrap.Modal.getInstance(this.elements.settingsModal);
        if (existing) {
            existing.show();
        } else {
            new bootstrap.Modal(this.elements.settingsModal).show();
        }
    }

    hideSettingsModal() {
        const modal = bootstrap.Modal.getInstance(this.elements.settingsModal);
        if (modal) modal.hide();
    }

    openSettings() {
        this.loadSettings();
        this.showSettingsModal();
    }

    updateProviderUI() {
        const provider = this.elements.providerSelect.value;
        const info = PROVIDER_HINTS[provider] || PROVIDER_HINTS.openai;
        this.elements.apiKeyHint.textContent = info.key;
        this.elements.modelHint.textContent = `Leave blank for default. ${info.model}`;
        this.elements.baseUrlInput.placeholder = info.baseUrl;

        const needsKey = provider !== 'ollama';
        this.elements.apiKeyGroup.classList.toggle('d-none', !needsKey);
    }

    updateProviderUI2() {
        const provider = this.elements.providerSelect2.value;
        const info = PROVIDER_HINTS[provider] || {};
        if (this.elements.apiKeyHint2) this.elements.apiKeyHint2.textContent = info.key || '';
        if (this.elements.modelHint2)  this.elements.modelHint2.textContent  = info.model ? `Leave blank for default. ${info.model}` : '';

        const needsKey = provider && provider !== 'ollama';
        if (this.elements.apiKeyGroup2) this.elements.apiKeyGroup2.classList.toggle('d-none', !needsKey);
    }

    updateSearchProviderUI() {
        const provider = this.elements.searchProvider.value;
        const needsKey = provider === 'brave';
        this.elements.searchKeyGroup.classList.toggle('d-none', !needsKey);
    }

    // UI Toggle Functions
    toggleCodeContainer() {
        this.elements.codeContainer.classList.toggle('d-none', !this.enableCodeExecution);
    }

    toggleCanvasContainer() {
        this.elements.canvasContainer.classList.toggle('d-none', !this.enableCanvas);
    }

    // XSS-safe HTML escaping
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    // AI API Communication dispatcher
    async callAI(messages, temperature = 0.7, profileKey = 'primary', imageData = null) {
        let profile = this.getProfile(profileKey);

        // Fall back to primary if secondary is not configured
        if (profileKey === 'secondary' && !this.isProfileConfigured('secondary')) {
            profile = this.getProfile('primary');
            profileKey = 'primary';
        }

        const signal = this.abortController ? this.abortController.signal : undefined;

        switch (profile.provider) {
            case 'anthropic':
                return this.callAnthropic(messages, temperature, profile, signal, imageData);
            case 'ollama':
            case 'custom':
            case 'google':
                return this.callOpenAICompat(messages, temperature, profile, signal, imageData);
            default:
                return this.callOpenAI(messages, temperature, profile, signal, imageData);
        }
    }

    async callOpenAI(messages, temperature, settings, signal, imageData = null) {
        if (!settings.apiKey) throw new Error('No API key configured. Click Settings to add one.');

        const model = settings.model || 'gpt-4o';
        const baseUrl = (settings.baseUrl || 'https://api.openai.com').replace(/\/$/, '');

        // Inject image into last user message if provided
        const msgs = imageData ? this._injectImageOpenAI(messages, imageData) : messages;

        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, messages: msgs, temperature, max_tokens: 4096 }),
            signal
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callAnthropic(messages, temperature, settings, signal, imageData = null) {
        if (!settings.apiKey) throw new Error('No API key configured. Click Settings to add one.');

        const model = settings.model || 'claude-3-5-sonnet-20241022';
        const baseUrl = (settings.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');

        const systemMsg = messages.find(m => m.role === 'system');
        let chatMessages = messages.filter(m => m.role !== 'system');

        // Inject image into last user message if provided
        if (imageData) chatMessages = this._injectImageAnthropic(chatMessages, imageData);

        const body = { model, max_tokens: 4096, messages: chatMessages, temperature };
        if (systemMsg) body.system = systemMsg.content;

        const response = await fetch(`${baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'x-api-key': settings.apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Anthropic API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    async callOpenAICompat(messages, temperature, settings, signal, imageData = null) {
        const defaultBaseUrl = settings.provider === 'google'
            ? 'https://generativelanguage.googleapis.com/v1beta/openai'
            : 'http://localhost:11434';
        const baseUrl = (settings.baseUrl || defaultBaseUrl).replace(/\/$/, '');
        const defaultModel = settings.provider === 'google' ? 'gemini-2.0-flash' : 'llama3.1';
        const model = settings.model || defaultModel;

        const headers = { 'Content-Type': 'application/json' };
        if (settings.apiKey) headers['Authorization'] = `Bearer ${settings.apiKey}`;

        const msgs = imageData ? this._injectImageOpenAI(messages, imageData) : messages;

        let response;
        try {
            response = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ model, messages: msgs, temperature, max_tokens: 4096 }),
                signal
            });
        } catch (networkError) {
            if (networkError.name === 'AbortError') throw networkError;
            throw new Error(
                `Cannot reach ${baseUrl}. ` +
                `If using Ollama, restart it with: OLLAMA_ORIGINS="*" ollama serve. ` +
                `If using LM Studio, enable "Allow CORS" in the Local Server settings. ` +
                `(${networkError.message})`
            );
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // Inject image into the last user message using OpenAI vision format
    _injectImageOpenAI(messages, imageData) {
        const msgs = messages.map(m => ({ ...m }));
        const lastUser = [...msgs].reverse().find(m => m.role === 'user');
        if (lastUser && typeof lastUser.content === 'string') {
            lastUser.content = [
                { type: 'text', text: lastUser.content },
                { type: 'image_url', image_url: { url: imageData } }
            ];
        }
        return msgs;
    }

    // Inject image into the last user message using Anthropic vision format
    _injectImageAnthropic(messages, imageData) {
        const msgs = messages.map(m => ({ ...m }));
        const lastUser = [...msgs].reverse().find(m => m.role === 'user');
        if (lastUser && typeof lastUser.content === 'string') {
            const commaIdx = imageData.indexOf(',');
            const prefix = commaIdx >= 0 ? imageData.substring(0, commaIdx) : '';
            const b64 = commaIdx >= 0 ? imageData.substring(commaIdx + 1) : imageData;
            const mediaTypeMatch = prefix.match(/:([\w/]+);/);
            if (!mediaTypeMatch) {
                console.warn('_injectImageAnthropic: could not parse media type from data URL; defaulting to image/jpeg');
            }
            const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';
            lastUser.content = [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
                { type: 'text', text: lastUser.content }
            ];
        }
        return msgs;
    }

    // Web Search
    async performWebSearch(query) {
        const provider = localStorage.getItem('ai_search_provider') || 'wikipedia';
        try {
            if (provider === 'wikipedia') {
                const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${MAX_SEARCH_RESULTS}&format=json&origin=*`;
                const response = await fetch(url);
                if (!response.ok) return `Search failed: HTTP ${response.status}`;
                const data = await response.json();
                const results = data.query?.search || [];
                if (!results.length) return 'No results found.';
                return results.map(r => {
                    // Strip all HTML tags from the snippet (including unclosed tags like <script)
                    const plainSnippet = r.snippet.replace(/<[^>]*>?/gm, '').replace(/</g, '');
                    return `**${r.title}**: ${plainSnippet}`;
                }).join('\n\n');
            } else if (provider === 'brave') {
                const apiKey = localStorage.getItem('ai_search_key') || '';
                if (!apiKey) return 'Brave Search API key not configured. Add it in Settings → Tools & Search.';
                const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${MAX_SEARCH_RESULTS}`;
                const response = await fetch(url, {
                    headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey }
                });
                if (!response.ok) return `Search failed: HTTP ${response.status}`;
                const data = await response.json();
                const results = data.web?.results || [];
                return results.slice(0, MAX_SEARCH_RESULTS).map(r =>
                    `**${r.title}**: ${r.description}\n${r.url}`
                ).join('\n\n');
            }
        } catch (e) {
            return `Search error: ${e.message}`;
        }
        return 'Web search is disabled. Enable it in Settings → Tools & Search.';
    }

    // File Context
    getFileContext() {
        if (!this.attachedFiles.length) return '';
        return this.attachedFiles.map(f =>
            `--- Attached file: ${f.name} (${f.type}) ---\n${f.content}`
        ).join('\n\n');
    }

    // Task Breakdown
    async breakdownTask(mainTask, systemPrompt) {
        const messages = [
            {
                role: 'system',
                content: systemPrompt || `You are an expert task decomposition AI. Break down complex tasks into smaller, manageable subtasks. 
                Return your response as a JSON array where each task has: id, title, description, estimated_duration, dependencies (array of task ids), and type (research/analysis/creation/execution/review).
                Make sure tasks are logical, sequential when needed, and can be executed independently when possible.`
            },
            {
                role: 'user',
                content: `Please break down this main task into smaller subtasks: ${mainTask}
                
                Return only a valid JSON array of tasks. Each task should be specific and actionable.`
            }
        ];

        try {
            const response = await this.callAI(messages);
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in response');
            }
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.error('Error parsing task breakdown:', error);
            return [{
                id: 1,
                title: 'Complete Main Task',
                description: mainTask,
                estimated_duration: 'Unknown',
                dependencies: [],
                type: 'execution'
            }];
        }
    }

    // Task Execution
    async executeTask(task, previousResults = [], profileKey = 'primary') {
        const systemPrompt = this.elements.systemPrompt.value ||
            'You are a helpful AI assistant. Complete the given task thoroughly and provide clear, actionable results.';

        const contextStr = previousResults.length > 0
            ? '\n\nContext from previously completed tasks:\n' +
              previousResults.map(pr =>
                  `### ${pr.task.title}\n${(pr.result.result || '').substring(0, 800)}`
              ).join('\n\n')
            : '';

        const fileContext = this.getFileContext();
        const imageData = this.attachedImage ? this.attachedImage.dataUrl : null;

        const searchInstructions = this.enableWebSearch
            ? '\n\nYou have access to web search. When you need current information, include [SEARCH: your search query] in your response. You will receive the results and may search up to 3 times per task.'
            : '';

        const codeInstructions = this.enableCodeExecution
            ? "\n\nYou can execute JavaScript code. If you need to run code, provide it in a code block marked with 'EXECUTE_JS:' followed by the code."
            : '';

        const messages = [
            {
                role: 'system',
                content: systemPrompt + codeInstructions + searchInstructions +
                    (fileContext ? `\n\nAttached data files for reference:\n${fileContext}` : '') +
                    (imageData ? '\n\nAn image has been attached for your analysis.' : '')
            },
            {
                role: 'user',
                content: `Task: ${task.title}\nDescription: ${task.description}${contextStr}\n\nPlease complete this task and provide detailed results.`
            }
        ];

        try {
            let result = await this.callAI(messages, 0.7, profileKey, imageData);

            // Web search tool loop — up to MAX_SEARCH_ITERATIONS iterations
            if (this.enableWebSearch) {
                let iterations = 0;
                while (result.includes('[SEARCH:') && iterations < MAX_SEARCH_ITERATIONS) {
                    const searchMatches = [...result.matchAll(/\[SEARCH:\s*([^\]]+)\]/g)];
                    if (!searchMatches.length) break;

                    let searchResults = '';
                    for (const match of searchMatches) {
                        const query = match[1].trim();
                        const sr = await this.performWebSearch(query);
                        searchResults += `\n\n### Search results for "${query}":\n${sr}`;
                    }

                    messages.push({ role: 'assistant', content: result });
                    messages.push({
                        role: 'user',
                        content: `Here are the search results:${searchResults}\n\nPlease continue with your analysis based on these results.`
                    });

                    result = await this.callAI(messages, 0.7, profileKey);
                    iterations++;
                }
            }

            if (this.enableCodeExecution && result.includes('EXECUTE_JS:')) {
                return await this.executeWithCode(result, task);
            }

            return { success: true, result, timestamp: new Date().toISOString(), profile: profileKey };
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, error: 'Stopped by user.', timestamp: new Date().toISOString() };
            }
            return { success: false, error: error.message, timestamp: new Date().toISOString() };
        }
    }

    // Code Execution
    async executeWithCode(content, task) {
        try {
            const codeBlocks = content.match(/EXECUTE_JS:([\s\S]*?)(?=EXECUTE_JS:|$)/g);
            let finalResult = content;

            if (codeBlocks) {
                for (const block of codeBlocks) {
                    const code = block.replace('EXECUTE_JS:', '').trim();
                    try {
                        const result = this.executeJavaScript(code);
                        this.displayCodeOutput(`// Executing code for task: ${task.title}\n${code}\n\n// Output:\n${result}`);
                        finalResult = finalResult.replace(block, `Code executed successfully. Result: ${result}`);
                    } catch (execError) {
                        this.displayCodeOutput(`// Error executing code for task: ${task.title}\n${code}\n\n// Error:\n${execError.message}`);
                        finalResult = finalResult.replace(block, `Code execution failed: ${execError.message}`);
                    }
                }
            }

            return { success: true, result: finalResult, timestamp: new Date().toISOString() };
        } catch (error) {
            return { success: false, error: error.message, timestamp: new Date().toISOString() };
        }
    }

    // Safe JavaScript Execution
    executeJavaScript(code) {
        try {
            const sandbox = {
                console: {
                    log: (...args) => args.join(' '),
                    error: (...args) => 'Error: ' + args.join(' ')
                },
                Math: Math,
                Date: Date,
                JSON: JSON,
                canvas: this.enableCanvas ? this.elements.outputCanvas : null,
                ctx: this.enableCanvas ? this.elements.outputCanvas.getContext('2d') : null
            };

            const func = new Function(...Object.keys(sandbox), `
                "use strict";
                ${code}
            `);

            const result = func(...Object.values(sandbox));
            return result !== undefined ? String(result) : 'Code executed successfully';
        } catch (error) {
            throw new Error(`JavaScript execution error: ${error.message}`);
        }
    }

    // Display Functions
    displayCodeOutput(output) {
        this.elements.codeOutput.textContent = output;
    }

    // File / Image Management
    handleFileUpload(file) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            alert(`File "${file.name}" exceeds the ${Math.round(MAX_FILE_SIZE_BYTES / 1024)} KB limit and was not added.`);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            this.attachedFiles.push({ name: file.name, content: e.target.result, type: file.type || 'text/plain' });
            this.renderAttachedFiles();
        };
        reader.readAsText(file);
    }

    handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.attachedImage = { dataUrl: e.target.result, name: file.name };
            this.renderImagePreview();
        };
        reader.readAsDataURL(file);
    }

    removeFile(index) {
        this.attachedFiles.splice(index, 1);
        this.renderAttachedFiles();
    }

    removeImage() {
        this.attachedImage = null;
        this.elements.imagePreview.classList.add('d-none');
        this.elements.previewImg.src = '';
    }

    renderAttachedFiles() {
        if (!this.attachedFiles.length) {
            this.elements.attachedFiles.classList.add('d-none');
            return;
        }
        this.elements.attachedFiles.classList.remove('d-none');
        this.elements.attachedFiles.innerHTML = '';
        this.attachedFiles.forEach((file, index) => {
            const chip = document.createElement('span');
            chip.className = 'badge bg-secondary me-1 mb-1 file-chip';

            const icon = document.createElement('i');
            icon.className = 'fas fa-file me-1';

            const nameNode = document.createTextNode(file.name);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-close btn-close-white ms-1';
            removeBtn.style.cssText = 'font-size:0.55em;vertical-align:middle;';
            removeBtn.setAttribute('aria-label', 'Remove');
            removeBtn.addEventListener('click', () => this.removeFile(index));

            chip.appendChild(icon);
            chip.appendChild(nameNode);
            chip.appendChild(removeBtn);
            this.elements.attachedFiles.appendChild(chip);
        });
    }

    renderImagePreview() {
        if (!this.attachedImage) {
            this.elements.imagePreview.classList.add('d-none');
            return;
        }
        this.elements.imagePreview.classList.remove('d-none');
        this.elements.previewImg.src = this.attachedImage.dataUrl;
        this.elements.imageName.textContent = this.attachedImage.name;
    }

    displayTaskBreakdown(tasks) {
        this.tasks = tasks;
        this.elements.taskCount.textContent = `${tasks.length} tasks`;

        this.elements.taskBreakdown.innerHTML = '';
        tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'task-item pending';
            item.dataset.taskId = task.id;

            const title = document.createElement('div');
            title.className = 'task-title';
            title.textContent = task.title;

            const description = document.createElement('div');
            description.className = 'task-description';
            description.textContent = task.description;

            const statusDiv = document.createElement('div');
            statusDiv.className = 'task-status';

            const badge = document.createElement('span');
            badge.className = 'badge status-badge bg-secondary';
            badge.textContent = 'Pending';

            const meta = document.createElement('small');
            meta.className = 'text-muted';
            meta.textContent = `${task.type} • ~${task.estimated_duration}`;

            statusDiv.appendChild(badge);
            statusDiv.appendChild(meta);
            item.appendChild(title);
            item.appendChild(description);
            item.appendChild(statusDiv);
            this.elements.taskBreakdown.appendChild(item);
        });
    }

    updateTaskStatus(taskId, status, profileKey = null) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskElement) return;

        taskElement.className = `task-item ${status}`;
        const statusBadge = taskElement.querySelector('.badge.status-badge');

        const statusMap = {
            running:   { text: 'Running',   cls: 'badge status-badge bg-primary' },
            completed: { text: 'Completed', cls: 'badge status-badge bg-success' },
            error:     { text: 'Error',     cls: 'badge status-badge bg-danger'  }
        };

        const s = statusMap[status];
        if (s && statusBadge) {
            statusBadge.textContent = s.text;
            statusBadge.className = s.cls;
        }

        // LLM badge
        if (profileKey) {
            let llmBadge = taskElement.querySelector('.llm-badge');
            if (!llmBadge) {
                llmBadge = document.createElement('span');
                llmBadge.className = 'badge llm-badge ms-1';
                const statusDiv = taskElement.querySelector('.task-status');
                if (statusDiv) statusDiv.appendChild(llmBadge);
            }
            const profile = this.getProfile(profileKey);
            const providerLabel = PROVIDER_LABELS[profile.provider] || profile.provider || 'LLM';
            llmBadge.textContent = profileKey === 'secondary' ? `2° ${providerLabel}` : `1° ${providerLabel}`;
            llmBadge.className = `badge llm-badge ms-1 ${profileKey === 'secondary' ? 'bg-warning text-dark' : 'bg-info text-dark'}`;
        }
    }

    displayExecutionResult(task, result) {
        // Track results for history saving
        this.currentSessionResults.push({ task, result });

        const item = document.createElement('div');
        item.className = `result-item ${result.success ? 'success' : 'error'}`;

        const header = document.createElement('div');
        header.className = 'result-header';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = task.title;

        const headerRight = document.createElement('div');
        headerRight.className = 'd-flex align-items-center gap-2';

        // LLM indicator
        if (result.profile) {
            const profile = this.getProfile(result.profile);
            const label = PROVIDER_LABELS[profile.provider] || profile.provider || 'LLM';
            const llmTag = document.createElement('span');
            llmTag.className = `badge ${result.profile === 'secondary' ? 'bg-warning text-dark' : 'bg-info text-dark'}`;
            llmTag.textContent = label;
            headerRight.appendChild(llmTag);
        }

        const timeSmall = document.createElement('small');
        timeSmall.className = 'text-muted';
        timeSmall.textContent = new Date(result.timestamp).toLocaleTimeString();

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-outline-secondary btn-sm py-0 px-1';
        copyBtn.title = 'Copy to clipboard';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        const rawText = result.success ? result.result : `Error: ${result.error}`;
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(rawText).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500);
            }).catch(() => {
                copyBtn.innerHTML = '<i class="fas fa-times"></i>';
                setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500);
            });
        });

        headerRight.appendChild(timeSmall);
        headerRight.appendChild(copyBtn);

        header.appendChild(titleSpan);
        header.appendChild(headerRight);

        const content = document.createElement('div');
        content.className = 'result-content';

        if (result.success && typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            content.innerHTML = DOMPurify.sanitize(marked.parse(result.result));
            content.classList.add('markdown-body');
        } else {
            content.textContent = rawText;
        }

        item.appendChild(header);
        item.appendChild(content);

        this.elements.executionResults.appendChild(item);
        this.elements.executionResults.scrollTop = this.elements.executionResults.scrollHeight;
    }

    updateProgress() {
        const completedTasks = this.tasks.filter(task =>
            document.querySelector(`[data-task-id="${task.id}"]`)?.classList.contains('completed')
        ).length;

        const progress = this.tasks.length > 0 ? (completedTasks / this.tasks.length) * 100 : 0;
        this.elements.progressBar.style.width = `${progress}%`;
        this.elements.progressText.textContent = `${Math.round(progress)}%`;
    }

    // Export & Clear
    exportResults() {
        const taskText = this.elements.taskInput.value.trim() || 'Unknown task';
        const lines = [`# Orchestration Results\n\n**Task:** ${taskText}\n\n**Date:** ${new Date().toLocaleString()}\n\n---\n`];

        this.elements.executionResults.querySelectorAll('.result-item').forEach(item => {
            const title = item.querySelector('.result-header span')?.textContent || '';
            const time = item.querySelector('.result-header small')?.textContent || '';
            const body = item.querySelector('.result-content')?.textContent || '';
            lines.push(`## ${title} _(${time})_\n\n${body}\n\n---\n`);
        });

        if (lines.length === 1) {
            alert('No results to export yet.');
            return;
        }

        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orchestration-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearResults() {
        this.elements.executionResults.innerHTML = '';
        this.elements.taskBreakdown.innerHTML = '';
        this.elements.taskCount.textContent = '0 tasks';
        this.elements.progressBar.style.width = '0%';
        this.elements.progressText.textContent = '0%';
        this.elements.codeOutput.textContent = '';
        this.tasks = [];
    }

    // Stop Orchestration
    stopOrchestration() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    // History Management
    saveToHistory(mainTask, results) {
        const MAX_HISTORY = 20;
        const FALLBACK_HISTORY_SIZE = MAX_HISTORY / 2;
        const history = this.loadHistory();
        const entry = {
            id: Date.now(),
            date: new Date().toISOString(),
            task: mainTask,
            results
        };
        history.unshift(entry);
        if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
        try {
            localStorage.setItem('orchestration_history', JSON.stringify(history));
        } catch (e) {
            // Storage quota may be exceeded; drop oldest entries
            history.splice(FALLBACK_HISTORY_SIZE);
            try { localStorage.setItem('orchestration_history', JSON.stringify(history)); } catch (_) {}
        }
    }

    loadHistory() {
        try {
            return JSON.parse(localStorage.getItem('orchestration_history') || '[]');
        } catch {
            return [];
        }
    }

    openHistory() {
        const history = this.loadHistory();
        this.elements.historyList.innerHTML = '';

        if (history.length === 0) {
            this.elements.historyEmpty.classList.remove('d-none');
        } else {
            this.elements.historyEmpty.classList.add('d-none');
            history.forEach(entry => {
                const card = document.createElement('div');
                card.className = 'card mb-3';

                const cardHeader = document.createElement('div');
                cardHeader.className = 'card-header d-flex justify-content-between align-items-center';

                const taskTitle = document.createElement('div');
                taskTitle.className = 'text-truncate me-2 fw-semibold';
                taskTitle.style.maxWidth = '70%';
                taskTitle.textContent = entry.task;
                taskTitle.title = entry.task;

                const headerRight = document.createElement('div');
                headerRight.className = 'd-flex align-items-center gap-2 flex-shrink-0';

                const dateSmall = document.createElement('small');
                dateSmall.className = 'text-muted';
                dateSmall.textContent = new Date(entry.date).toLocaleString();

                const loadBtn = document.createElement('button');
                loadBtn.className = 'btn btn-outline-primary btn-sm';
                loadBtn.innerHTML = '<i class="fas fa-redo me-1"></i>Load';
                loadBtn.addEventListener('click', () => {
                    this.elements.taskInput.value = entry.task;
                    localStorage.setItem('last_task_input', entry.task);
                    bootstrap.Modal.getInstance(this.elements.historyModal)?.hide();
                });

                headerRight.appendChild(dateSmall);
                headerRight.appendChild(loadBtn);
                cardHeader.appendChild(taskTitle);
                cardHeader.appendChild(headerRight);

                const cardBody = document.createElement('div');
                cardBody.className = 'card-body py-2';

                const summary = document.createElement('small');
                summary.className = 'text-muted';
                const successCount = entry.results.filter(r => r.result.success).length;
                summary.textContent = `${entry.results.length} task(s) — ${successCount} succeeded`;

                cardBody.appendChild(summary);
                card.appendChild(cardHeader);
                card.appendChild(cardBody);
                this.elements.historyList.appendChild(card);
            });
        }

        const existing = bootstrap.Modal.getInstance(this.elements.historyModal);
        if (existing) {
            existing.show();
        } else {
            new bootstrap.Modal(this.elements.historyModal).show();
        }
    }

    clearHistory() {
        if (!confirm('Clear all orchestration history?')) return;
        localStorage.removeItem('orchestration_history');
        this.elements.historyList.innerHTML = '';
        this.elements.historyEmpty.classList.remove('d-none');
    }

    // Main Orchestration Logic
    async startOrchestration() {
        const mainTask = this.elements.taskInput.value.trim();
        if (!mainTask) {
            alert('Please enter a task to orchestrate');
            return;
        }

        if (this.isRunning) return;

        const settings = this.getSettings();
        if (!settings.apiKey && settings.provider !== 'ollama') {
            alert('Please configure your AI provider settings first.');
            this.openSettings();
            return;
        }

        this.abortController = new AbortController();
        this.currentSessionResults = [];

        try {
            this.isRunning = true;
            this.elements.orchestrateBtn.disabled = true;
            this.elements.stopBtn.classList.remove('d-none');
            this.elements.orchestrateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Breaking down task...';

            this.elements.executionResults.innerHTML = '';
            this.elements.taskBreakdown.innerHTML = '';

            const tasks = await this.breakdownTask(mainTask, this.elements.systemPrompt.value);
            this.displayTaskBreakdown(tasks);

            this.elements.orchestrateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Executing tasks...';

            if (this.executionMode === 'serial') {
                await this.executeTasksSerial();
            } else {
                await this.executeTasksParallel();
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Orchestration error:', error);
                alert(`Error during orchestration: ${error.message}`);
            }
        } finally {
            // Save completed session to history
            if (this.currentSessionResults.length > 0) {
                this.saveToHistory(mainTask, this.currentSessionResults);
            }
            this.isRunning = false;
            this.abortController = null;
            this.elements.orchestrateBtn.disabled = false;
            this.elements.stopBtn.classList.add('d-none');
            this.elements.orchestrateBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Orchestration';
        }
    }

    async executeTasksSerial() {
        const previousResults = [];
        for (const task of this.tasks) {
            if (this.abortController?.signal.aborted) break;

            const profileKey = this.getProfileForTask(task);
            this.updateTaskStatus(task.id, 'running', profileKey);
            const result = await this.executeTask(task, previousResults, profileKey);

            if (result.success) {
                this.updateTaskStatus(task.id, 'completed', profileKey);
                previousResults.push({ task, result });
            } else {
                this.updateTaskStatus(task.id, 'error', profileKey);
            }

            this.displayExecutionResult(task, result);
            this.updateProgress();

            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    async executeTasksParallel() {
        const promises = this.tasks.map(async (task) => {
            const profileKey = this.getProfileForTask(task);
            this.updateTaskStatus(task.id, 'running', profileKey);
            const result = await this.executeTask(task, [], profileKey);

            if (result.success) {
                this.updateTaskStatus(task.id, 'completed', profileKey);
            } else {
                this.updateTaskStatus(task.id, 'error', profileKey);
            }

            this.displayExecutionResult(task, result);
            this.updateProgress();

            return { task, result };
        });

        await Promise.allSettled(promises);
    }
}

// Initialize the orchestrator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.orchestrator = new AIOrchestrator();
});

