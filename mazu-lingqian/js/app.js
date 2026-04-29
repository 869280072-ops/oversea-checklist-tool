(function () {
    'use strict';

    var STORAGE_KEY = 'mazu_fortune_history';
    var SETTINGS_KEY = 'mazu_settings';
    var currentFortune = null;
    var isShaking = false;
    var audioCtx = null;
    var soundEnabled = true;
    var isTraditional = false;

    var i18n = {
        zh: {
            nav_title: '妈祖灵签',
            home_title: '妈祖灵签',
            home_subtitle: '虔诚祈求 妈祖赐签',
            btn_start: '开始求签',
            draw_title: '虔诚摇签',
            draw_hint: '心中默念所求之事，然后点击摇签',
            btn_shake: '摇签',
            draw_result: '您抽到了第 {n} 签',
            btn_confirm: '掷杯确认',
            cup_title: '掷杯问神',
            cup_hint: '请掷杯请示妈祖，确认此签',
            btn_throw: '掷杯',
            cup_sheng: '圣筊 — 妈祖应允此签',
            cup_yin: '阴筊 — 妈祖未允，请重新求签',
            cup_xiao: '笑筊 — 妈祖笑而不答，请再掷一次',
            btn_cup_again: '再掷一次',
            btn_cup_redraw: '重新求签',
            btn_cup_view: '查看签文',
            detail_interpretation: '解曰',
            detail_fortune: '运势',
            fortune_career: '事业',
            fortune_wealth: '财运',
            fortune_love: '姻缘',
            fortune_health: '健康',
            fortune_travel: '出行',
            btn_back: '← 返回',
            btn_restart: '再求一签',
            history_title: '求签记录',
            btn_clear: '清空记录',
            history_empty: '暂无求签记录',
            about_title: '关于',
            about_app_name: '妈祖灵签',
            about_desc: '本应用为纯本地离线版妈祖灵签浏览器应用，无后端、无网络请求、无广告、不上传任何数据。签文仅供参考，请理性对待。',
            about_version: '版本：1.0.0',
            about_signs: '签数：六十签',
            about_storage: '数据：本地存储',
            about_image_credit: '图片：Rutger van der Maar / Wikimedia Commons / CC BY 2.0',
            about_jiaobei_credit: '筊杯参考图：Geographyinitiative / Wikimedia Commons / CC BY-SA 4.0',
            confirm_clear: '确定要清空所有求签记录吗？'
        },
        tw: {
            nav_title: '媽祖靈籤',
            home_title: '媽祖靈籤',
            home_subtitle: '虔誠祈求 媽祖賜籤',
            btn_start: '開始求籤',
            draw_title: '虔誠搖籤',
            draw_hint: '心中默念所求之事，然後點擊搖籤',
            btn_shake: '搖籤',
            draw_result: '您抽到了第 {n} 籤',
            btn_confirm: '擲杯確認',
            cup_title: '擲杯問神',
            cup_hint: '請擲杯請示媽祖，確認此籤',
            btn_throw: '擲杯',
            cup_sheng: '聖筊 — 媽祖應允此籤',
            cup_yin: '陰筊 — 媽祖未允，請重新求籤',
            cup_xiao: '笑筊 — 媽祖笑而不答，請再擲一次',
            btn_cup_again: '再擲一次',
            btn_cup_redraw: '重新求籤',
            btn_cup_view: '查看籤文',
            detail_interpretation: '解曰',
            detail_fortune: '運勢',
            fortune_career: '事業',
            fortune_wealth: '財運',
            fortune_love: '姻緣',
            fortune_health: '健康',
            fortune_travel: '出行',
            btn_back: '← 返回',
            btn_restart: '再求一籤',
            history_title: '求籤記錄',
            btn_clear: '清空記錄',
            history_empty: '暫無求籤記錄',
            about_title: '關於',
            about_app_name: '媽祖靈籤',
            about_desc: '本應用為純本地離線版媽祖靈籤瀏覽器應用，無後端、無網絡請求、無廣告、不上傳任何數據。籤文僅供參考，請理性對待。',
            about_version: '版本：1.0.0',
            about_signs: '籤數：六十籤',
            about_storage: '數據：本地存儲',
            about_image_credit: '圖片：Rutger van der Maar / Wikimedia Commons / CC BY 2.0',
            about_jiaobei_credit: '筊杯參考圖：Geographyinitiative / Wikimedia Commons / CC BY-SA 4.0',
            confirm_clear: '確定要清空所有求籤記錄嗎？'
        }
    };

    function t(key, params) {
        var lang = isTraditional ? 'tw' : 'zh';
        var text = i18n[lang][key] || key;
        if (params) {
            Object.keys(params).forEach(function (k) {
                text = text.replace('{' + k + '}', params[k]);
            });
        }
        return text;
    }

    function applyI18n() {
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            var tag = el.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea') {
                el.placeholder = t(key);
            } else if (key === 'draw_result') {
                // handled separately
            } else {
                el.textContent = t(key);
            }
        });
        var drawResultText = document.querySelector('.draw-result-text');
        if (drawResultText && currentFortune) {
            drawResultText.textContent = t('draw_result', { n: currentFortune.number });
        }
    }

    function $(id) {
        return document.getElementById(id);
    }

    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(function (p) {
            p.classList.remove('active');
        });
        $(pageId).classList.add('active');
        window.scrollTo(0, 0);
    }

    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playSound(type) {
        if (!soundEnabled) return;
        try {
            var ctx = getAudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'shake') {
                osc.frequency.value = 200;
                osc.type = 'triangle';
                gain.gain.value = 0.08;
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } else if (type === 'ding') {
                osc.frequency.value = 800;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            } else if (type === 'cup') {
                osc.frequency.value = 400;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'success') {
                osc.frequency.value = 523;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.8);
                var osc2 = ctx.createOscillator();
                var gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.value = 659;
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
                gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
                osc2.start(ctx.currentTime + 0.15);
                osc2.stop(ctx.currentTime + 0.9);
            }
        } catch (e) {
            // audio not supported
        }
    }

    function loadSettings() {
        try {
            var stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                var settings = JSON.parse(stored);
                if (settings.darkMode) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    $('btn-dark').textContent = '☀️';
                }
                if (settings.traditional) {
                    isTraditional = true;
                    $('btn-lang').textContent = '简';
                }
                if (settings.sound === false) {
                    soundEnabled = false;
                    $('btn-sound').textContent = '🔇';
                }
            }
        } catch (e) { }
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                darkMode: document.documentElement.getAttribute('data-theme') === 'dark',
                traditional: isTraditional,
                sound: soundEnabled
            }));
        } catch (e) { }
    }

    function getHistory() {
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    function saveHistory(history) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        } catch (e) { }
    }

    function addToHistory(fortune) {
        var history = getHistory();
        history.unshift({
            number: fortune.number,
            level: fortune.level,
            date: new Date().toLocaleString('zh-CN'),
            poem: fortune.poem
        });
        if (history.length > 50) history = history.slice(0, 50);
        saveHistory(history);
    }

    function getLevelClass(level) {
        if (level === '上上') return 'level-shangshang';
        if (level === '上吉') return 'level-shangji';
        if (level === '中吉') return 'level-zhongji';
        if (level === '中平') return 'level-zhongping';
        if (level === '下下') return 'level-xiaxia';
        return 'level-zhongping';
    }

    function renderDetail(fortune) {
        $('detail-number').textContent = '第 ' + fortune.number + ' 签';
        var levelEl = $('detail-level');
        levelEl.textContent = fortune.level;
        levelEl.className = 'detail-level ' + getLevelClass(fortune.level);
        $('detail-poem').textContent = fortune.poem;
        $('detail-interpretation').textContent = fortune.interpretation;
        $('fortune-career').textContent = fortune.fortune.career;
        $('fortune-wealth').textContent = fortune.fortune.wealth;
        $('fortune-love').textContent = fortune.fortune.love;
        $('fortune-health').textContent = fortune.fortune.health;
        $('fortune-travel').textContent = fortune.fortune.travel;
    }

    function renderHistory() {
        var history = getHistory();
        var list = $('history-list');
        var empty = $('history-empty');

        if (history.length === 0) {
            list.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        list.innerHTML = history.map(function (item, index) {
            return '<div class="history-item" data-index="' + index + '">' +
                '<div class="history-item-left">' +
                '<span class="history-item-number">第 ' + item.number + ' 签</span>' +
                '<span class="history-item-level">' + item.level + '</span>' +
                '</div>' +
                '<span class="history-item-date">' + item.date + '</span>' +
                '</div>';
        }).join('');

        list.querySelectorAll('.history-item').forEach(function (el) {
            el.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-index'));
                var h = getHistory();
                if (h[idx]) {
                    var fortune = FORTUNES.find(function (f) { return f.number === h[idx].number; });
                    if (fortune) {
                        renderDetail(fortune);
                        showPage('page-detail');
                    }
                }
            });
        });
    }

    function throwCup() {
        var cupLeft = $('cup-left');
        var cupRight = $('cup-right');

        cupLeft.className = 'cup cup-left throwing';
        cupRight.className = 'cup cup-right throwing';

        var rand = Math.random();
        var leftUp = rand < 0.5;
        var rightUp = rand >= 0.3 && rand < 0.8;
        var cupType;

        if (leftUp !== rightUp) {
            cupType = 'sheng';
        } else if (!leftUp && !rightUp) {
            cupType = 'yin';
        } else {
            cupType = 'xiao';
        }

        setTimeout(function () {
            cupLeft.classList.remove('throwing');
            cupRight.classList.remove('throwing');

            if (leftUp) {
                cupLeft.classList.add('facing-up');
            } else {
                cupLeft.classList.add('facing-down');
            }

            if (rightUp) {
                cupRight.classList.add('facing-up');
            } else {
                cupRight.classList.add('facing-down');
            }

            var resultText = $('cup-result-text');
            var nextBtn = $('btn-cup-next');
            $('cup-result').classList.remove('hidden');

            if (cupType === 'sheng') {
                resultText.textContent = t('cup_sheng');
                resultText.className = 'cup-result-text sheng';
                nextBtn.textContent = t('btn_cup_view');
                nextBtn.onclick = function () {
                    addToHistory(currentFortune);
                    renderDetail(currentFortune);
                    showPage('page-detail');
                    playSound('success');
                };
                playSound('success');
            } else if (cupType === 'yin') {
                resultText.textContent = t('cup_yin');
                resultText.className = 'cup-result-text yin';
                nextBtn.textContent = t('btn_cup_redraw');
                nextBtn.onclick = function () {
                    currentFortune = null;
                    $('draw-result').classList.add('hidden');
                    $('cup-result').classList.add('hidden');
                    cupLeft.className = 'cup cup-left';
                    cupRight.className = 'cup cup-right';
                    showPage('page-draw');
                };
                playSound('cup');
            } else {
                resultText.textContent = t('cup_xiao');
                resultText.className = 'cup-result-text xiao';
                nextBtn.textContent = t('btn_cup_again');
                nextBtn.onclick = function () {
                    $('cup-result').classList.add('hidden');
                    cupLeft.className = 'cup cup-left';
                    cupRight.className = 'cup cup-right';
                };
                playSound('cup');
            }
        }, 900);
    }

    function shakeQiantong() {
        if (isShaking) return;
        isShaking = true;

        var qiantong = $('qiantong');
        var shakeBtn = $('btn-shake');
        shakeBtn.disabled = true;
        qiantong.classList.add('shaking');

        playSound('shake');

        var shakeInterval = setInterval(function () {
            playSound('shake');
        }, 200);

        setTimeout(function () {
            clearInterval(shakeInterval);
            qiantong.classList.remove('shaking');
            isShaking = false;

            var fortuneIndex = Math.floor(Math.random() * FORTUNES.length);
            currentFortune = FORTUNES[fortuneIndex];

            $('draw-number').textContent = currentFortune.number;
            var drawResultText = document.querySelector('.draw-result-text');
            drawResultText.textContent = t('draw_result', { n: currentFortune.number });
            $('draw-result').classList.remove('hidden');
            shakeBtn.disabled = false;

            playSound('ding');
        }, 2000);
    }

    function init() {
        loadSettings();
        applyI18n();

        $('btn-start').addEventListener('click', function () {
            showPage('page-draw');
            playSound('ding');
        });

        $('btn-shake').addEventListener('click', shakeQiantong);

        $('btn-draw-back').addEventListener('click', function () {
            currentFortune = null;
            $('draw-result').classList.add('hidden');
            showPage('page-home');
        });

        $('btn-confirm').addEventListener('click', function () {
            $('cup-result').classList.add('hidden');
            $('cup-left').className = 'cup cup-left';
            $('cup-right').className = 'cup cup-right';
            showPage('page-cup');
            playSound('ding');
        });

        $('btn-throw').addEventListener('click', throwCup);

        $('btn-back-home').addEventListener('click', function () {
            currentFortune = null;
            $('draw-result').classList.add('hidden');
            showPage('page-home');
        });

        $('btn-restart').addEventListener('click', function () {
            currentFortune = null;
            $('draw-result').classList.add('hidden');
            showPage('page-draw');
        });

        $('btn-history').addEventListener('click', function () {
            renderHistory();
            showPage('page-history');
        });

        $('btn-history-back').addEventListener('click', function () {
            showPage('page-home');
        });

        $('btn-clear-history').addEventListener('click', function () {
            if (confirm(t('confirm_clear'))) {
                saveHistory([]);
                renderHistory();
            }
        });

        $('btn-about').addEventListener('click', function () {
            showPage('page-about');
        });

        $('btn-about-back').addEventListener('click', function () {
            showPage('page-home');
        });

        $('btn-lang').addEventListener('click', function () {
            isTraditional = !isTraditional;
            this.textContent = isTraditional ? '简' : '繁';
            applyI18n();
            saveSettings();
        });

        $('btn-sound').addEventListener('click', function () {
            soundEnabled = !soundEnabled;
            this.textContent = soundEnabled ? '🔊' : '🔇';
            if (soundEnabled) playSound('ding');
            saveSettings();
        });

        $('btn-dark').addEventListener('click', function () {
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                this.textContent = '🌙';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                this.textContent = '☀️';
            }
            saveSettings();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
