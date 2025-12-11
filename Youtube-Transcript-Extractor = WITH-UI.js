// ============= WORK 11.dec.25 Web Desctop =============
// ============= Функция для запуска выкачки транскрипта =============

// Ютуб блокирует внедрение классов - все только на функциях.
// При нажатиин а СС - всегда происходит ловля даже если сабы уже были включены раньше
// Кастом язык - выбирается в настройках видео и тоже перехватит.
// Позже будет версия с интерфейсом

// Создано для ручного парсинга длинных видео для дальшейшего обучения нейронок на них.
// Вставил лекцию по ХХХ на 3 чата = нейронка уже разбирается и шарит. Но тут расчет на десятки часов узкопрофильной инфы.

// v7.5
// ===================== ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ =====================
(function() {
    console.log('[YT Transcript Extractor] Инициализация v7.5 (эталон)...');
    
    // Удаляем ВСЕ старые UI элементы
    const oldUIs = document.querySelectorAll('#youtube-transcript-ui, [id^="youtube-transcript-ui"]');
    oldUIs.forEach(el => el.remove());
    
    // Восстанавливаем оригинальные методы
    if (window._originalFetch) window.fetch = window._originalFetch;
    if (window._originalXHROpen) XMLHttpRequest.prototype.open = window._originalXHROpen;
    if (window._originalXHRSend) XMLHttpRequest.prototype.send = window._originalXHRSend;
    
    // Очищаем глобальные переменные
    delete window._originalFetch;
    delete window._originalXHROpen;
    delete window._originalXHRSend;
    window._transcriptFound = false;
    window._interceptorActive = false;
    
    console.log('[YT Transcript Extractor] Очистка завершена');
})();

// ===================== UI КОМПОНЕНТЫ =====================
function createSafeElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key.startsWith('on')) {
            element[key] = value;
        } else if (value !== undefined && value !== null) {
            element.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });
    
    return element;
}

