
'use strict';

// ============================================================================
// 1. УПРАВЛЕНИЕ ЦВЕТОВОЙ ТЕМОЙ 
// Сохранение выбора пользователя в localStorage
// ============================================================================
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;

// Восстановление сохранённой темы при загрузке страницы
const savedTheme = localStorage.getItem('theme') || 'light';
root.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';

// Обработчик переключения темы
themeToggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    showToast('Тема изменена', 'info');
});

// ============================================================================
// 2. TOAST-УВЕДОМЛЕНИЯ 
// Информативные сообщения без аварийного завершения работы
// ============================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    // Автоматическое удаление через 3 секунды
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================================
// 3. ДИНАМИЧЕСКОЕ УПРАВЛЕНИЕ ПОЛЕМ КЛЮЧА 
// Скрытие/отображение поля в зависимости от алгоритма
// ============================================================================
const algorithmSelect = document.getElementById('algorithm');
const keyGroup = document.getElementById('keyGroup');
const keyInput = document.getElementById('key');

algorithmSelect.addEventListener('change', () => {
    const algo = algorithmSelect.value;
    if (algo === 'atbash') {
        // Для шифра Атбаш ключ не требуется 
        keyGroup.style.display = 'none';
        keyInput.value = '';
    } else {
        keyGroup.style.display = 'flex';
        keyInput.placeholder = getPlaceholder(algo);
    }
});

// Функция возврата подсказки для поля ключа
function getPlaceholder(algo) {
    switch (algo) {
        case 'caesar':  return 'Число (например, 3)';
        case 'vigenere': return 'Слово (например, КЛЮЧ)';
        case 'playfair': return 'Ключевое слово (кириллица или латиница)';
        case 'vernam':  return 'Секретная фраза';
        case 'rsa':     return 'Два простых числа через запятую (например, 37, 31)';
        case 'des':     return 'Строка (56 бит)';
        default:        return 'Введите ключ';
    }
}

// ============================================================================
// 4. ОБРАБОТКА ФАЙЛОВ 
// ============================================================================
const fileInput = document.getElementById('fileInput');
const inputText = document.getElementById('inputText');
const fileNameSpan = document.getElementById('fileName');
let currentFileName = '';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        showToast(`⚠️ Файл слишком большой (${sizeMB} МБ). Максимум 5 МБ. Обработка может занять время.`, 'error');
        // Не прерываем, но предупреждаем
    }
    
    // Сохраняем имя файла без расширения
    currentFileName = file.name.replace(/\.[^/.]+$/, '');
    fileNameSpan.textContent = `${file.name} (${formatFileSize(file.size)})`;

    // Показываем индикатор загрузки
    showToast(`📂 Чтение файла: ${file.name}...`, 'info');
    
    // Даём браузеру отрисовать UI перед операцией
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        if (file.name.toLowerCase().endsWith('.txt')) {
            // Чтение через FileReader 
            const text = await readFileAsText(file);
            inputText.value = text;
            
            // Принудительная прокрутка в начало
            inputText.scrollTop = 0;
            
            showToast(`✅ Файл загружен: ${text.length.toLocaleString('ru-RU')} символов`, 'success');
            
        } else if (file.name.toLowerCase().endsWith('.docx')) {
            if (typeof mammoth !== 'undefined') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                inputText.value = result.value;
                inputText.scrollTop = 0;
                showToast(`✅ DOCX загружен: ${result.value.length.toLocaleString('ru-RU')} символов`, 'success');
            } else {
                showToast('❌ Библиотека mammoth.min.js не подключена локально!', 'error');
            }
        } else {
            showToast('❌ Поддерживаются только форматы .txt и .docx', 'error');
        }
    } catch (err) {
        showToast('❌ Ошибка чтения файла: ' + err.message, 'error');
    }
});

// Вспомогательная функция: чтение файла как текста 
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const result = e.target.result;
            if (typeof result === 'string') {
                resolve(result);
            } else {
                // Если вернулось ArrayBuffer, декодируем вручную
                const decoder = new TextDecoder('utf-8');
                resolve(decoder.decode(result));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Не удалось прочитать файл'));
        };
        
        // Явно указываем кодировку UTF-8 
        reader.readAsText(file, 'UTF-8');
    });
}

// Вспомогательная функция: форматирование размера файла
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(2) + ' МБ';
}

// ============================================================================
// 4.1. ПОДДЕРЖКА DRAG-AND-DROP 
// ============================================================================
const inputPanel = document.querySelector('.input-panel');

['dragenter', 'dragover'].forEach(event => {
    inputPanel.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        inputPanel.classList.add('dragover');
    });
});

