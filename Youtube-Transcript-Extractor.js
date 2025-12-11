// ============= WORK 11.dec.25 Web Desctop =============

// ============= Функция для запуска выкачки транскрипта =============
function startTranscriptExtractor() {
    // Функция для извлечения текста и временных меток из формата json3
    function extractTranscriptWithTimestamps(data) {
        if (!data || !data.events) return { text: '', startTime: null, endTime: null };

        let fullText = '';
        let firstStartMs = null;
        let lastEndMs = 0;

        data.events.forEach(event => {
            if (event.segs) {
                const segmentText = event.segs.map(seg => seg.utf8).join('');
                if (segmentText.trim()) {
                    // Находим самую раннюю временную метку начала
                    const startMs = event.tStartMs || 0;
                    if (firstStartMs === null || startMs < firstStartMs) {
                        firstStartMs = startMs;
                    }
                    
                    // Находим самую позднюю временную метку конца
                    const durationMs = event.dDurationMs || 0;
                    const endMs = startMs + durationMs;
                    if (endMs > lastEndMs) {
                        lastEndMs = endMs;
                    }
                    
                    fullText += segmentText + ' ';
                }
            }
        });

        // Форматируем общее время для вывода
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

    // Функция для извлечения метаинформации о видео со страницы
    function extractVideoMetadata() {
        const metadata = {
            videoUrl: window.location.href,
            videoTitle: '',
            channelName: '',
            uploadDate: ''
        };

        try {
            // Ищем данные в разных местах (структура YouTube может меняться)
            const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') || 
                                document.querySelector('#title h1') ||
                                document.querySelector('title');
            if (titleElement) {
                metadata.videoTitle = titleElement.textContent || titleElement.innerText;
            }

            const channelElement = document.querySelector('#owner #channel-name a') ||
                                  document.querySelector('#upload-info #channel-name a') ||
                                  document.querySelector('ytd-video-owner-renderer #channel-name a');
            if (channelElement) {
                metadata.channelName = channelElement.textContent || channelElement.innerText;
            }

            // Дату публикации может быть сложнее найти, пробуем несколько вариантов
            const dateElement = document.querySelector('#info-strings yt-formatted-string') ||
                               document.querySelector('#date yt-formatted-string') ||
                               document.querySelector('span[itemprop="datePublished"]');
            if (dateElement) {
                metadata.uploadDate = dateElement.textContent || dateElement.innerText;
            }

            // Альтернативный способ: ищем в structured data
            const metaDate = document.querySelector('meta[itemprop="datePublished"]');
            if (metaDate && metaDate.content) {
                metadata.uploadDate = metaDate.content;
            }

        } catch (e) {
            console.warn('Не удалось извлечь часть метаданных:', e);
        }

        return metadata;
    }

    // Основная асинхронная функция для перехвата
    async function setupInterceptor() {
        console.clear();
        console.log('?? Ожидаю, когда YouTube загрузит транскрипт...\n1. Включите субтитры (CC) на панели плеера.\n2. Или перезагрузите страницу с уже включенными субтитрами.');

        const originalFetch = window.fetch;
        let transcriptFound = false;

        window.fetch = async function (...args) {
            const url = args[0];
            const response = await originalFetch.apply(this, args);

            // Если это наш целевой запрос и мы еще не обрабатывали его
            if (typeof url === 'string' && url.includes('/api/timedtext') && url.includes('fmt=json3') && !transcriptFound) {
                console.log('? Перехвачен запрос транскрипта от YouTube');

                try {
                    // Клонируем ответ, чтобы не нарушить оригинальный поток данных
                    const clonedResponse = response.clone();
                    const data = await clonedResponse.json();

                    // Извлекаем полный текст с временными метками
                    const { text, startTime, endTime, startMs, endMs } = extractTranscriptWithTimestamps(data);

                    if (text) {
                        transcriptFound = true;
                        
                        // Получаем метаданные о видео
                        const metadata = extractVideoMetadata();
                        
                        console.log('='.repeat(60));
                        console.log('?? ПОЛНЫЙ ТЕКСТ ТРАНСКРИПТА (перехвачен):');
                        console.log('='.repeat(60));
                        console.log(text);
                        console.log('='.repeat(60));
                        
                        // Выводим информацию о временном диапазоне
                        let timeInfo = '';
                        if (startTime && endTime) {
                            const totalSeconds = (endMs - startMs) / 1000;
                            const minutes = Math.floor(totalSeconds / 60);
                            const seconds = Math.floor(totalSeconds % 60);
                            
                            console.log(`?? Символов: ${text.length}`);
                            console.log(`??  Временной диапазон текста: с ${startTime} по ${endTime}`);
                            console.log(`? Длительность текста: ${minutes} мин ${seconds} сек`);
                            console.log(`?? Начинается в: ${Math.floor(startMs/1000)} секунд, заканчивается в: ${Math.floor(endMs/1000)} секунд`);
                            
                            timeInfo = `??  Временной диапазон текста: с ${startTime} по ${endTime}\n? Длительность текста: ${minutes} мин ${seconds} сек\n\n`;
                        } else {
                            console.log(`?? Символов: ${text.length}`);
                            console.log('??  Временные метки не найдены в ответе');
                        }

                        // Формируем финальный текст для копирования с метаинформацией
                        const finalText = `?? Видео: ${metadata.videoTitle || 'Неизвестно'}
?? Канал: ${metadata.channelName || 'Неизвестно'}
?? Дата: ${metadata.uploadDate || 'Неизвестно'}
?? Ссылка: ${metadata.videoUrl}

${timeInfo}${text}`;

                        // Копируем в буфер обмена
                        await navigator.clipboard.writeText(finalText);
                        console.log('?? Текст с метаинформацией скопирован в буфер обмена!');
                        alert(`? Транскрипт перехвачен и скопирован!\nСимволов: ${text.length}\nМетаданные добавлены в начало текста.`);
                    } else {
                        console.warn('Перехваченный ответ не содержит текста.');
                    }
                } catch (err) {
                    console.error('Ошибка при обработке перехваченного ответа:', err);
                }
            }
            // Всегда возвращаем оригинальный ответ, чтобы не сломать работу страницы
            return response;
        };

        // Для надежности также мониторим XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (...args) {
            this._url = args[1];
            return originalXHROpen.apply(this, args);
        };

        XMLHttpRequest.prototype.send = function (...args) {
            if (this._url && this._url.includes('/api/timedtext') && this._url.includes('fmt=json3') && !transcriptFound) {
                const originalOnReadyStateChange = this.onreadystatechange;
                
                this.onreadystatechange = function () {
                    if (this.readyState === 4 && this.status === 200 && !transcriptFound) {
                        try {
                            const data = JSON.parse(this.responseText);
                            const { text, startTime, endTime, startMs, endMs } = extractTranscriptWithTimestamps(data);
                            
                            if (text) {
                                transcriptFound = true;
                                console.log('? Перехвачен транскрипт через XMLHttpRequest!');
                                
                                // Получаем метаданные
                                const metadata = extractVideoMetadata();
                                
                                // Формируем время
                                let timeInfo = '';
                                if (startTime && endTime) {
                                    const totalSeconds = (endMs - startMs) / 1000;
                                    const minutes = Math.floor(totalSeconds / 60);
                                    const seconds = Math.floor(totalSeconds % 60);
                                    timeInfo = `??  Временной диапазон текста: с ${startTime} по ${endTime}\n? Длительность текста: ${minutes} мин ${seconds} сек\n\n`;
                                }
                                
                                // Формируем финальный текст
                                const finalText = `?? Видео: ${metadata.videoTitle || 'Неизвестно'}
?? Канал: ${metadata.channelName || 'Неизвестно'}
?? Дата: ${metadata.uploadDate || 'Неизвестно'}
?? Ссылка: ${metadata.videoUrl}

${timeInfo}${text}`;
                                
                                // Копирование в буфер
                                navigator.clipboard.writeText(finalText)
                                    .then(() => {
                                        console.log('?? Текст с метаинформацией скопирован в буфер обмена!');
                                        alert('? Транскрипт перехвачен и скопирован!');
                                    })
                                    .catch(err => console.error('Ошибка копирования:', err));
                            }
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

        console.log('?? Перехватчик активирован. Теперь включите субтитры на видео.');
    }

    // Запускаем перехватчик
    setupInterceptor();
}

// ============= ЗАПУСК СКРИПТА =============
// Просто вставьте эту строку в консоль браузера на странице YouTube:
startTranscriptExtractor();