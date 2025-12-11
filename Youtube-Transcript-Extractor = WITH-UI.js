// ============= WORK 11.dec.25 Web Desctop =============
// ============= Функция для запуска выкачки транскрипта =============

// Ютуб блокирует внедрение классов - все только на функциях.
// При нажатиин а СС - всегда происходит ловля даже если сабы уже были включены раньше
// Кастом язык - выбирается в настройках видео и тоже перехватит.
// Позже будет версия с интерфейсом

// Создано для ручного парсинга длинных видео для дальшейшего обучения нейронок на них.
// Вставил лекцию по ХХХ на 3 чата = нейронка уже разбирается и шарит. Но тут расчет на десятки часов узкопрофильной инфы.

// v7.6
// ===================== ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ =====================
(function() {
    console.log('[YT Transcript Extractor] Инициализация v7.6...');
    
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

// ===================== ОБЩИЕ УТИЛИТЫ =====================
function getVideoDuration() {
    // Пытаемся получить длительность видео со страницы
    try {
        // YouTube хранит длительность в секундах в meta-теге
        const durationMeta = document.querySelector('meta[itemprop="duration"]');
        if (durationMeta && durationMeta.content) {
            const durationStr = durationMeta.content.replace('PT', '');
            let totalSeconds = 0;
            
            // Парсим формат PT1H2M3S
            const hoursMatch = durationStr.match(/(\d+)H/);
            const minutesMatch = durationStr.match(/(\d+)M/);
            const secondsMatch = durationStr.match(/(\d+)S/);
            
            if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
            if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
            if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);
            
            return totalSeconds;
        }
        
        // Альтернативный способ: из элемента плеера
        const timeElement = document.querySelector('.ytp-time-duration');
        if (timeElement && timeElement.textContent) {
            const timeParts = timeElement.textContent.split(':').map(Number);
            if (timeParts.length === 3) {
                return timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
            } else if (timeParts.length === 2) {
                return timeParts[0] * 60 + timeParts[1];
            }
        }
    } catch (e) {
        console.warn('[YT Transcript Extractor] Не удалось получить длительность видео:', e);
    }
    
    return 0; // По умолчанию
}

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function createUI() {
    console.log('[YT Transcript Extractor] Создание UI v7.6...');
    
    // Уменьшенный и адаптивный интерфейс
    const uiContainer = createSafeElement('div', {
        id: 'youtube-transcript-ui',
        style: {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '520px', // Уменьшено с 540px
            height: '380px', // Уменьшено с 400px
            minWidth: '450px',
            minHeight: '320px',
            maxWidth: '800px',
            maxHeight: '600px',
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
            padding: '10px 14px', // Уменьшен padding
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'move',
            userSelect: 'none',
            flexShrink: '0'
        }
    });
    
    const headerText = createSafeElement('div', {
        class: 'ytt-drag-handle',
        style: { 
            fontWeight: '600', 
            fontSize: '13px', // Уменьшен шрифт
            color: '#fff',
            whiteSpace: 'nowrap'
        }
    }, ['🎯 YT Transcript Extractor v7.6']);
    
    const controls = createSafeElement('div', { 
        class: 'ytt-controls', 
        style: { 
            display: 'flex', 
            gap: '3px' // Уменьшен gap
        } 
    });
    
    const minimizeBtn = createSafeElement('button', {
        id: 'ytt-minimize',
        style: {
            background: 'none', 
            border: 'none', 
            color: '#aaa', 
            cursor: 'pointer',
            fontSize: '16px', // Уменьшен шрифт
            width: '22px', 
            height: '22px', 
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        onclick: () => uiContainer.classList.toggle('ytt-minimized')
    }, ['−']);
    
    const closeBtn = createSafeElement('button', {
        id: 'ytt-close',
        style: {
            background: 'none', 
            border: 'none', 
            color: '#aaa', 
            cursor: 'pointer',
            fontSize: '16px', 
            width: '22px', 
            height: '22px', 
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
            padding: '12px 14px', // Уменьшен padding
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: '0' // Важно для корректного сжатия
        }
    });
    
    // Status section
    const statusSection = createSafeElement('div', {
        style: { 
            marginBottom: '12px', // Уменьшен margin
            flexShrink: '0'
        }
    });
    
    const status = createSafeElement('div', {
        style: { 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', // Уменьшен gap
            marginBottom: '6px', 
            fontSize: '13px' // Уменьшен шрифт
        }
    });
    
    status.appendChild(createSafeElement('span', {}, ['Статус:']));
    const statusText = createSafeElement('span', {
        id: 'ytt-status-text',
        style: { 
            color: '#f44336', 
            fontWeight: '600',
            fontSize: '12px'
        }
    }, ['⏸️ Остановлен']);
    status.appendChild(statusText);
    
    // Buttons
    const buttons = createSafeElement('div', {
        style: { 
            display: 'flex', 
            gap: '6px' // Уменьшен gap
        }
    });
    
    const startBtn = createSafeElement('button', {
        id: 'ytt-start-btn',
        style: {
            background: '#2196F3', 
            color: 'white', 
            padding: '6px 12px', // Уменьшен padding
            border: 'none',
            borderRadius: '4px', 
            cursor: 'pointer', 
            fontSize: '12px', // Уменьшен шрифт
            fontWeight: '500', 
            flex: '1',
            whiteSpace: 'nowrap'
        },
        onclick: startTranscriptExtractor
    }, ['▶️ Запуск перехвата']);
    
    const stopBtn = createSafeElement('button', {
        id: 'ytt-stop-btn',
        style: {
            background: '#555', 
            color: 'white', 
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px', 
            cursor: 'not-allowed', 
            fontSize: '12px',
            fontWeight: '500', 
            flex: '1', 
            opacity: '0.5',
            whiteSpace: 'nowrap'
        },
        disabled: true,
        onclick: stopTranscriptExtractor
    }, ['⏹️ Остановить']);
    
    buttons.appendChild(startBtn);
    buttons.appendChild(stopBtn);
    
    // Info
    const info = createSafeElement('div', {
        style: { 
            fontSize: '11px', // Уменьшен шрифт
            color: '#aaa', 
            marginBottom: '10px',
            flexShrink: '0'
        }
    }, ['Инструкция: включите субтитры (CC) на видео']);
    
    statusSection.appendChild(status);
    statusSection.appendChild(buttons);
    statusSection.appendChild(info);
    
    // Table container - ГИБКАЯ ВЫСОТА
    const tableContainer = createSafeElement('div', {
        id: 'ytt-table-container',
        style: {
            flex: '1 1 auto', // Гибкий размер
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #333',
            borderRadius: '4px',
            minHeight: '100px' // Минимальная высота
        }
    });
    
    // ОБНОВЛЕННЫЕ КОЛОНКИ ТАБЛИЦЫ
    const tableHeader = createSafeElement('div', {
        style: {
            background: '#252525',
            padding: '6px 10px', // Уменьшен padding
            borderBottom: '1px solid #333',
            fontSize: '11px', // Уменьшен шрифт
            fontWeight: '600',
            display: 'grid',
            // НОВЫЕ КОЛОНКИ: Тип, Канал, Длит.видео, Название, Симв., Слов, Время, Действия
            gridTemplateColumns: '14% 12% 10% 18% 8% 8% 12% 18%',
            gap: '4px', // Уменьшен gap
            alignItems: 'center',
            textAlign: 'center', // Центрирование
            flexShrink: '0'
        }
    });
    
    // Заголовки с центрированием
    ['Тип', 'Канал', 'Длит.', 'Название', 'Симв.', 'Слов', 'Время', 'Действия'].forEach(text => {
        const headerCell = createSafeElement('div', {
            style: {
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }
        }, [text]);
        tableHeader.appendChild(headerCell);
    });
    
    const tableBody = createSafeElement('div', {
        id: 'ytt-table-body',
        style: {
            flex: '1 1 auto', // Гибкий размер
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: '40px'
        }
    });
    
    const emptyMessage = createSafeElement('div', {
        style: {
            padding: '15px', // Уменьшен padding
            textAlign: 'center',
            color: '#888',
            fontStyle: 'italic',
            fontSize: '12px', // Уменьшен шрифт
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
    
    return uiContainer;
}

// ===================== ХРАНИЛИЩЕ ДАННЫХ =====================
if (!window._subtitlesStore) {
    window._subtitlesStore = {
        items: [],
        
        add(transcriptData, metadata, url) {
            console.log('[Store] Добавление субтитров...');
            
            const urlObj = new URL(url);
            const kind = urlObj.searchParams.get('kind') || 'unknown';
            const lang = urlObj.searchParams.get('lang') || 'unknown';
            
            let kindName = kind === 'asr' ? 'Авто' : 'Ручные';
            if (kind === 'translation') kindName = 'Перевод';
            
            // Получаем длительность видео
            const videoDuration = getVideoDuration();
            const formattedDuration = formatDuration(videoDuration);
            
            // Считаем слова
            const wordCount = transcriptData.text.split(/\s+/).filter(w => w.length > 0).length;
            
            // Начало названия (первые 2-3 слова)
            const titleStart = (metadata.videoTitle || '')
                .split(/\s+/)
                .slice(0, 3)
                .map(word => word.replace(/[<>:"/\\|?*]/g, ''))
                .filter(word => word.length > 0)
                .join(' ');
            
            // Короткое имя канала
            const shortChannel = (metadata.channelName || 'Unknown')
                .substring(0, 15)
                .trim();
            
            const id = Date.now() + Math.random();
            const item = {
                id,
                timestamp: new Date().toLocaleTimeString(),
                kind,
                kindName,
                lang,
                videoDuration: formattedDuration,
                wordCount,
                titleStart,
                shortChannel,
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
                        padding: '15px',
                        textAlign: 'center',
                        color: '#888',
                        fontStyle: 'italic',
                        fontSize: '12px',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }
                }, ['Нет перехваченных субтитров']));
                return;
            }
            
            this.items.forEach(item => {
                // СООТВЕТСТВУЕТ НОВОЙ СТРУКТУРЕ КОЛОНОК
                const row = createSafeElement('div', {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: '14% 12% 10% 18% 8% 8% 12% 18%',
                        gap: '4px',
                        padding: '6px 10px',
                        borderBottom: '1px solid #2a2a2a',
                        fontSize: '11px',
                        alignItems: 'center',
                        textAlign: 'center' // ЦЕНТРИРОВАНИЕ
                    }
                });
                
                // 1. Тип (язык + авто/ручные) - БЕЗ ДАТЫ ПЕРЕХВАТА
                const typeCell = createSafeElement('div');
                typeCell.appendChild(createSafeElement('div', {
                    style: { 
                        fontWeight: '500', 
                        marginBottom: '1px',
                        fontSize: '10px'
                    }
                }, [this.getLanguageName(item.lang)]));
                typeCell.appendChild(createSafeElement('div', {
                    style: { 
                        fontSize: '9px', 
                        color: item.kindName === 'Авто' ? '#4CAF50' : '#FF9800'
                    }
                }, [item.kindName]));
                
                // 2. Канал (сокращенный)
                const channelCell = createSafeElement('div', {
                    style: {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '10px'
                    },
                    title: item.metadata.channelName || 'Unknown'
                }, [item.shortChannel]);
                
                // 3. Длительность видео
                const durationCell = createSafeElement('div', {
                    style: { fontSize: '10px' }
                }, [item.videoDuration]);
                
                // 4. Начало названия
                const titleCell = createSafeElement('div', {
                    style: {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '10px'
                    },
                    title: item.metadata.videoTitle || 'Unknown'
                }, [item.titleStart]);
                
                // 5. Символы
                const charsCell = createSafeElement('div', {
                    style: { fontSize: '10px' }
                }, [item.transcript.text.length.toLocaleString()]);
                
                // 6. Слова
                const wordsCell = createSafeElement('div', {
                    style: { fontSize: '10px' }
                }, [item.wordCount.toLocaleString()]);
                
                // 7. Время (диапазон субтитров)
                const timeCell = createSafeElement('div', {
                    style: { fontSize: '10px' }
                }, [
                    item.transcript.startTime ? 
                    `${item.transcript.startTime}-${item.transcript.endTime}` : 
                    '?'
                ]);
                
                // 8. Действия (с новой кнопкой предпросмотра)
                const actionsCell = createSafeElement('div', {
                    style: { 
                        display: 'flex', 
                        gap: '3px', 
                        flexWrap: 'nowrap',
                        justifyContent: 'center'
                    }
                });
                
                const actions = [
                    { text: '👁️', title: 'Предпросмотр', action: () => this.preview(item.id) },
                    { text: '📋', title: 'Скопировать с метаданными', action: () => this.copyFull(item.id) },
                    { text: '📝', title: 'Только текст', action: () => this.copyText(item.id) },
                    { text: '💾', title: 'Скачать файл', action: () => this.download(item.id) },
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
                            padding: '3px 6px',
                            fontSize: '10px',
                            whiteSpace: 'nowrap',
                            flexShrink: '0',
                            minWidth: '24px'
                        },
                        title: btn.title,
                        onclick: btn.action
                    }, [btn.text]);
                    actionsCell.appendChild(button);
                });
                
                // Собираем строку
                row.appendChild(typeCell);
                row.appendChild(channelCell);
                row.appendChild(durationCell);
                row.appendChild(titleCell);
                row.appendChild(charsCell);
                row.appendChild(wordsCell);
                row.appendChild(timeCell);
                row.appendChild(actionsCell);
                
                tableBody.appendChild(row);
            });
        },
        
        // НОВЫЙ МЕТОД: ПРЕДПРОСМОТР
        preview(id) {
            const item = this.getItem(id);
            if (!item) return;
            
            const content = this.formatForPreview(item);
            const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank');
            
            if (newWindow) {
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
                this.notify('⚠️ Разрешите всплывающие окна для предпросмотра');
                URL.revokeObjectURL(url);
            }
        },
        
        formatForPreview(item) {
            return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.metadata.videoTitle || 'Транскрипт'} - Предпросмотр</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 18px;
        }
        .meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            font-size: 14px;
            color: #666;
        }
        .meta div {
            padding: 5px 0;
        }
        .transcript {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            white-space: pre-wrap;
            font-size: 15px;
            line-height: 1.8;
        }
        .type-badge {
            display: inline-block;
            padding: 2px 8px;
            background: ${item.kindName === 'Авто' ? '#4CAF50' : '#FF9800'};
            color: white;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${item.metadata.videoTitle || 'Неизвестно'} 
            <span class="type-badge">${item.kindName} (${item.lang})</span>
        </h1>
        <div class="meta">
            <div><strong>Канал:</strong> ${item.metadata.channelName || 'Неизвестно'}</div>
            <div><strong>Дата:</strong> ${item.metadata.uploadDate || 'Неизвестно'}</div>
            <div><strong>Длительность видео:</strong> ${item.videoDuration}</div>
            <div><strong>Символов:</strong> ${item.transcript.text.length.toLocaleString()}</div>
            <div><strong>Слов:</strong> ${item.wordCount.toLocaleString()}</div>
            <div><strong>Диапазон субтитров:</strong> ${item.transcript.startTime || '?'} - ${item.transcript.endTime || '?'}</div>
        </div>
        <div style="margin-top: 10px; font-size: 13px;">
            <strong>Ссылка:</strong> <a href="${item.metadata.videoUrl}" target="_blank">${item.metadata.videoUrl}</a>
        </div>
    </div>
    <div class="transcript">${item.transcript.text}</div>
</body>
</html>`;
        },
        
        getLanguageName(code) {
            const languages = { 
                'ru': 'RU', 'en': 'EN', 'es': 'ES', 'fr': 'FR', 
                'de': 'DE', 'ja': 'JA', 'zh': 'ZH', 'ko': 'KO'
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
                download: this.generateFileName(item),
                style: { display: 'none' }
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.notify('💾 Файл скачан');
        },
        
        // ИСПРАВЛЕННОЕ ИМЯ ФАЙЛА
        generateFileName(item) {
            // 1. Канал
            const cleanChannel = (item.metadata.channelName || 'Unknown')
                .replace(/[<>:"/\\|?*]/g, '')
                .substring(0, 30)
                .trim()
                .replace(/\s+/g, '_');
            
            // 2. Дата из метаданных (не дата перехвата)
            let cleanDate = 'nodate';
            if (item.metadata.uploadDate) {
                // Пытаемся извлечь дату из строки
                const dateMatch = item.metadata.uploadDate.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
                if (dateMatch) {
                    cleanDate = dateMatch[0].replace(/[/]/g, '-');
                } else {
                    // Если не нашли дату, используем текущую
                    const now = new Date();
                    cleanDate = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                }
            }
            
            // 3. ID видео
            const videoId = item.metadata.videoId || 'noid';
            
            // 4. ОБЩАЯ ДЛИТЕЛЬНОСТЬ ВИДЕО (вместо диапазона субтитров)
            const duration = item.videoDuration.replace(/:/g, '-');
            
            // 5. Количество слов
            const wordCount = item.wordCount;
            
            // 6. Начало названия
            const titleStart = item.titleStart.replace(/\s+/g, '_');
            
            // Собираем: канал_дата_ид_длительность_слов_название.txt
            const fileName = `${cleanChannel}_${cleanDate}_${videoId}_${duration}_${wordCount}words_${titleStart}.txt`;
            
            return fileName.length > 200 ? 
                `transcript_${videoId}_${Date.now()}.txt` : 
                fileName.replace(/[<>:"/\\|?*]/g, '');
        },
        
        formatTranscript(item) {
            let header = `📹 Видео: ${item.metadata.videoTitle || 'Неизвестно'}\n`;
            header += `👤 Канал: ${item.metadata.channelName || 'Неизвестно'}\n`;
            header += `📅 Дата: ${item.metadata.uploadDate || 'Неизвестно'}\n`;
            header += `⏱️ Длительность видео: ${item.videoDuration}\n`;
            header += `🔗 Ссылка: ${item.metadata.videoUrl}\n`;
            header += `📝 Тип субтитров: ${item.kindName} (${item.lang})\n`;
            header += `📊 Символов: ${item.transcript.text.length.toLocaleString()}\n`;
            header += `📊 Слов: ${item.wordCount.toLocaleString()}\n`;
            
            if (item.transcript.startTime && item.transcript.endTime) {
                const totalSeconds = (item.transcript.endMs - item.transcript.startMs) / 1000;
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = Math.floor(totalSeconds % 60);
                header += `⏱️ Диапазон субтитров: с ${item.transcript.startTime} по ${item.transcript.endTime} (${minutes} мин ${seconds} сек)\n`;
            }
            
            header += '\n'.repeat(2);
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
                    fontSize: '13px',
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

// ===================== ПЕРЕХВАТЧИК (БЕЗ ИЗМЕНЕНИЙ) =====================
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

// ===================== УПРАВЛЕНИЕ UI =====================
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
    
    // Ресайз со всех сторон
    container.addEventListener('mousedown', (e) => {
        const handleSize = 8;
        const isLeft = e.offsetX <= handleSize;
        const isRight = e.offsetX >= container.offsetWidth - handleSize;
        const isTop = e.offsetY <= handleSize;
        const isBottom = e.offsetY >= container.offsetHeight - handleSize;
        
        if (isRight || isBottom || (isLeft && isTop) || (isRight && isTop) || (isLeft && isBottom) || (isRight && isBottom)) {
            resizing = true;
            startX = e.clientX; 
            startY = e.clientY;
            startW = container.offsetWidth; 
            startH = container.offsetHeight;
            startL = container.offsetLeft;
            startT = container.offsetTop;
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (dragging) {
            container.style.left = Math.max(0, Math.min(startL + e.clientX - startX, window.innerWidth - container.offsetWidth)) + 'px';
            container.style.top = Math.max(0, Math.min(startT + e.clientY - startY, window.innerHeight - container.offsetHeight)) + 'px';
        }
        if (resizing) {
            const newWidth = Math.max(450, Math.min(800, startW + e.clientX - startX));
            const newHeight = Math.max(320, Math.min(600, startH + e.clientY - startY));
            
            container.style.width = newWidth + 'px';
            container.style.height = newHeight + 'px';
        }
    });
    
    document.addEventListener('mouseup', () => { 
        dragging = false; 
        resizing = false; 
    });
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
    console.log('[YT Transcript Extractor] Загрузка v7.6...');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUI);
    } else {
        createUI();
    }
})();