['dragleave', 'drop'].forEach(event => {
    inputPanel.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
        inputPanel.classList.remove('dragover');
    });
});

inputPanel.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        // Имитируем выбор файла через input
        fileInput.files = files;
        fileInput.dispatchEvent(new Event('change'));
    }
});

// ============================================================================
// 5. КРИПТОГРАФИЧЕСКИЕ АЛГОРИТМЫ 
// Реализация 7 алгоритмов: Цезарь, Виженер, Атбаш, Плейфер, Вернам, RSA, DES
// Поддержка кириллицы и латиницы 
// ============================================================================

//Вспомогательные функции для работы с алфавитами
function isRussian(ch) { return /[а-яё]/i.test(ch); }
function isEnglish(ch) { return /[a-z]/i.test(ch); }

// Возвращает строку алфавита для символа
function getAlphabet(ch) {
    if (isRussian(ch)) return 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
    if (isEnglish(ch)) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return null;
}

// ----------------------------------------------------------------------------
// 5.1. ШИФР ЦЕЗАРЯ 
// Ключ: целое число (сдвиг)
// ----------------------------------------------------------------------------
function caesarCipher(text, shift, decrypt = false) {
    if (decrypt) shift = -shift;
    return text.split('').map(ch => {
        const alpha = getAlphabet(ch);
        if (!alpha) return ch; // Неалфавитные символы сохраняются 
        const isLower = ch === ch.toLowerCase();
        const idx = alpha.indexOf(ch.toUpperCase());
        if (idx === -1) return ch;
        const newIdx = (idx + shift + alpha.length) % alpha.length;
        const res = alpha[newIdx];
        return isLower ? res.toLowerCase() : res;
    }).join('');
}

// ----------------------------------------------------------------------------
// 5.2. ШИФР ВИЖЕНЕРА 
// Ключ: строка букв русского или английского алфавита
// ----------------------------------------------------------------------------
function vigenereCipher(text, key, decrypt = false) {
    if (!key) return text;
    let keyIdx = 0;
    return text.split('').map(ch => {
        const alpha = getAlphabet(ch);
        if (!alpha) return ch;
        const keyChar = key[keyIdx % key.length];
        const keyAlpha = getAlphabet(keyChar) || alpha;
        const isLower = ch === ch.toLowerCase();
        const chIdx = alpha.indexOf(ch.toUpperCase());
        const shift = keyAlpha.indexOf(keyChar.toUpperCase());
        if (chIdx === -1 || shift === -1) return ch;
        
        const newIdx = decrypt 
            ? (chIdx - shift + alpha.length) % alpha.length 
            : (chIdx + shift) % alpha.length;
        keyIdx++;
        const res = alpha[newIdx];
        return isLower ? res.toLowerCase() : res;
    }).join('');
}

// ----------------------------------------------------------------------------
// 5.3. ШИФР АТБАШ 
// Ключ не требуется. Зеркальная подстановка.
// ----------------------------------------------------------------------------
function atbashCipher(text) {
    return text.split('').map(ch => {
        const alpha = getAlphabet(ch);
        if (!alpha) return ch;
        const isLower = ch === ch.toLowerCase();
        const idx = alpha.indexOf(ch.toUpperCase());
        const res = alpha[alpha.length - 1 - idx];
        return isLower ? res.toLowerCase() : res;
    }).join('');
}



