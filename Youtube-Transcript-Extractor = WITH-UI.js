// ============= WORK 11.dec.25 Web Desctop =============
// ============= Функция для запуска выкачки транскрипта =============

// Ютуб блокирует внедрение классов - все только на функциях.
// При нажатиин а СС - всегда происходит ловля даже если сабы уже были включены раньше
// Кастом язык - выбирается в настройках видео и тоже перехватит.
// Позже будет версия с интерфейсом

// Создано для ручного парсинга длинных видео для дальшейшего обучения нейронок на них.
// Вставил лекцию по ХХХ на 3 чата = нейронка уже разбирается и шарит. Но тут расчет на десятки часов узкопрофильной инфы.

// ===================== ХРАНИЛИЩЕ ДАННЫХ (ИСПРАВЛЕННОЕ) =====================
// Гарантируем единственный экземпляр хранилища
if (!window._subtitlesStore) {
    window._subtitlesStore = {
        items: [],
        
        add(transcriptData, metadata, url) {
            console.log('[Store] Добавление субтитров, элементов до:', this.items.length);
            
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
            
            console.log('[Store] Элементов после:', this.items.length);
            this.updateUI();
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
            console.log('[Store] Обновление UI, поиск ytt-table-body...');
            const tableBody = document.getElementById('ytt-table-body');
            
            if (!tableBody) {
                console.error('[Store] Элемент ytt-table-body не найден!');
                return;
            }
            
            console.log('[Store] Элемент найден, очистка...');
            // Безопасная очистка
            while (tableBody.firstChild) {
                tableBody.removeChild(tableBody.firstChild);
            }
            
            if (this.items.length === 0) {
                console.log('[Store] Нет элементов, показ пустого сообщения');
                const emptyMsg = createSafeElement('div', {
                    style: {
                        padding: '20px',
                        textAlign: 'center',
                        color: '#888',
                        fontStyle: 'italic',
                        fontSize: '13px'
                    }
                }, ['Нет перехваченных субтитров']);
                tableBody.appendChild(emptyMsg);
                return;
            }
            
            console.log('[Store] Отрисовка', this.items.length, 'элементов');
            this.items.forEach((item, index) => {
                console.log(`[Store] Отрисовка элемента ${index}: ${item.kindName} (${item.lang})`);
                
                const row = createSafeElement('div', {
                    style: {
                        display: 'grid',
                        gridTemplateColumns: '35% 15% 20% 30%',
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
                
                // Действия
                const actionsCell = createSafeElement('div', {
                    style: { display: 'flex', gap: '4px', flexWrap: 'wrap' }
                });
                
                const actions = [
                    { text: '📋', title: 'Скопировать с метаданными', action: () => this.copyFull(item.id) },
                    { text: '📝', title: 'Только текст', action: () => this.copyText(item.id) },
                    { text: '💾', title: 'Скачать файл', action: () => this.download(item.id) },
                    { text: '🗑️', title: 'Удалить', action: () => this.remove(item.id) }
                ];
                
                actions.forEach(btn => {
                    const button = createSafeElement('button', {
                        style: {
                            background: '#555', color: 'white', border: 'none',
                            borderRadius: '3px', cursor: 'pointer', padding: '4px 8px',
                            fontSize: '11px'
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
            
            console.log('[Store] UI обновлен');
        },
        
        // Остальные методы остаются без изменений...
        getLanguageName(code) {
            const languages = { 'ru': 'Русский', 'en': 'Английский', 'es': 'Испанский' };
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
                download: `transcript_${item.metadata.videoId || Date.now()}.txt`,
                style: { display: 'none' }
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.notify('💾 Файл скачан');
        },
        
        formatTranscript(item) {
            let header = `Видео: ${item.metadata.videoTitle || 'Неизвестно'}\n`;
            header += `Канал: ${item.metadata.channelName || 'Неизвестно'}\n`;
            header += `Дата: ${item.metadata.uploadDate || 'Неизвестно'}\n`;
            header += `Ссылка: ${item.metadata.videoUrl}\n`;
            header += `Тип субтитров: ${item.kindName} (${item.lang})\n\n`;
            
            if (item.transcript.startTime && item.transcript.endTime) {
                const totalSeconds = (item.transcript.endMs - item.transcript.startMs) / 1000;
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = Math.floor(totalSeconds % 60);
                header += `Время: ${item.transcript.startTime}-${item.transcript.endTime} (${minutes} мин ${seconds} сек)\n\n`;
            }
            
            return header + item.transcript.text;
        },
        
        notify(message) {
            console.log(`[Store] ${message}`);
            const note = createSafeElement('div', {
                style: {
                    position: 'fixed', bottom: '20px', right: '20px',
                    background: '#333', color: 'white', padding: '10px 16px',
                    borderRadius: '4px', zIndex: '10001', fontSize: '14px',
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

// Глобальная ссылка для удобства
const subtitlesStore = window._subtitlesStore;