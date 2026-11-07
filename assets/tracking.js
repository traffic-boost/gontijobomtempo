/*
 * Rastreamento e consentimento (LGPD) do site.
 *
 * Enquanto os IDs abaixo estiverem vazios, nada externo é carregado e o aviso
 * de cookies não aparece. Basta preencher os IDs para ativar.
 */
(function () {
  'use strict';

  var CONFIG = {
    ga4: '',            // Ex.: 'G-XXXXXXXXXX'
    googleAds: '',      // Ex.: 'AW-123456789'
    googleAdsLabels: {  // Rótulos das conversões criadas no Google Ads
      whatsapp: '',
      telefone: '',
      formulario: ''
    },
    metaPixel: ''       // Ex.: '123456789012345'
  };

  var CHAVE_CONSENTIMENTO = 'gb_consentimento';
  var CHAVE_ORIGEM = 'gb_origem';

  var gtagAtivo = Boolean(CONFIG.ga4 || CONFIG.googleAds);
  var metaPermitida = Boolean(CONFIG.metaPixel);
  var rastreamentoAtivo = gtagAtivo || Boolean(CONFIG.metaPixel);

  function lerConsentimento() {
    try { return localStorage.getItem(CHAVE_CONSENTIMENTO); } catch (e) { return null; }
  }

  function salvarConsentimento(valor) {
    try { localStorage.setItem(CHAVE_CONSENTIMENTO, valor); } catch (e) { /* modo privado */ }
  }

  function carregarScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  /* Google (GA4 + Google Ads) com Consent Mode: começa negado. */
  function iniciarGoogle() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
    window.gtag('js', new Date());
    if (CONFIG.ga4) window.gtag('config', CONFIG.ga4);
    if (CONFIG.googleAds) window.gtag('config', CONFIG.googleAds);
    carregarScript('https://www.googletagmanager.com/gtag/js?id=' + (CONFIG.ga4 || CONFIG.googleAds));
  }

  /* Meta: só existe depois do aceite. */
  function iniciarMeta() {
    if (window.fbq) {
      window.fbq('consent', 'grant');
      return;
    }
    var fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = window._fbq = fbq;
    carregarScript('https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', CONFIG.metaPixel);
    fbq('track', 'PageView');
  }

  function aplicarConsentimento(valor) {
    var aceito = valor === 'aceito';
    if (gtagAtivo) {
      var estado = aceito ? 'granted' : 'denied';
      window.gtag('consent', 'update', {
        ad_storage: estado,
        ad_user_data: estado,
        ad_personalization: estado,
        analytics_storage: estado
      });
    }
    if (aceito && metaPermitida) iniciarMeta();
    if (!aceito && window.fbq) window.fbq('consent', 'revoke');
  }

  /* Aviso de cookies */
  function mostrarAviso() {
    if (document.getElementById('aviso-cookies')) return;

    if (!document.getElementById('aviso-cookies-estilo')) {
      var estilo = document.createElement('style');
      estilo.id = 'aviso-cookies-estilo';
      estilo.textContent =
        '#aviso-cookies{position:fixed;left:16px;right:16px;bottom:16px;z-index:10000;max-width:560px;margin:0 auto;' +
        'padding:18px 20px;border-radius:14px;background:#151820;color:#F3F3F3;border:1px solid rgba(216,216,216,.18);' +
        'box-shadow:0 18px 50px rgba(0,0,0,.45);font:14px/1.5 Inter,Arial,sans-serif}' +
        '#aviso-cookies a{color:#F3F3F3;text-decoration:underline}' +
        '#aviso-cookies .acoes{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}' +
        '#aviso-cookies button{flex:1 1 140px;padding:10px 14px;border-radius:9px;border:1px solid #A8A8A9;' +
        'background:transparent;color:#F3F3F3;font:600 14px Inter,Arial,sans-serif;cursor:pointer}' +
        '#aviso-cookies button.aceitar{background:#D8D8D8;border-color:#D8D8D8;color:#151820}';
      document.head.appendChild(estilo);
    }

    var aviso = document.createElement('div');
    aviso.id = 'aviso-cookies';
    aviso.setAttribute('role', 'dialog');
    aviso.setAttribute('aria-label', 'Aviso de cookies');
    aviso.innerHTML =
      '<div>Usamos cookies de medição e publicidade para entender o uso do site. ' +
      'Saiba mais na <a href="/politica-de-privacidade/">Política de Privacidade</a>.</div>' +
      '<div class="acoes"><button type="button" class="recusar">Recusar</button>' +
      '<button type="button" class="aceitar">Aceitar</button></div>';

    function responder(valor) {
      salvarConsentimento(valor);
      aplicarConsentimento(valor);
      aviso.remove();
    }

    aviso.querySelector('.aceitar').addEventListener('click', function () { responder('aceito'); });
    aviso.querySelector('.recusar').addEventListener('click', function () { responder('recusado'); });
    document.body.appendChild(aviso);
  }

  /* Origem da campanha: guardada na sessão para identificar o lead no WhatsApp. */
  function registrarOrigem() {
    var params = new URLSearchParams(location.search);
    var fonte = params.get('utm_source');
    if (!fonte) return;
    var origem = [fonte, params.get('utm_campaign')].filter(Boolean).join('-')
      .replace(/[^\w-]/g, '').slice(0, 60);
    try { sessionStorage.setItem(CHAVE_ORIGEM, origem); } catch (e) { /* modo privado */ }
  }

  function lerOrigem() {
    try { return sessionStorage.getItem(CHAVE_ORIGEM); } catch (e) { return null; }
  }

  /* Mensagem pronta do WhatsApp com a origem. */
  function prepararWhatsApp() {
    var origem = lerOrigem();
    var texto = 'Olá! Vim pelo site e gostaria de falar com o escritório.' +
      (origem ? ' [ref: ' + origem + ']' : '');

    document.querySelectorAll('a[href*="wa.me/"]').forEach(function (link) {
      link.href = link.href.split('?')[0] + '?text=' + encodeURIComponent(texto);
    });
  }

  /* Conversões */
  function registrarConversao(nomeGa4, chaveAds, eventoMeta) {
    if (gtagAtivo) {
      window.gtag('event', nomeGa4, { pagina: location.pathname });
      var rotulo = CONFIG.googleAdsLabels[chaveAds];
      if (CONFIG.googleAds && rotulo) {
        window.gtag('event', 'conversion', { send_to: CONFIG.googleAds + '/' + rotulo });
      }
    }
    if (window.fbq) window.fbq('track', eventoMeta);
  }

  function escutarConversoes() {
    document.addEventListener('click', function (evento) {
      var link = evento.target.closest ? evento.target.closest('a') : null;
      if (!link) return;
      var href = link.getAttribute('href') || '';
      if (href.indexOf('wa.me/') !== -1) registrarConversao('whatsapp_click', 'whatsapp', 'Contact');
      else if (href.indexOf('tel:') === 0) registrarConversao('phone_click', 'telefone', 'Contact');
      else if (href.indexOf('mailto:') === 0) registrarConversao('email_click', 'formulario', 'Contact');
    });

    var formulario = document.getElementById('emailForm');
    if (formulario) {
      // Nenhum dado digitado é enviado aos serviços de medição.
      formulario.addEventListener('submit', function () {
        registrarConversao('generate_lead', 'formulario', 'Lead');
      });
    }
  }

  function prepararBotaoPreferencias() {
    document.querySelectorAll('[data-preferencias-cookies]').forEach(function (botao) {
      botao.hidden = false;
      botao.addEventListener('click', function (evento) {
        evento.preventDefault();
        mostrarAviso();
      });
    });
  }

  registrarOrigem();
  prepararWhatsApp();

  if (!rastreamentoAtivo) return;

  if (gtagAtivo) iniciarGoogle();
  escutarConversoes();
  prepararBotaoPreferencias();

  var consentimento = lerConsentimento();
  if (consentimento) aplicarConsentimento(consentimento);
  else mostrarAviso();
})();
