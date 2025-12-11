// ============= WORK 11.dec.25 Web Desctop =============
// ============= Функция для запуска выкачки транскрипта =============

// Ютуб блокирует внедрение классов - все только на функциях.
// При нажатиин а СС - всегда происходит ловля даже если сабы уже были включены раньше
// Кастом язык - выбирается в настройках видео и тоже перехватит.
// Позже будет версия с интерфейсом

// Создано для ручного парсинга длинных видео для дальшейшего обучения нейронок на них.
// Вставил лекцию по ХХХ на 3 чата = нейронка уже разбирается и шарит. Но тут расчет на десятки часов узкопрофильной инфы.

// ===================== УТИЛИТЫ =====================
function extractTranscriptWithTimestamps(data) {
    if (!data || !data.events) return { text: '', startTime: null, endTime: null };

    let fullText = '';
    let firstStartMs = null;
    let lastEndMs = 0;

    data.events.forEach(event => {
        if (event.segs) {
            const segmentText = event.segs.map(seg => seg.utf8).join('');
            if (segmentText.trim()) {
                const startMs = event.tStartMs || 0;
                if (firstStartMs === null || startMs < firstStartMs) {
                    firstStartMs = startMs;
                }
                
                const durationMs = event.dDurationMs || 0;
                const endMs = startMs + durationMs;
                if (endMs > lastEndMs) {
                    lastEndMs = endMs;
                }
                
                fullText += segmentText + ' ';
            }
        }
    });

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return {
        text: fullText.replace(/\s+/g, ' ').trim(),
        startTime: firstStartMs !== null ? formatTime(firstStartMs) : null,
        endTime: lastEndMs > 0 ? formatTime(lastEndMs) : null,
        startMs: firstStartMs,
        endMs: lastEndMs
    };
}

function extractVideoMetadata() {
    const metadata = {
        videoUrl: window.location.href,
        videoTitle: '',
        channelName: '',
        uploadDate: ''
    };

    try {
        // Название видео
        const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') || 
                            document.querySelector('#title h1') ||
                            document.querySelector('title');
        if (titleElement) {
            metadata.videoTitle = titleElement.textContent || titleElement.innerText;
        }

        // Название канала
        const channelElement = document.querySelector('#owner #channel-name a') ||
                              document.querySelector('#upload-info #channel-name a') ||
                              document.querySelector('ytd-video-owner-renderer #channel-name a');
        if (channelElement) {
            metadata.channelName = channelElement.textContent || channelElement.innerText;
        }

        // Дата публикации
        const dateElement = document.querySelector('#info-strings yt-formatted-string') ||
                           document.querySelector('#date yt-formatted-string');
        if (dateElement) {
            metadata.uploadDate = dateElement.textContent || dateElement.innerText;
        }

        const metaDate = document.querySelector('meta[itemprop="datePublished"]');
        if (metaDate && metaDate.content) {
            metadata.uploadDate = metaDate.content;
        }

    } catch (e) {
        console.warn('Не удалось извлечь часть метаданных:', e);
    }

    return metadata;
}

function formatTranscriptWithMetadata(transcriptData, metadata) {
    let header = `📹 Видео: ${metadata.videoTitle || 'Неизвестно'}\n`;
    header += `👤 Канал: ${metadata.channelName || 'Неизвестно'}\n`;
    header += `📅 Дата: ${metadata.uploadDate || 'Неизвестно'}\n`;
    header += `🔗 Ссылка: ${metadata.videoUrl}\n\n`;

    let timeInfo = '';
    if (transcriptData.startTime && transcriptData.endTime) {
        const totalSeconds = (transcriptData.endMs - transcriptData.startMs) / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        timeInfo = `⏱️  Временной диапазон текста: с ${transcriptData.startTime} по ${transcriptData.endTime}\n`;
        timeInfo += `⏳ Длительность текста: ${minutes} мин ${seconds} сек\n\n`;
    }

    return header + timeInfo + transcriptData.text;
}

