// AI Universal Orchestrator
class AIOrchestrator {
    constructor() {
        this.tasks = [];
        this.currentTaskIndex = 0;
        this.isRunning = false;
        this.executionMode = 'serial';
        this.enableCodeExecution = false;
        this.enableCanvas = false;
        this.abortController = null;

        this.initializeDOM();
        this.setupEventListeners();
        this.loadSettings();
        this.checkApiKey();
    }

    // DOM Initialization
    initializeDOM() {
        this.elements = {
            settingsModal: document.getElementById('settingsModal'),
            settingsModalClose: document.getElementById('settingsModalClose'),
            providerSelect: document.getElementById('providerSelect'),
            apiKeyInput: document.getElementById('apiKeyInput'),
            apiKeyGroup: document.getElementById('apiKeyGroup'),
            apiKeyHint: document.getElementById('apiKeyHint'),
            baseUrlGroup: document.getElementById('baseUrlGroup'),
            baseUrlInput: document.getElementById('baseUrlInput'),
            modelInput: document.getElementById('modelInput'),
            modelHint: document.getElementById('modelHint'),
            saveApiKeyBtn: document.getElementById('saveApiKey'),
            cancelSettingsBtn: document.getElementById('cancelSettings'),
            configBtn: document.getElementById('configBtn'),
            taskInput: document.getElementById('taskInput'),
            systemPrompt: document.getElementById('systemPrompt'),
            orchestrateBtn: document.getElementById('orchestrateBtn'),
            stopBtn: document.getElementById('stopBtn'),
            exportBtn: document.getElementById('exportBtn'),
            clearBtn: document.getElementById('clearBtn'),
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
        this.elements.orchestrateBtn.addEventListener('click', () => this.startOrchestration());
        this.elements.stopBtn.addEventListener('click', () => this.stopOrchestration());
        this.elements.exportBtn.addEventListener('click', () => this.exportResults());
        this.elements.clearBtn.addEventListener('click', () => this.clearResults());

        // Provider change updates UI hints
        this.elements.providerSelect.addEventListener('change', () => this.updateProviderUI());

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
    }

    // Settings Management
    loadSettings() {
        const provider = localStorage.getItem('ai_provider') || 'openai';
        const apiKey = localStorage.getItem('openai_api_key') || '';
        const baseUrl = localStorage.getItem('ai_base_url') || '';
        const model = localStorage.getItem('ai_model') || '';

        this.elements.providerSelect.value = provider;
        this.elements.apiKeyInput.value = apiKey;
        this.elements.baseUrlInput.value = baseUrl;
        this.elements.modelInput.value = model;

        this.updateProviderUI();
    }

    saveSettings() {
        const provider = this.elements.providerSelect.value;
        const apiKey = this.elements.apiKeyInput.value.trim();
        const baseUrl = this.elements.baseUrlInput.value.trim();
        const model = this.elements.modelInput.value.trim();

        // Validate API key based on provider
        if (provider !== 'ollama' && !apiKey) {
            alert('Please enter an API key for the selected provider.');
            return;
        }

        localStorage.setItem('ai_provider', provider);
        localStorage.setItem('openai_api_key', apiKey);
        localStorage.setItem('ai_base_url', baseUrl);
        localStorage.setItem('ai_model', model);

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
        this.showSettingsModal();
    }

    updateProviderUI() {
        const provider = this.elements.providerSelect.value;
        const hints = {
            openai:    { key: 'OpenAI API key (starts with sk- or sk-proj-)', model: 'e.g. gpt-4o, gpt-4-turbo', baseUrl: 'https://api.openai.com' },
            anthropic: { key: 'Anthropic API key (starts with sk-ant-)',      model: 'e.g. claude-3-5-sonnet-20241022',  baseUrl: 'https://api.anthropic.com' },
            ollama:    { key: 'Not required for local Ollama',                 model: 'e.g. llama3.1, mistral',           baseUrl: 'http://localhost:11434' },
            custom:    { key: 'API key (if required by your endpoint)',        model: 'Model name for your endpoint',     baseUrl: 'https://your-endpoint.example.com' }
        };

        const info = hints[provider] || hints.openai;
        this.elements.apiKeyHint.textContent = info.key;
        this.elements.modelHint.textContent = `Leave blank for default. ${info.model}`;
        this.elements.baseUrlInput.placeholder = info.baseUrl;

        // Show/hide API key field for Ollama
        const needsKey = provider !== 'ollama';
        this.elements.apiKeyGroup.classList.toggle('d-none', !needsKey);
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
    async callAI(messages, temperature = 0.7) {
        const settings = this.getSettings();
        const signal = this.abortController ? this.abortController.signal : undefined;

        switch (settings.provider) {
            case 'anthropic':
                return this.callAnthropic(messages, temperature, settings, signal);
            case 'ollama':
            case 'custom':
                return this.callOpenAICompat(messages, temperature, settings, signal);
            default:
                return this.callOpenAI(messages, temperature, settings, signal);
        }
    }

    async callOpenAI(messages, temperature, settings, signal) {
        if (!settings.apiKey) throw new Error('No API key configured. Click Settings to add one.');

        const model = settings.model || 'gpt-4o';
        const baseUrl = (settings.baseUrl || 'https://api.openai.com').replace(/\/$/, '');

        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, messages, temperature, max_tokens: 2000 }),
            signal
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async callAnthropic(messages, temperature, settings, signal) {
        if (!settings.apiKey) throw new Error('No API key configured. Click Settings to add one.');

        const model = settings.model || 'claude-3-5-sonnet-20241022';
        const baseUrl = (settings.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');

        const systemMsg = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        const body = { model, max_tokens: 2000, messages: chatMessages, temperature };
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

    async callOpenAICompat(messages, temperature, settings, signal) {
        const baseUrl = (settings.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
        const model = settings.model || 'llama3.1';

        const headers = { 'Content-Type': 'application/json' };
        if (settings.apiKey) headers['Authorization'] = `Bearer ${settings.apiKey}`;

        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ model, messages, temperature, max_tokens: 2000 }),
            signal
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
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
    async executeTask(task, previousResults = []) {
        const systemPrompt = this.elements.systemPrompt.value ||
            'You are a helpful AI assistant. Complete the given task thoroughly and provide clear, actionable results.';

        const contextStr = previousResults.length > 0
            ? '\n\nContext from previously completed tasks:\n' +
              previousResults.map(pr =>
                  `### ${pr.task.title}\n${(pr.result.result || '').substring(0, 800)}`
              ).join('\n\n')
            : '';

        const messages = [
            {
                role: 'system',
                content: systemPrompt + (this.enableCodeExecution ?
                    '\n\nYou can execute JavaScript code. If you need to run code, provide it in a code block marked with \'EXECUTE_JS:\' followed by the code.' : '')
            },
            {
                role: 'user',
                content: `Task: ${task.title}\nDescription: ${task.description}${contextStr}\n\nPlease complete this task and provide detailed results.`
            }
        ];

        try {
            const result = await this.callAI(messages);

            if (this.enableCodeExecution && result.includes('EXECUTE_JS:')) {
                return await this.executeWithCode(result, task);
            }

            return { success: true, result, timestamp: new Date().toISOString() };
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
            badge.className = 'badge bg-secondary';
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

    updateTaskStatus(taskId, status) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskElement) return;

        taskElement.className = `task-item ${status}`;
        const statusBadge = taskElement.querySelector('.badge');

        const statusMap = {
            running:   { text: 'Running',   cls: 'badge bg-primary' },
            completed: { text: 'Completed', cls: 'badge bg-success' },
            error:     { text: 'Error',     cls: 'badge bg-danger'  }
        };

        const s = statusMap[status];
        if (s) {
            statusBadge.textContent = s.text;
            statusBadge.className = s.cls;
        }
    }

    displayExecutionResult(task, result) {
        const item = document.createElement('div');
        item.className = `result-item ${result.success ? 'success' : 'error'}`;

        const header = document.createElement('div');
        header.className = 'result-header';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = task.title;

        const timeSmall = document.createElement('small');
        timeSmall.className = 'text-muted';
        timeSmall.textContent = new Date(result.timestamp).toLocaleTimeString();

        header.appendChild(titleSpan);
        header.appendChild(timeSmall);

        const content = document.createElement('div');
        content.className = 'result-content';
        content.textContent = result.success ? result.result : `Error: ${result.error}`;

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

            this.updateTaskStatus(task.id, 'running');
            const result = await this.executeTask(task, previousResults);

            if (result.success) {
                this.updateTaskStatus(task.id, 'completed');
                previousResults.push({ task, result });
            } else {
                this.updateTaskStatus(task.id, 'error');
            }

            this.displayExecutionResult(task, result);
            this.updateProgress();

            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    async executeTasksParallel() {
        const promises = this.tasks.map(async (task) => {
            this.updateTaskStatus(task.id, 'running');
            const result = await this.executeTask(task);

            if (result.success) {
                this.updateTaskStatus(task.id, 'completed');
            } else {
                this.updateTaskStatus(task.id, 'error');
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

