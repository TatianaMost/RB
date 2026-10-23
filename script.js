/* ===================================================================
   Анимации появления при скролле (+ вступительная анимация хиро)
   =================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setStaggerDelays(containerSelector, step, baseDelay) {
    var containers = document.querySelectorAll(containerSelector);
    containers.forEach(function (container) {
      var children = Array.prototype.slice.call(container.children);
      children.forEach(function (child, i) {
        child.style.setProperty('--reveal-delay', ((baseDelay || 0) + i * step).toFixed(2) + 's');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Шаги и карточки доверия/FAQ появляются по очереди, а не все разом
    setStaggerDelays('.trust-items', 0.1);
    setStaggerDelays('.steps__grid', 0.12);
    setStaggerDelays('.faq__list', 0.05);

    var revealEls = document.querySelectorAll('.reveal');

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

      revealEls.forEach(function (el) { io.observe(el); });
    }

    // Вступительная анимация хиро-блока — проигрывается сразу при загрузке
    var heroEls = document.querySelectorAll('.hero-intro');
    heroEls.forEach(function (el, i) {
      el.style.setProperty('--reveal-delay', (0.15 + i * 0.1).toFixed(2) + 's');
    });

    if (reduceMotion) {
      heroEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          heroEls.forEach(function (el) { el.classList.add('is-visible'); });
        });
      });
    }
  });
})();

/* ===================================================================
   Модалка «Открыть счёт»
   =================================================================== */
(function () {
  'use strict';

  // Временно отключено: кнопки «Открыть счет» сейчас ничего не открывают.
  // Чтобы вернуть модалку — поставьте true.
  var ACCOUNT_MODAL_ENABLED = false;

  document.addEventListener('DOMContentLoaded', function () {
    if (!ACCOUNT_MODAL_ENABLED) return;

    var overlay = document.getElementById('account-modal');
    if (!overlay) return;

    var modal = overlay.querySelector('.modal');
    var form = document.getElementById('account-form');
    var successPanel = overlay.querySelector('.modal__success');
    var openTriggers = document.querySelectorAll('[data-modal-open]');
    var closeTriggers = overlay.querySelectorAll('[data-modal-close]');
    var nameField = form.querySelector('input[name="name"]');
    var phoneField = form.querySelector('input[name="phone"]');
    var consentField = form.querySelector('input[name="consent"]');
    var lastFocused = null;

    // Простая проверка: минимум 7 цифр в номере
    function isPhoneValid(value) {
      var digits = value.replace(/\D/g, '');
      return digits.length >= 7;
    }

    function setFieldError(field, hasError) {
      var wrapper = field.closest('.modal__field');
      if (wrapper) wrapper.classList.toggle('has-error', hasError);
    }

    function focusableElements() {
      return Array.prototype.slice.call(
        modal.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) { return el.offsetParent !== null; });
    }

    function trapFocus(event) {
      if (event.key !== 'Tab') return;
      var focusable = focusableElements();
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        closeModal();
      } else {
        trapFocus(event);
      }
    }

    function openModal(trigger) {
      lastFocused = trigger || document.activeElement;

      // Каждое открытие — чистая форма
      form.hidden = false;
      successPanel.hidden = true;
      form.reset();
      setFieldError(nameField, false);
      setFieldError(phoneField, false);

      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      // requestAnimationFrame, чтобы transition сыграл (а не был пропущен из-за [hidden] -> display:none)
      requestAnimationFrame(function () {
        overlay.classList.add('is-open');
      });

      document.addEventListener('keydown', onKeydown);
      setTimeout(function () { nameField.focus(); }, 260);
    }

    function closeModal() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);

      setTimeout(function () {
        overlay.hidden = true;
      }, 250);

      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    openTriggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () { openModal(trigger); });
    });

    closeTriggers.forEach(function (trigger) {
      trigger.addEventListener('click', closeModal);
    });

    overlay.addEventListener('mousedown', function (event) {
      if (event.target === overlay) closeModal();
    });

    // Снимаем подсветку ошибки сразу, как только поле снова стало валидным
    nameField.addEventListener('input', function () {
      if (nameField.value.trim().length >= 2) setFieldError(nameField, false);
    });
    phoneField.addEventListener('input', function () {
      if (isPhoneValid(phoneField.value)) setFieldError(phoneField, false);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var nameValid = nameField.value.trim().length >= 2;
      var phoneValid = isPhoneValid(phoneField.value);

      setFieldError(nameField, !nameValid);
      setFieldError(phoneField, !phoneValid);

      if (!nameValid) { nameField.focus(); return; }
      if (!phoneValid) { phoneField.focus(); return; }
      if (!consentField.checked) { consentField.focus(); return; }

      // На статическом сайте нет бэкенда — заявка «отправляется» локально.
      // Чтобы реально передавать заявки в поддержку, подключите сюда
      // fetch() к своему API / CRM-вебхуку вместо имитации ниже.
      form.hidden = true;
      successPanel.hidden = false;
      successPanel.querySelector('.btn').focus();
    });
  });
})();