function logResults(transcriptData, metadata) {
    console.log('='.repeat(60));
    console.log('🎉 ТРАНСКРИПТ УСПЕШНО ПЕРЕХВАЧЕН');
    console.log('='.repeat(60));
    console.log(`📹 Видео: ${metadata.videoTitle}`);
    console.log(`👤 Канал: ${metadata.channelName}`);
    console.log(`📅 Дата: ${metadata.uploadDate}`);
    
    if (transcriptData.startTime && transcriptData.endTime) {
        const totalSeconds = (transcriptData.endMs - transcriptData.startMs) / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        console.log(`⏱️  Диапазон: ${transcriptData.startTime} - ${transcriptData.endTime}`);
        console.log(`⏳ Длительность: ${minutes} мин ${seconds} сек`);
    }
    
    console.log(`📏 Символов: ${transcriptData.text.length}`);
    console.log('='.repeat(60));
}

// ===================== ПЕРЕХВАТЧИК =====================
let transcriptFound = false;
let originalFetch = null;
let originalXHROpen = null;
let originalXHRSend = null;

function shouldIntercept(url) {
    return typeof url === 'string' && 
           url.includes('/api/timedtext') && 
           url.includes('fmt=json3') && 
           !transcriptFound;
}

async function processTranscriptData(data) {
    const transcriptData = extractTranscriptWithTimestamps(data);
    
    if (!transcriptData.text) {
        console.warn('Перехваченный ответ не содержит текста.');
        return;
    }

    transcriptFound = true;
    
    // Получаем метаданные
    const metadata = extractVideoMetadata();
    
    // Форматируем финальный текст
    const finalText = formatTranscriptWithMetadata(transcriptData, metadata);
    
    // Вывод в консоль
    logResults(transcriptData, metadata);
    
    // Копирование в буфер
    try {
        await navigator.clipboard.writeText(finalText);
        console.log('📋 Текст с метаинформацией скопирован в буфер!');
        alert('✅ Транскрипт перехвачен и скопирован!\nТекст содержит метаданные видео.');
    } catch (err) {
        console.error('Ошибка копирования:', err);
    }
}

// Настройка перехватчика fetch
function setupFetchInterceptor() {
    originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
        const url = args[0];
        const response = await originalFetch.apply(this, args);

        if (shouldIntercept(url)) {
            try {
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();
                await processTranscriptData(data);
            } catch (err) {
                console.error('Ошибка обработки ответа:', err);
            }
        }

        return response;
    };
}

// Настройка перехватчика XMLHttpRequest
function setupXHRInterceptor() {
    originalXHROpen = XMLHttpRequest.prototype.open;
    originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(...args) {
        this._interceptorUrl = args[1];
        return originalXHROpen.apply(this, args);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        if (this._interceptorUrl && shouldIntercept(this._interceptorUrl)) {
            const originalOnReadyStateChange = this.onreadystatechange;
            
            this.onreadystatechange = function() {
                if (this.readyState === 4 && this.status === 200 && !transcriptFound) {
                    try {
                        const data = JSON.parse(this.responseText);
                        processTranscriptData(data);
                    } catch (e) {
                        // Игнорируем ошибки парсинга
                    }
                }
                
                if (originalOnReadyStateChange) {
                    return originalOnReadyStateChange.apply(this, arguments);
                }
            };
        }
        
        return originalXHRSend.apply(this, args);
    };
}

// ===================== ГЛАВНАЯ ФУНКЦИЯ =====================
function startTranscriptExtractor() {
    console.clear();
    console.log('🔍 YouTube Transcript Interceptor активирован');
    console.log('Инструкция:');
    console.log('1. Включите субтитры (CC) на панели плеера');
    console.log('2. Или перезагрузите страницу с уже включенными субтитрами');
    console.log('3. Скрипт автоматически перехватит транскрипт');
    console.log('='.repeat(40));

    transcriptFound = false;
    setupFetchInterceptor();
    setupXHRInterceptor();
}

// Запуск скрипта (вставьте в консоль):
startTranscriptExtractor();