function createUI() {
    console.log('[YT Transcript Extractor] Создание UI v7.5...');
    
    // Увеличенная ширина на 40px (с 500 до 540)
    const uiContainer = createSafeElement('div', {
        id: 'youtube-transcript-ui',
        style: {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '540px', // УВЕЛИЧЕНО НА 40px
            height: '400px',
            minWidth: '480px',
            minHeight: '350px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            zIndex: '10000',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: '#e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            resize: 'both'
        }
    });
    
    // Header
    const header = createSafeElement('div', {
        class: 'ytt-header',
        style: {
            background: '#252525',
            padding: '12px 16px',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'move',
            userSelect: 'none'
        }
    });
    
    const headerText = createSafeElement('div', {
        class: 'ytt-drag-handle',
        style: { fontWeight: '600', fontSize: '14px', color: '#fff' }
    }, ['🎯 YT Transcript Extractor v7.5']);
    
    const controls = createSafeElement('div', { class: 'ytt-controls', style: { display: 'flex', gap: '4px' } });
    
    const minimizeBtn = createSafeElement('button', {
        id: 'ytt-minimize',
        style: {
            background: 'none', border: 'none', color: '#aaa', cursor: 'pointer',
            fontSize: '18px', width: '24px', height: '24px', borderRadius: '3px'
        },
        onclick: () => uiContainer.classList.toggle('ytt-minimized')
    }, ['−']);
    
    const closeBtn = createSafeElement('button', {
        id: 'ytt-close',
        style: {
            background: 'none', border: 'none', color: '#aaa', cursor: 'pointer',
            fontSize: '18px', width: '24px', height: '24px', borderRadius: '3px'
        },
        onclick: () => {
            uiContainer.remove();
            stopTranscriptExtractor();
        }
    }, ['×']);
    
    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);
    header.appendChild(headerText);
    header.appendChild(controls);
    
    // Body
    const body = createSafeElement('div', {
        class: 'ytt-body',
        style: {
            flex: '1',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }
    });
    
    // Status section
    const statusSection = createSafeElement('div', {
        style: { marginBottom: '16px' }
    });
    
    const status = createSafeElement('div', {
        style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px' }
    });
    
    status.appendChild(createSafeElement('span', {}, ['Статус:']));
    const statusText = createSafeElement('span', {
        id: 'ytt-status-text',
        style: { color: '#f44336', fontWeight: '600' }
    }, ['⏸️ Остановлен']);
    status.appendChild(statusText);
    
    // Buttons
    const buttons = createSafeElement('div', {
        style: { display: 'flex', gap: '8px' }
    });
    
    const startBtn = createSafeElement('button', {
        id: 'ytt-start-btn',
        style: {
            background: '#2196F3', color: 'white', padding: '8px 16px', border: 'none',
            borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', flex: '1'
        },
        onclick: startTranscriptExtractor
    }, ['▶️ Запустить перехват']);
    
    const stopBtn = createSafeElement('button', {
        id: 'ytt-stop-btn',
        style: {
            background: '#555', color: 'white', padding: '8px 16px', border: 'none',
            borderRadius: '4px', cursor: 'not-allowed', fontSize: '13px',
            fontWeight: '500', flex: '1', opacity: '0.5'
        },
        disabled: true,
        onclick: stopTranscriptExtractor
    }, ['⏹️ Остановить']);
    
    buttons.appendChild(startBtn);
    buttons.appendChild(stopBtn);
    
    // Info
    const info = createSafeElement('div', {
        style: { fontSize: '12px', color: '#aaa', marginBottom: '12px' }
    }, ['Инструкция: включите субтитры (CC) на видео']);
    
    statusSection.appendChild(status);
    statusSection.appendChild(buttons);
    statusSection.appendChild(info);
    
    // Table container - увеличены пропорции колонок
    const tableContainer = createSafeElement('div', {
        id: 'ytt-table-container',
        style: {
            flex: '1',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #333',
            borderRadius: '4px'
        }
    });
    
    // УВЕЛИЧЕНЫ ШИРИНЫ КОЛОНОК ДЛЯ КНОПОК
    const tableHeader = createSafeElement('div', {
        style: {
            background: '#252525',
            padding: '8px 12px',
            borderBottom: '1px solid #333',
            fontSize: '12px',
            fontWeight: '600',
            display: 'grid',
            gridTemplateColumns: '30% 12% 18% 40%', // УВЕЛИЧЕНА ПОСЛЕДНЯЯ КОЛОНКА
            gap: '8px'
        }
    });
    
    ['Тип субтитров', 'Символов', 'Время', 'Действия'].forEach(text => {
        tableHeader.appendChild(createSafeElement('div', {}, [text]));
    });
    
    const tableBody = createSafeElement('div', {
        id: 'ytt-table-body',
        style: {
            flex: '1',
            overflowY: 'auto',
            maxHeight: '180px',
            minHeight: '60px'
        }
    });
    
    const emptyMessage = createSafeElement('div', {
        style: {
            padding: '20px',
            textAlign: 'center',
            color: '#888',
            fontStyle: 'italic',
            fontSize: '13px'
        }
    }, ['Нет перехваченных субтитров']);
    
    tableBody.appendChild(emptyMessage);
    
    tableContainer.appendChild(tableHeader);
    tableContainer.appendChild(tableBody);
    
    // Assemble
    body.appendChild(statusSection);
    body.appendChild(tableContainer);
    uiContainer.appendChild(header);
    uiContainer.appendChild(body);
    document.body.appendChild(uiContainer);
    
    setupDragAndResize(uiContainer);
    console.log('[YT Transcript Extractor] UI создан');
}