/* ===================================================================
   FAQ-аккордеон — плавное раскрытие/скрытие ответа по высоте
   =================================================================== */
(function () {
  'use strict';

  var TRANSITION_MS = 300; // должно совпадать с transition: height .3s в style.css

  document.addEventListener('DOMContentLoaded', function () {
    var items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    items.forEach(function (item) {
      var summary = item.querySelector('.faq-item__summary');
      var panel = item.querySelector('.faq-item__panel');
      if (!summary || !panel) return;

      var isOpen = item.classList.contains('is-open');

      // Исходное состояние: открытые по умолчанию пункты показываем сразу, без анимации
      panel.style.height = isOpen ? 'auto' : '0px';

      var fallbackTimer = null;

      function settle() {
        panel.removeEventListener('transitionend', onTransitionEnd);
        clearTimeout(fallbackTimer);

        if (isOpen) {
          panel.style.height = 'auto';
        }
      }

      function onTransitionEnd(event) {
        if (event.target !== panel || event.propertyName !== 'height') return;
        settle();
      }

      function animateTo(fromPx, toPx) {
        panel.removeEventListener('transitionend', onTransitionEnd);
        clearTimeout(fallbackTimer);
        panel.style.height = fromPx + 'px';
        // форсируем reflow, чтобы браузер зафиксировал стартовое значение перед переходом
        void panel.offsetHeight;
        panel.style.height = toPx + 'px';
        panel.addEventListener('transitionend', onTransitionEnd);
        // Подстраховка: если transitionend по какой-то причине не придёт — всё равно зафиксируем состояние
        fallbackTimer = setTimeout(settle, TRANSITION_MS + 60);
      }

      summary.addEventListener('click', function () {
        var currentHeight = panel.getBoundingClientRect().height;
        isOpen = !isOpen;

        item.classList.toggle('is-open', isOpen);
        summary.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

        if (isOpen) {
          var targetHeight = panel.scrollHeight;
          if (reduceMotion) {
            panel.style.height = 'auto';
            return;
          }
          animateTo(currentHeight, targetHeight);
        } else {
          if (reduceMotion) {
            panel.style.height = '0px';
            return;
          }
          animateTo(currentHeight, 0);
        }
      });
    });
  });
})();

/* ===================================================================
   Живые курсы криптовалют — CoinGecko (бесплатный публичный API, без ключа)
   =================================================================== */
(function () {
  'use strict';

  // Название в бейдже -> id монеты в CoinGecko
  var COINGECKO_IDS = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    BNB: 'binancecoin',
    SOL: 'solana',
    TON: 'the-open-network',
    DOGE: 'dogecoin',
    USDT: 'tether'
  };

  var REFRESH_MS = 60000; // раз в минуту — с запасом укладывается в бесплатный лимит CoinGecko

  function formatPrice(value) {
    var decimals = value >= 1 ? 2 : 4;
    var formatted = value.toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return formatted + ' $';
  }

  function formatChange(value) {
    var sign = value > 0 ? '+' : value < 0 ? '' : '+'; // toFixed сам добавит "-", а "+" добавляем только для положительных/нуля
    return sign + value.toFixed(2).replace('.', ',') + '%';
  }

  function applyRates(rates) {
    var nameEls = document.querySelectorAll('.rate-badge__name');

    nameEls.forEach(function (nameEl) {
      var coin = nameEl.textContent.trim();
      var id = COINGECKO_IDS[coin];
      var data = id && rates[id];
      if (!data || typeof data.usd !== 'number') return;

      var badge = nameEl.closest('.rate-badge');
      if (!badge) return;

      var priceEl = badge.querySelector('.rate-badge__price');
      var changeEl = badge.querySelector('.rate-badge__change');
      if (!priceEl || !changeEl) return;

      priceEl.textContent = formatPrice(data.usd);

      var change = typeof data.usd_24h_change === 'number' ? data.usd_24h_change : 0;
      changeEl.textContent = formatChange(change);
      changeEl.classList.toggle('rate-badge__change--up', change >= 0);
      changeEl.classList.toggle('rate-badge__change--down', change < 0);
    });
  }

  function fetchRates() {
    var ids = Object.keys(COINGECKO_IDS).map(function (key) { return COINGECKO_IDS[key]; }).join(',');
    var url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd&include_24hr_change=true';

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('CoinGecko responded with ' + res.status);
        return res.json();
      })
      .then(applyRates)
      .catch(function (err) {
        // Сеть недоступна / лимит запросов — просто оставляем прежние значения в ленте
        console.warn('Не удалось обновить курсы валют:', err);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.querySelector('.rate-badge')) return;
    fetchRates();
    setInterval(fetchRates, REFRESH_MS);
  });
})();