// ----------------------------------------------------------------------------
// 5.4. ШИФР ВЕРНАМА 
// Ключ: строка, равная или длиннее текста. Операция XOR.
// Результат шифрования — Base64
// ----------------------------------------------------------------------------
function vernamCipher(text, key, decrypt = false) {
    if (!key) return text;
    const encoder = new TextEncoder();
    
    if (!decrypt) {
        // ШИФРОВАНИЕ
        const textBytes = encoder.encode(text);
        const keyBytes = encoder.encode(key);
        const resultBytes = new Uint8Array(textBytes.length);
        
        for (let i = 0; i < textBytes.length; i++) {
            resultBytes[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        // Возвращаем в формате Base64
        return btoa(String.fromCharCode(...resultBytes));
    } else {
        // ДЕШИФРОВАНИЕ
        try {
            // Декодируем Base64
            const binaryStr = atob(text);
            const encryptedBytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                encryptedBytes[i] = binaryStr.charCodeAt(i);
            }
            
            const keyBytes = encoder.encode(key);
            const resultBytes = new Uint8Array(encryptedBytes.length);
            
            for (let i = 0; i < encryptedBytes.length; i++) {
                resultBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
            }
            
            const decoder = new TextDecoder();
            return decoder.decode(resultBytes);
        } catch {
            return '[Ошибка дешифрования: неверный ключ или формат данных]';
        }
    }
}

// ----------------------------------------------------------------------------
// 5.5. АЛГОРИТМ RSA
// Учебная реализация на BigInt. Ключ: два простых числа через запятую.
// Для кириллицы рекомендуются p=37, q=31 (n=1147 > 1103)
// Для латиницы рекомендуются p=13, q=11 (n=143 > 122)
// ----------------------------------------------------------------------------
function rsaCipher(text, keyStr, decrypt = false) {
    try {
        const [pStr, qStr] = keyStr.split(',').map(s => s.trim());
        let p = BigInt(pStr), q = BigInt(qStr);
        
        if (!p || !q || p < 2n || q < 2n) {
            throw new Error('Неверные числа');
        }
        
        let n = p * q;
        let phi = (p - 1n) * (q - 1n);
        
        // Поиск открытой экспоненты e (начиная с 3, проверяем НОД(e, phi)=1)
        function gcd(a, b) {
            while (b !== 0n) {
                let t = b;
                b = a % b;
                a = t;
            }
            return a;
        }
        
        let e = 3n;
        while (gcd(e, phi) !== 1n || e >= phi) {
            e += 2n;
            if (e >= phi) {
                throw new Error('Невозможно подобрать открытую экспоненту e. Используйте большие простые числа.');
            }
        }
        
        // Расширенный алгоритм Евклида для вычисления закрытой экспоненты d
        function modInverse(a, m) {
            let m0 = m, y = 0n, x = 1n;
            if (m === 1n) return 0n;
            while (a > 1n) {
                let q = a / m;
                let t = m;
                m = a % m;
                a = t;
                t = y;
                y = x - q * y;
                x = t;
            }
            if (x < 0n) x = x + m0;
            return x;
        }
        
        let d = modInverse(e, phi);
        
        // Возведение в степень по модулю 
        function modPow(base, exp, mod) {
            let result = 1n;
            base = base % mod;
            while (exp > 0n) {
                if (exp % 2n === 1n) {
                    result = (result * base) % mod;
                }
                exp = exp / 2n;
                base = (base * base) % mod;
            }
            return result;
        }
        
        if (!decrypt) {
            // ШИФРОВАНИЕ
            // Шифруем каждый символ отдельно по его UTF-16 коду
            let encrypted = [];
            for (let ch of text) {
                let code = BigInt(ch.charCodeAt(0));
                
                // Проверяем, что код символа меньше n
                if (code >= n) {
                    showToast(`Числа p и q слишком малы. Нужно n > ${code}. Попробуйте p=37, q=31 для кириллицы.`, 'error');
                    return text;
                }
                
                let encryptedBlock = modPow(code, e, n);
                encrypted.push(encryptedBlock.toString());
            }
            
            return encrypted.join(' ');
        } else {
            // ДЕШИФРОВАНИЕ
            // Разбиваем зашифрованный текст на блоки 
            let blocks = text.trim().split(/\s+/);
            let decrypted = "";
            
            for (let block of blocks) {
                if (!block) continue;
                
                let encryptedBlock = BigInt(block);
                let decryptedCode = modPow(encryptedBlock, d, n);
                let code = Number(decryptedCode);
                
                // Проверяем корректность кода символа
                if (code < 0 || code > 0xFFFF) {
                    showToast('Ошибка дешифрования: неверный ключ', 'error');
                    return text;
                }
                
                decrypted += String.fromCharCode(code);
            }
            
            return decrypted;
        }
    } catch (err) {
        showToast('Ошибка RSA: ' + err.message, 'error');
        return text;
    }
}

// ----------------------------------------------------------------------------
// 5.6. АЛГОРИТМ DES
// Использует библиотеку crypto-js
// ----------------------------------------------------------------------------
function desCipher(text, key, decrypt = false) {
    if (typeof CryptoJS === 'undefined') {
        showToast('Библиотека crypto-js.min.js не подключена локально. DES недоступен.', 'error');
        return text;
    }
    try {
        if (decrypt) {
            const decrypted = CryptoJS.DES.decrypt(text, CryptoJS.enc.Utf8.parse(key), {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            });
            const result = decrypted.toString(CryptoJS.enc.Utf8);
            if (!result) {
                showToast('Ошибка дешифрования DES: неверный ключ или данные', 'error');
                return text;
            }
            return result;
        } else {
            const encrypted = CryptoJS.DES.encrypt(text, CryptoJS.enc.Utf8.parse(key), {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            });
            return encrypted.toString();
        }
    } catch (e) {
        showToast('Ошибка DES: проверьте ключ или формат данных', 'error');
        return text;
    }
}

// ============================================================================
// 6. ГЛАВНЫЙ ОБРАБОТЧИК ПРЕОБРАЗОВАНИЯ 
// ============================================================================
document.getElementById('convertBtn').addEventListener('click', () => {
    const text = inputText.value;
    const mode = document.getElementById('mode').value;
    const algo = algorithmSelect.value;
    const key = keyInput.value;
    const isDecrypt = mode === 'decrypt';

    // Валидация входных данных 
    if (!text) {
        showToast('Поле ввода текста пустое', 'error');
        return;
    }

    if (algo !== 'atbash' && !key) {
        showToast('Для выбранного алгоритма требуется ключ', 'error');
        return;
    }
    if (algo === 'caesar' && isNaN(parseInt(key))) {
        showToast('Ключ для шифра Цезаря должен быть числом', 'error');
        return;
    }

    let result = '';
    try {
        // Выбор и вызов соответствующего алгоритма
        switch (algo) {
            case 'caesar':   result = caesarCipher(text, parseInt(key), isDecrypt); break;
            case 'vigenere': result = vigenereCipher(text, key, isDecrypt); break;
            case 'atbash':   result = atbashCipher(text); break;
            case 'playfair': result = playfairCipher(text, key, isDecrypt); break;
            case 'vernam':   result = vernamCipher(text, key, isDecrypt); break;
            case 'rsa':      result = rsaCipher(text, key, isDecrypt); break;
            case 'des':      result = desCipher(text, key, isDecrypt); break;
        }
        document.getElementById('outputText').value = result;
        showToast('Операция успешно завершена', 'success');
    } catch (e) {
        // Обработка исключений без аварийного завершения 
        showToast('Ошибка при обработке: ' + e.message, 'error');
    }
});

// ============================================================================
// 7. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (очистка, копирование, скачивание)
// ============================================================================

// Очистка всех полей 
document.getElementById('clearBtn').addEventListener('click', () => {
    inputText.value = '';
    document.getElementById('outputText').value = '';
    fileInput.value = '';
    fileNameSpan.textContent = 'Файл не выбран';
    currentFileName = '';
    showToast('Все поля очищены', 'info');
});

// Копирование результата в буфер обмена 
document.getElementById('copyBtn').addEventListener('click', async () => {
    const out = document.getElementById('outputText').value;
    if (!out) {
        showToast('Нечего копировать', 'error');
        return;
    }
    try {
        await navigator.clipboard.writeText(out);
        showToast('Результат скопирован в буфер обмена', 'success');
    } catch {
        showToast('Не удалось скопировать. Используйте Ctrl+C', 'error');
    }
});

// Скачивание результата в .txt 
document.getElementById('downloadBtn').addEventListener('click', () => {
    const out = document.getElementById('outputText').value;
    if (!out) {
        showToast('Нечего скачивать', 'error');
        return;
    }
    
    const mode = document.getElementById('mode').value;
    const suffix = mode === 'encrypt' ? '_encode' : '_decode';
    const name = currentFileName ? `${currentFileName}${suffix}.txt` : `result${suffix}.txt`;
    
    const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
    
    // Используем FileSaver.js, если подключён, иначе нативный метод
    if (typeof saveAs !== 'undefined') {
        saveAs(blob, name);
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
    showToast(`Файл "${name}" сохранён`, 'success');
});

// ============================================================================
// 8. МОДАЛЬНОЕ ОКНО СПРАВКИ 
// ============================================================================
const helpModal = document.getElementById('helpModal');
document.getElementById('helpBtn').addEventListener('click', () => {
    helpModal.classList.add('active');
});
document.getElementById('closeModal').addEventListener('click', () => {
    helpModal.classList.remove('active');
});
// Закрытие модального окна при клике вне его содержимого
window.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.remove('active');
});
// Закрытие по клавише Escape
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpModal.classList.contains('active')) {
        helpModal.classList.remove('active');
    }
});

// ============================================================================
// 9. ГОРЯЧИЕ КЛАВИШИ 
// Ctrl+C, Ctrl+V, Ctrl+A работают стандартно во всех textarea
// Дополнительно: Ctrl+Enter для запуска преобразования
// ============================================================================
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('convertBtn').click();
    }
});

// ============================================================================
// 10. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
    // Установка начального состояния поля ключа
    algorithmSelect.dispatchEvent(new Event('change'));
    console.log('✅ Криптографический модуль успешно загружен. Все операции выполняются локально.');
});