// ===================== ХРАНИЛИЩЕ ДАННЫХ (ЭТАЛОН) =====================
if (!window._subtitlesStore) {
    window._subtitlesStore = {
        items: [],
        
        add(transcriptData, metadata, url) {
            console.log('[Store] Добавление субтитров...');
            
            const urlObj = new URL(url);
            const kind = urlObj.searchParams.get('kind') || 'unknown';
            const lang = urlObj.searchParams.get('lang') || 'unknown';
            
            let kindName = kind === 'asr' ? 'Автоматические' : 'Ручные';
            if (kind === 'translation') kindName = 'Перевод';
            
            const id = Date.now() + Math.random();
            const item = {
                id,
                timestamp: new Date().toLocaleTimeString(),
                kind,
                kindName,
                lang,
                metadata: { ...metadata },
                transcript: { ...transcriptData },
                url
            };
            
            this.items.unshift(item);
            if (this.items.length > 10) this.items.pop();
            
            this.updateUI();
            console.log('[Store] Добавлено:', item.kindName, `(${item.lang})`);
            return item;
        },
        
        remove(id) {
            const index = this.items.findIndex(item => item.id === id);
            if (index !== -1) {
                this.items.splice(index, 1);
                this.updateUI();
                this.notify('🗑️ Транскрипт удален');
            }
        },
        
        updateUI() {
            const tableBody = document.getElementById('ytt-table-body');
            if (!tableBody) {
                console.error('[Store] Элемент ytt-table-body не найден');
                return;
            }
            
            // Безопасная очистка
            while (tableBody.firstChild) {
                tableBody.removeChild(tableBody.firstChild);
            }
            
            if (this.items.length === 0) {
                tableBody.appendChild(createSafeElement('div', {
                    style: {
                        padding: '20px',
                        textAlign: 'center',
                        color: '#888',
                        fontStyle: 'italic',
                        fontSize: '13px'
                    }
                }, ['Нет перехваченных субтитров']));
                return;
            }
            
            this.items.forEach(item => {
                // УВЕЛИЧЕНЫ ПРОПОРЦИИ КОЛОНОК
                const row = createSafeElement('div', {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: '30% 12% 18% 40%', // СООТВЕТСТВУЕТ ШАПКЕ
                        gap: '8px',
                        padding: '10px 12px',
                        borderBottom: '1px solid #2a2a2a',
                        fontSize: '12px',
                        alignItems: 'center'
                    }
                });
                
                // Тип
                const typeCell = createSafeElement('div');
                typeCell.appendChild(createSafeElement('div', {
                    style: { fontWeight: '500', marginBottom: '2px' }
                }, [this.getLanguageName(item.lang)]));
                typeCell.appendChild(createSafeElement('div', {
                    style: { fontSize: '11px', color: '#aaa' }
                }, [`${item.kindName} • ${item.timestamp}`]));
                
                // Символы
                const charsCell = createSafeElement('div', {}, [item.transcript.text.length.toLocaleString()]);
                
                // Время
                const timeCell = createSafeElement('div', {}, [
                    item.transcript.startTime ? `${item.transcript.startTime}-${item.transcript.endTime}` : '?'
                ]);
                
                // Действия - УВЕЛИЧЕНА ОБЛАСТЬ ДЛЯ КНОПОК
                const actionsCell = createSafeElement('div', {
                    style: { 
                        display: 'flex', 
                        gap: '4px', 
                        flexWrap: 'nowrap', // ЗАПРЕТ ПЕРЕНОСА
                        justifyContent: 'flex-start',
                        overflow: 'hidden'
                    }
                });
                
                const actions = [
                    { text: '📋 Полный', title: 'Скопировать с метаданными', action: () => this.copyFull(item.id) },
                    { text: '📝 Текст', title: 'Только текст', action: () => this.copyText(item.id) },
                    { text: '💾 Файл', title: 'Скачать файл', action: () => this.download(item.id) },
                    { text: '🗑️', title: 'Удалить', action: () => this.remove(item.id) }
                ];
                
                actions.forEach(btn => {
                    const button = createSafeElement('button', {
                        style: {
                            background: '#555', 
                            color: 'white', 
                            border: 'none',
                            borderRadius: '3px', 
                            cursor: 'pointer', 
                            padding: '4px 8px',
                            fontSize: '11px',
                            whiteSpace: 'nowrap', // ЗАПРЕТ ПЕРЕНОСА ТЕКСТА
                            flexShrink: '0' // ЗАПРЕТ СЖАТИЯ
                        },
                        title: btn.title,
                        onclick: btn.action
                    }, [btn.text]);
                    actionsCell.appendChild(button);
                });
                
                row.appendChild(typeCell);
                row.appendChild(charsCell);
                row.appendChild(timeCell);
                row.appendChild(actionsCell);
                tableBody.appendChild(row);
            });
        },
        
        getLanguageName(code) {
            const languages = { 
                'ru': 'Русский', 'en': 'Английский', 'es': 'Испанский',
                'fr': 'Французский', 'de': 'Немецкий', 'ja': 'Японский',
                'zh': 'Китайский', 'ko': 'Корейский', 'ar': 'Арабский'
            };
            return languages[code] || code.toUpperCase();
        },
        
        getItem(id) {
            return this.items.find(item => item.id === id);
        },
        
        copyFull(id) {
            const item = this.getItem(id);
            if (!item) return;
            
            const text = this.formatTranscript(item);
            navigator.clipboard.writeText(text)
                .then(() => this.notify('📋 Скопировано с метаданными'))
                .catch(err => console.error('Ошибка копирования:', err));
        },
        
        copyText(id) {
            const item = this.getItem(id);
            if (!item) return;
            
            navigator.clipboard.writeText(item.transcript.text)
                .then(() => this.notify('📝 Скопирован только текст'))
                .catch(err => console.error('Ошибка копирования:', err));
        },
        
        download(id) {
            const item = this.getItem(id);
            if (!item) return;
            
            const text = this.formatTranscript(item);
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = createSafeElement('a', { 
                href: url, 
                download: this.generateFileName(item), // ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЙ ШАБЛОН
                style: { display: 'none' }
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.notify('💾 Файл скачан');
        },
        
        // ФОРМИРОВАНИЕ ИМЕНИ ФАЙЛА ПО ЗАДАННОМУ ШАБЛОНУ
        generateFileName(item) {
            // 1. Канал (очистка от недопустимых символов)
            const cleanChannel = (item.metadata.channelName || 'Unknown')
                .replace(/[<>:"/\\|?*]/g, '')
                .substring(0, 30)
                .trim()
                .replace(/\s+/g, '_');
            
            // 2. Дата (без времени)
            const dateMatch = item.metadata.uploadDate?.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
            const cleanDate = dateMatch ? dateMatch[0].replace(/[/]/g, '-') : 'nodate';
            
            // 3. ID видео
            const videoId = item.metadata.videoId || 'noid';
            
            // 4. Общая длина субтитров (время)
            const timeRange = item.transcript.startTime && item.transcript.endTime 
                ? `${item.transcript.startTime.replace(/:/g, '-')}_to_${item.transcript.endTime.replace(/:/g, '-')}`
                : 'notime';
            
            // 5. Длина в словах
            const wordCount = item.transcript.text.split(/\s+/).filter(w => w.length > 0).length;
            
            // 6. Начало названия видео (первые 2-3 слова)
            const titleWords = (item.metadata.videoTitle || '')
                .split(/\s+/)
                .slice(0, 3)
                .map(word => word.replace(/[<>:"/\\|?*]/g, ''))
                .filter(word => word.length > 0)
                .join('_');
            
            // Собираем по шаблону: канал_дата_ид_время_слов_название.txt
            const fileName = `${cleanChannel}_${cleanDate}_${videoId}_${timeRange}_${wordCount}words_${titleWords}.txt`;
            
            // Убедимся, что имя файла не слишком длинное
            return fileName.length > 200 ? `transcript_${videoId}_${Date.now()}.txt` : fileName;
        },
        
        formatTranscript(item) {
            let header = `📹 Видео: ${item.metadata.videoTitle || 'Неизвестно'}\n`;
            header += `👤 Канал: ${item.metadata.channelName || 'Неизвестно'}\n`;
            header += `📅 Дата: ${item.metadata.uploadDate || 'Неизвестно'}\n`;
            header += `🔗 Ссылка: ${item.metadata.videoUrl}\n`;
            header += `📝 Тип субтитров: ${item.kindName} (${item.lang})\n\n`;
            
            if (item.transcript.startTime && item.transcript.endTime) {
                const totalSeconds = (item.transcript.endMs - item.transcript.startMs) / 1000;
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = Math.floor(totalSeconds % 60);
                header += `⏱️ Временной диапазон: с ${item.transcript.startTime} по ${item.transcript.endTime}\n`;
                header += `⏳ Длительность: ${minutes} мин ${seconds} сек\n\n`;
            }
            
            return header + item.transcript.text;
        },
        
        notify(message) {
            console.log(`[Store] ${message}`);
            const note = createSafeElement('div', {
                style: {
                    position: 'fixed', 
                    bottom: '20px', 
                    right: '20px',
                    background: '#333', 
                    color: 'white', 
                    padding: '10px 16px',
                    borderRadius: '4px', 
                    zIndex: '10001', 
                    fontSize: '14px',
                    animation: 'fadeIn 0.3s'
                }
            }, [message]);
            
            document.body.appendChild(note);
            setTimeout(() => {
                note.style.opacity = '0';
                note.style.transition = 'opacity 0.3s';
                setTimeout(() => note.remove(), 300);
            }, 2000);
        }
    };
}

const subtitlesStore = window._subtitlesStore;

// ===================== ПЕРЕХВАТЧИК =====================
function extractTranscriptWithTimestamps(data) {
    if (!data || !data.events) return { text: '', startTime: null, endTime: null };
    
    let fullText = '';
    let firstStartMs = null;
    let lastEndMs = 0;
    
    data.events.forEach(event => {
        if (event.segs) {
            const text = event.segs.map(seg => seg.utf8).join('');
            if (text.trim()) {
                const startMs = event.tStartMs || 0;
                const durationMs = event.dDurationMs || 0;
                
                if (firstStartMs === null || startMs < firstStartMs) firstStartMs = startMs;
                if (startMs + durationMs > lastEndMs) lastEndMs = startMs + durationMs;
                
                fullText += text + ' ';
            }
        }
    });
    
    const format = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    
    return {
        text: fullText.replace(/\s+/g, ' ').trim(),
        startTime: firstStartMs !== null ? format(firstStartMs) : null,
        endTime: lastEndMs > 0 ? format(lastEndMs) : null,
        startMs: firstStartMs,
        endMs: lastEndMs
    };
}

function extractVideoMetadata() {
    const metadata = {
        videoUrl: window.location.href,
        videoId: new URLSearchParams(window.location.search).get('v'),
        videoTitle: '',
        channelName: '',
        uploadDate: ''
    };
    
    try {
        const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1, title');
        if (title) metadata.videoTitle = title.textContent || title.innerText;
        
        const channel = document.querySelector('#owner #channel-name a, #upload-info #channel-name a');
        if (channel) metadata.channelName = channel.textContent || channel.innerText;
        
        const date = document.querySelector('#info-strings yt-formatted-string, #date yt-formatted-string');
        if (date) metadata.uploadDate = date.textContent || date.innerText;
    } catch(e) {
        console.warn('[YT Transcript Extractor] Не удалось извлечь метаданные:', e);
    }
    
    return metadata;
}

function setupInterceptors() {
    console.log('[YT Transcript Extractor] Настройка перехватчиков...');
    
    window._originalFetch = window.fetch;
    window._originalXHROpen = XMLHttpRequest.prototype.open;
    window._originalXHRSend = XMLHttpRequest.prototype.send;
    
    // Перехват fetch
    window.fetch = async function(...args) {
        const response = await window._originalFetch.apply(this, args);
        const url = args[0];
        
        if (typeof url === 'string' && url.includes('/api/timedtext') && url.includes('fmt=json3')) {
            try {
                const clone = response.clone();
                const data = await clone.json();
                processCapturedData(data, url);
            } catch(err) {
                console.error('[YT Transcript Extractor] Ошибка парсинга fetch:', err);
            }
        }
        
        return response;
    };
    
    // Перехват XMLHttpRequest
    XMLHttpRequest.prototype.open = function(...args) {
        this._url = args[1];
        return window._originalXHROpen.apply(this, args);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
        const url = this._url;
        
        if (url && url.includes('/api/timedtext') && url.includes('fmt=json3')) {
            const originalReady = this.onreadystatechange;
            
            this.onreadystatechange = function() {
                if (this.readyState === 4 && this.status === 200) {
                    try {
                        const data = JSON.parse(this.responseText);
                        processCapturedData(data, url);
                    } catch(e) {
                        console.error('[YT Transcript Extractor] Ошибка парсинга XHR:', e);
                    }
                }
                
                if (originalReady) originalReady.apply(this, arguments);
            };
        }
        
        return window._originalXHRSend.apply(this, args);
    };
    
    window._interceptorActive = true;
    console.log('[YT Transcript Extractor] Перехватчики настроены');
}

function processCapturedData(data, url) {
    if (!data || !data.events) return;
    
    const transcriptData = extractTranscriptWithTimestamps(data);
    if (!transcriptData.text) return;
    
    const metadata = extractVideoMetadata();
    const item = window._subtitlesStore.add(transcriptData, metadata, url);
    
    console.log(`[YT Transcript Extractor] ✓ Перехвачено: ${item.kindName} (${item.lang}), ${transcriptData.text.length} символов`);
    console.log(`    Диапазон: ${transcriptData.startTime || '?'} - ${transcriptData.endTime || '?'}`);
    console.log(`    URL: ${url.substring(0, 80)}...`);
}

// ===================== УПРАВЛЕНИЕ =====================
function setupDragAndResize(container) {
    let dragging = false, resizing = false;
    let startX, startY, startW, startH, startL, startT;
    
    const header = container.querySelector('.ytt-header');
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ytt-controls')) return;
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        startL = container.offsetLeft; startT = container.offsetTop;
        e.preventDefault();
    });
    
    container.addEventListener('mousedown', (e) => {
        if (e.offsetX > container.offsetWidth - 15 && e.offsetY > container.offsetHeight - 15) {
            resizing = true;
            startX = e.clientX; startY = e.clientY;
            startW = container.offsetWidth; startH = container.offsetHeight;
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (dragging) {
            container.style.left = Math.max(0, Math.min(startL + e.clientX - startX, window.innerWidth - container.offsetWidth)) + 'px';
            container.style.top = Math.max(0, Math.min(startT + e.clientY - startY, window.innerHeight - container.offsetHeight)) + 'px';
        }
        if (resizing) {
            container.style.width = Math.max(480, startW + e.clientX - startX) + 'px';
            container.style.height = Math.max(350, startH + e.clientY - startY) + 'px';
        }
    });
    
    document.addEventListener('mouseup', () => { dragging = false; resizing = false; });
}

window.startTranscriptExtractor = function() {
    console.log('[YT Transcript Extractor] ▶️ Запуск перехвата...');
    
    const status = document.getElementById('ytt-status-text');
    const startBtn = document.getElementById('ytt-start-btn');
    const stopBtn = document.getElementById('ytt-stop-btn');
    
    if (status) {
        status.textContent = '▶️ Активен';
        status.style.color = '#4CAF50';
    }
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
    }
    if (stopBtn) {
        stopBtn.disabled = false;
        stopBtn.style.opacity = '1';
        stopBtn.style.cursor = 'pointer';
    }
    
    setupInterceptors();
    window._subtitlesStore.notify('🎯 Перехватчик активен. Включите субтитры.');
};

window.stopTranscriptExtractor = function() {
    console.log('[YT Transcript Extractor] ⏹️ Остановка перехвата...');
    
    if (window._originalFetch) window.fetch = window._originalFetch;
    if (window._originalXHROpen) XMLHttpRequest.prototype.open = window._originalXHROpen;
    if (window._originalXHRSend) XMLHttpRequest.prototype.send = window._originalXHRSend;
    
    delete window._originalFetch;
    delete window._originalXHROpen;
    delete window._originalXHRSend;
    window._interceptorActive = false;
    
    const status = document.getElementById('ytt-status-text');
    const startBtn = document.getElementById('ytt-start-btn');
    const stopBtn = document.getElementById('ytt-stop-btn');
    
    if (status) {
        status.textContent = '⏸️ Остановлен';
        status.style.color = '#f44336';
    }
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
    }
    if (stopBtn) {
        stopBtn.disabled = true;
        stopBtn.style.opacity = '0.5';
        stopBtn.style.cursor = 'not-allowed';
    }
    
    window._subtitlesStore.notify('⏹️ Перехватчик остановлен');
};

// ===================== АВТОЗАПУСК =====================
(function init() {
    console.log('[YT Transcript Extractor] Загрузка v7.5 (эталон)...');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUI);
    } else {
        createUI();
    }
})();