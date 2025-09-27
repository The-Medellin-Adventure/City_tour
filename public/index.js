window.token = new URLSearchParams(window.location.search).get("token");

// index.js — versión corregida y robusta con videos grandes y pequeños
'use strict';

(function () {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA || {};

  // ----------------------------
// Cambia esto si quieres otra primera escena en el futuro
// ----------------------------
   // Obtener el token desde la URL y guardarlo globalmente
window.token = new URLSearchParams(window.location.search).get("token");
const FIRST_SCENE_ID = "0-plaza-botero-botero";

// =========================
// Verificación temprana del token
// =========================
if (window.token) {
  fetch(`https://citytour360.vercel.app/api/verify-token?token=${window.token}`, { headers: { Accept: "application/json" } })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      console.log("🔎 VERIFY-TOKEN RESPUESTA:", res.status, JSON.stringify(data, null, 2));

      // Si API devuelve error
      if (res.status === 403 || data.ok === false) {
        showErrorMessage("🚫 Acceso denegado", data.error || "Este enlace ya fue usado o expiró.");
        ocultarUI();
        throw new Error("Token inválido o expirado");
      }

      // Si API devuelve ok: true
      if (data.ok === true) {
        console.log("✅ Token válido, mostrar tour");
        mostrarUI();
      }
    })
    .catch(err => {
      console.warn("Error verificando token:", err.message);
    });
}
  

  var panoElement = document.querySelector('#pano');
  // Intento de mantener compatibilidad con tu HTML: uso #sceneTitle si existe,
  // si no, caigo en el selector original.
  var sceneNameElement = document.getElementById('sceneTitle') || document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  var viewerOpts = {
    controls: {
      mouseViewMode: (data.settings && data.settings.mouseViewMode) || 'drag'
    }
  };
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);
  window.viewer = viewer;

  // Mantener referencia al Swiper actual para destruirlo cuando se cierre / reabra
  var currentSwiper = null;

  // Vista activa (se actualiza cada vez que cambias de escena)
  var activeView = null;

  // =========================
  // Helper para escapar texto en HTML
  // =========================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =========================
// Funciones de error y ocultar UI
// =========================
function ocultarUI() {
  document.querySelectorAll(
    '.link-hotspot-icon, .camera-hotspot, #sceneList, #titleBar, #videoCard'
  ).forEach(el => {
    if (el) el.style.display = 'none';
  });
}
function mostrarUI() {
  // Revertir lo que hace ocultarUI()
  document.querySelectorAll('.link-hotspot-icon, .camera-hotspot, #sceneList, #titleBar, #videoCard')
    .forEach(el => { if (el) el.style.display = ''; });

  // Ocultar overlay de error si existe
  const overlay = document.getElementById("errorOverlay");
  if (overlay) overlay.style.display = 'none';
}
function showErrorMessage(titulo, mensaje) {
  const overlay = document.getElementById("errorOverlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  overlay.innerHTML = `
    <div style="background:#fff;color:#000;padding:20px;border-radius:10px;max-width:400px;text-align:center;">
      <h2>${escapeHtml(titulo)}</h2>
      <p>${escapeHtml(mensaje)}</p>
      <p style="margin-top:12px;font-size:14px;color:#444;">The Medellín Adventure</p>
    </div>
  `;
}

  // VARIABLES GLOBALES
  // =========================================================
  var currentScene = null;
  var currentVideoSceneId = null;
  var currentVideoTimeout = null;

  // NUEVAS VARIABLES para el overlay grande
  let bigOverlayOpen = false;
  let smallStartTimeout = null;

  // =========================
  // FUNCIÓN MOSTRAR CARRUSEL
  // =========================
  function mostrarCarrusel(imagenes, titulo) {
    imagenes = Array.isArray(imagenes) ? imagenes : [];
    const carruselContainer = document.getElementById('carruselContainer');
    const carruselTitulo = document.getElementById('carruselTitulo');
    const swiperWrapper = document.querySelector('#carrusel .swiper-wrapper');

    if (!carruselContainer || !swiperWrapper) {
      console.error("No se encontró el contenedor del carrusel en el HTML");
      return;
    }

    // Título
    carruselTitulo.textContent = titulo || '';

    // Limpiar
    swiperWrapper.innerHTML = '';

imagenes.forEach(function (img) {
  var filePath = img.src || img.url || '';
  var caption = img.caption || img.texto || '';

fetch(`/api/signed-url?token=${window.token}&file=${encodeURIComponent(filePath)}`, {
  headers: { Accept: "application/json" }
})
.then(res => {
  if (res.status === 403) {
    // 🚫 Token global inválido o expirado → mostramos tarjeta y ocultamos todo
    showErrorMessage("🚫 Acceso denegado", "Este enlace ya fue usado o expiró.");
    ocultarUI(); // <- función que desactiva iconos/menús
    throw new Error("Token inválido o expirado");
  }
  if (!res.ok) {
    // Otro error (500, 404, etc.) → no mostramos tarjeta
    throw new Error("Error de servidor o recurso");
  }
  return res.json();
})
.then(json => {
  if (!json.signedUrl) throw new Error(json.error || "No signedUrl");

  // Crear slide con imagen + caption
  var slide = document.createElement('div');
  slide.className = 'swiper-slide';
  slide.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <img src="${json.signedUrl}" style="max-width:80%;max-height:60vh;object-fit:contain;border-radius:8px;" />
      ${caption ? `<p style="margin-top:6px;color:#fff;font-size:14px;">${escapeHtml(caption)}</p>` : ""}
    </div>
  `;
  swiperWrapper.appendChild(slide);
})
.catch(err => {
  console.warn("Error cargando imagen firmada:", err.message);
    });
});

    carruselContainer.style.display = 'flex';

    if (currentSwiper) {
      try { currentSwiper.destroy(true, true); } catch (e) {}
      currentSwiper = null;
    }

Promise.all(
  imagenes.map(img =>
    fetch(`/api/signed-url?token=${window.token}&file=${encodeURIComponent(img.src)}`, {
      headers: { Accept: "application/json" }
    }).then(r => r.json())
  )
).finally(() => {
  currentSwiper = new Swiper('.carrusel-swiper', {
    loop: imagenes.length > 1,
    slidesPerView: 1,
    spaceBetween: 10,
    autoplay: { delay: 3500, disableOnInteraction: false },
    pagination: { el: '.swiper-pagination', clickable: true },
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
  });
});

    var cerrarBtn = document.getElementById('cerrarCarrusel');
    if (cerrarBtn) {
      cerrarBtn.onclick = function () {
        carruselContainer.style.display = 'none';
        swiperWrapper.innerHTML = '';
        if (currentSwiper) {
          try { currentSwiper.destroy(true, true); } catch (e) {}
          currentSwiper = null;
        }
      };
    }
  }

  window.mostrarCarrusel = mostrarCarrusel;

  // =========================
  // CREAR ESCENAS
  // =========================
  function createScene(sceneData) {
var urlPrefix = `/api/signed-url?token=${window.token}&file=tiles/${sceneData.id}`;
var source = Marzipano.ImageUrlSource.fromString(
  urlPrefix + "/{z}/{f}/{y}/{x}.jpg",
  { cubeMapPreviewUrl: urlPrefix + "/preview.jpg" }
);

    var geometry = new Marzipano.CubeGeometry(sceneData.levels);
    var limiter = Marzipano.RectilinearView.limit.traditional(sceneData.faceSize, 100 * Math.PI / 180, 120 * Math.PI / 180);
    var view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);
    var scene = viewer.createScene({ source: source, geometry: geometry, view: view, pinFirstLevel: true });

    (sceneData.linkHotspots || []).forEach(function (hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    (sceneData.infoHotspots || []).forEach(function (hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    (sceneData.hotSpots || []).forEach(function (hotspot) {
      if (hotspot.type === "camera") {
        var element = createCameraHotspot(hotspot);
        scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
      }
    });

    return { data: sceneData, scene: scene, view: view };
  }

  var scenes = (data.scenes || []).map(createScene);

  // Video grande solo para la escena 1
  const bigSceneVideos = {
    "0-plaza-botero-botero": `/api/signed-url?token=${window.token}&file=videos/instrucciones.mp4`
  };

  // =========================
  // VIDEO POR ESCENA — control independiente
  // =========================
  const sceneVideos = {
  "0-plaza-botero-botero": `/api/signed-url?token=${window.token}&file=videos/video1.mp4`,
  "1-plaza-botero-y-palacio-rafael-uribe-uribe": `/api/signed-url?token=${window.token}&file=videos/video2.mp4`,
  "2-esculturas-y-tradicin": `/api/signed-url?token=${window.token}&file=videos/video3.mp4`,
  "3-palacio-rafael-uribe-uribe": `/api/signed-url?token=${window.token}&file=videos/video4.mp4`,
  "4-parque-de-las-luces": `/api/signed-url?token=${window.token}&file=videos/video5.mp4`,
  "5-antiguo-ferrocarril": `/api/signed-url?token=${window.token}&file=videos/video6.mp4`,
  "6-antigua-estacin-medelln": `/api/signed-url?token=${window.token}&file=videos/video7.mp4`,
  "7-alpujarra": `/api/signed-url?token=${window.token}&file=videos/video8.mp4`,
  "8-transicin-ciudad-a-naturaleza": `/api/signed-url?token=${window.token}&file=videos/video9.mp4`,
  "9-pies_descalzos": `/api/signed-url?token=${window.token}&file=videos/video10.mp4`,
  "10-conexin-naturaleza": `/api/signed-url?token=${window.token}&file=videos/video11.mp4`,
  "11-laberinto-de-bamb": `/api/signed-url?token=${window.token}&file=videos/video12.mp4`,
  "12-edificio-inteligente-epm": `/api/signed-url?token=${window.token}&file=videos/video13.mp4`,
  "13-centro-de-convenciones-y-teatro": `/api/signed-url?token=${window.token}&file=videos/video14.mp4`,
  "14-pueblito-paisa": `/api/signed-url?token=${window.token}&file=videos/video15.mp4`
};

  // =========================
  // OVERLAY DE VIDEO GRANDE
  // =========================
  function showBigOverlayForScene(sceneId) {
    const overlay = document.getElementById("bigVideoOverlay");
    const backdrop = document.getElementById("bigVideoBackdrop");
    const bigVideo = document.getElementById("bigSceneVideo");
    const playBtn = document.getElementById("bigPlayPauseBtn");
    const muteBtn = document.getElementById("bigMuteBtn");
    const closeBtn = document.getElementById("bigCloseBtn");

    if (!overlay || !bigVideo) return;

    // Si no hay video configurado para esta escena, ocultar overlay
    if (!bigSceneVideos[sceneId]) {
      overlay.style.display = "none";
      backdrop.style.display = "none";
      bigOverlayOpen = false;
      return;
    }

    // Mostrar overlay
    bigOverlayOpen = true;
    overlay.style.display = "flex";
    backdrop.style.display = "block";
    requestAnimationFrame(() => {
      overlay.classList.add("visible");
      backdrop.classList.add("visible");
    });

    // Configurar fuente y reproducir (autoplay intent)
    bigVideo.src = bigSceneVideos[sceneId];
    bigVideo.load();
    bigVideo.play().catch(() => { /* autoplay puede fallar en algunos navegadores */ });

    // Controles
    if (playBtn) {
      playBtn.onclick = () => {
        if (bigVideo.paused) { bigVideo.play(); playBtn.textContent = "⏸"; }
        else { bigVideo.pause(); playBtn.textContent = "▶"; }
      };
    }
    if (muteBtn) {
      muteBtn.onclick = () => {
        bigVideo.muted = !bigVideo.muted;
        muteBtn.textContent = bigVideo.muted ? "🔇" : "🔊";
      };
    }

    function closeOverlay() {
      overlay.classList.remove("visible");
      backdrop.classList.remove("visible");
      setTimeout(() => {
        overlay.style.display = "none";
        backdrop.style.display = "none";
      }, 350);
      try { bigVideo.pause(); bigVideo.currentTime = 0; } catch (e) {}
      bigOverlayOpen = false;

      // Iniciar video pequeño 5s después de cerrar/terminar
      smallStartTimeout = setTimeout(() => {
        updateVideoForScene(sceneId, 0);
      }, 5000);
    }

    if (closeBtn) closeBtn.onclick = closeOverlay;
    if (backdrop) backdrop.onclick = (e) => { if (e.target === backdrop) closeOverlay(); };

    // Cuando termina → desencadena cierre y el arranque pequeño
    bigVideo.onended = function () {
      closeOverlay();
    };
  }

  // =========================
  // VIDEO PEQUEÑO LATERAL
  // =========================
  function updateVideoForScene(sceneId, forceDelay) {
    const videoCard = document.getElementById("videoCard");
    const sceneVideo = document.getElementById("sceneVideo");
    if (!videoCard || !sceneVideo) return;

    // Limpiar timers previos
    if (currentVideoTimeout) {
      clearTimeout(currentVideoTimeout);
      currentVideoTimeout = null;
    }
    if (smallStartTimeout) {
      clearTimeout(smallStartTimeout);
      smallStartTimeout = null;
    }

    // Detener video si se cambia de escena
    if (currentVideoSceneId && currentVideoSceneId !== sceneId) {
      sceneVideo.pause();
      try { sceneVideo.currentTime = 0; } catch (e) {}
    }

    // Si la escena tiene video grande y está abierto → ocultar el pequeño
    if (bigSceneVideos[sceneId] && bigOverlayOpen) {
      videoCard.style.display = "none";
      currentVideoSceneId = null;
      return;
    }

    // Verificar si hay video para la escena
    if (!sceneVideos[sceneId]) {
      videoCard.classList.remove("visible");
      currentVideoSceneId = null;
      return;
    }

    // Configurar nuevo video
    currentVideoSceneId = sceneId;
    sceneVideo.src = sceneVideos[sceneId];
    sceneVideo.load();

 // Mostrar tarjeta del video
    videoCard.classList.add("visible");
videoCard.style.display = "block";

    // Delay dinámico: 5s en la primera escena (si se solicita por defecto),
    // 3s en las demás. Si se pasa forceDelay (número) se usa ese valor.
    let delay = 3000;
    if (typeof forceDelay === "number") delay = forceDelay;
    else if (sceneId === FIRST_SCENE_ID) delay = 5000;

    currentVideoTimeout = setTimeout(() => {
      sceneVideo.play().catch(err => console.warn("No se pudo reproducir el video:", err));
    }, delay);

    // Si el video termina y seguimos en la misma escena → pausar y dejar último frame
    sceneVideo.onended = function () {
      if (currentVideoSceneId === sceneId) {
        sceneVideo.pause();
        try { sceneVideo.currentTime = sceneVideo.duration; } catch (e) {}
      }
    };
  }

  // ---- Controles personalizados de video (pequeño) ----
  const video = document.getElementById("sceneVideo");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const muteBtn = document.getElementById("muteBtn");
  // Algunos HTML tenían dos ids diferentes para cerrar: closeVideoCard y closeBtn — intento soportar ambos.
  const closeVideoBtn = document.getElementById("closeVideoCard") || document.getElementById("closeBtn");
  const videoCardEl = document.getElementById("videoCard");
  const videoIcon = document.getElementById("videoIcon");

  if (video && playPauseBtn && muteBtn && closeVideoBtn && videoCardEl && videoIcon) {
    playPauseBtn.addEventListener("click", () => {
      if (video.paused) {
        video.play();
        playPauseBtn.textContent = "⏸";
      } else {
        video.pause();
        playPauseBtn.textContent = "▶";
      }
    });

    muteBtn.addEventListener("click", () => {
      video.muted = !video.muted;
      muteBtn.textContent = video.muted ? "🔇" : "🔊";
    });

    // Cerrar tarjeta → mostrar icono flotante
    closeVideoBtn.addEventListener("click", () => {
      video.pause();
      videoCardEl.style.display = "none";
      videoIcon.style.display = "block";
    });

    // Reabrir tarjeta desde icono
    videoIcon.addEventListener("click", () => {
      videoCardEl.style.display = "block";
      videoIcon.style.display = "none";
    });
  }

  // =========================
  // SWITCH SCENE (único, robusto)
  // =========================
  function switchScene(scene) {
    if (!scene) return;

    // Limpieza: parar cualquier video / timers de la escena anterior para evitar interferencias
    try {
      if (currentVideoTimeout) { clearTimeout(currentVideoTimeout); currentVideoTimeout = null; }
      if (smallStartTimeout) { clearTimeout(smallStartTimeout); smallStartTimeout = null; }
      var smallV = document.getElementById('sceneVideo'); if (smallV) { smallV.pause(); try { smallV.currentTime = 0; } catch (e) {} }
      var bigV = document.getElementById('bigSceneVideo'); if (bigV) { bigV.pause(); try { bigV.currentTime = 0; } catch (e) {} }
      var overlay = document.getElementById('bigVideoOverlay'); var backdrop = document.getElementById('bigVideoBackdrop');
      if (overlay) { overlay.classList.remove('visible'); overlay.style.display = 'none'; }
      if (backdrop) { backdrop.classList.remove('visible'); backdrop.style.display = 'none'; }
      bigOverlayOpen = false;
    } catch (e) {}

    stopAutorotate();
    try {
      scene.view.setParameters(scene.data.initialViewParameters);
    } catch (e) { /* ignore */ }

    scene.scene.switchTo();
    updateSceneName(scene);
    updateSceneList(scene);

    // actualizar la vista activa (para los botones)
    activeView = scene.view;

    // Video por escena y overlay
    showBigOverlayForScene(scene.data.id);
    // Si el overlay está activo, updateVideoForScene ocultará el pequeño. El inicio real
    // del pequeño se hace después del cierre del grande según la lógica anterior.
    updateVideoForScene(scene.data.id);

    // Menú visible solo en la escena FIRST_SCENE_ID
    if (scene.data && scene.data.id === FIRST_SCENE_ID) {
      showSceneList();
    } else {
      hideSceneList();
    }

    startAutorotate();
  }

  // Inicializar en la primera escena si existe (intento abrir FIRST_SCENE_ID si está presente)
  if (scenes.length > 0) {
    var start = scenes.find(s => s.data && s.data.id === FIRST_SCENE_ID) || scenes[0];
    switchScene(start);
  }

  // =========================
  // UI helpers (nombre y lista)
  // =========================
  function updateSceneName(scene) {
    if (sceneNameElement) sceneNameElement.innerHTML = sanitize(scene.data.name || '');
  }

  function updateSceneList(scene) {
    Array.prototype.forEach.call(sceneElements || [], function (el) {
      if (!el) return;
      el.classList.toggle('current', el.getAttribute('data-id') === (scene && scene.data && scene.data.id));
    });
  }

  function sanitize(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // =========================
  // HOTSPOTS (mantengo tus funciones, con mínimo cambio)
  // =========================
  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'link-hotspot');

    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');
    if (typeof hotspot.rotation !== 'undefined') icon.style.transform = 'rotate(' + hotspot.rotation + 'rad)';
    wrapper.appendChild(icon);

    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip', 'link-hotspot-tooltip');
    var sceneData = findSceneDataById(hotspot.target);
    tooltip.innerHTML = (sceneData && sceneData.name) ? sceneData.name : '';
    wrapper.appendChild(tooltip);

    wrapper.addEventListener('click', function () {
      var s = findSceneById(hotspot.target);
      if (s) switchScene(s);
    });
    stopTouchAndScrollEventPropagation(wrapper);
    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'info-hotspot');

    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title || '';
    titleWrapper.appendChild(title);

    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text || '';

    wrapper.appendChild(header);
    wrapper.appendChild(text);

    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function () {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    stopTouchAndScrollEventPropagation(wrapper);
    return wrapper;
  }

  function createCameraHotspot(hotspot) {
    var element = document.createElement('img');
    element.src = hotspot.image || 'img/Camara.png';
    element.className = 'camera-hotspot-icon';
    element.style = "width:48px;height:48px;cursor:pointer;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.25);";
    element.title = hotspot.tooltip || hotspot.title || "";

    element.addEventListener('click', function () {
      if (hotspot.carrusel) {
        mostrarCarrusel(hotspot.images || [], hotspot.tooltip || hotspot.title || '');
      } else {
        showImageModal(hotspot.photo, hotspot.title);
      }
    });
    return element;
  }

  function showImageModal(photoSrc, title) {
    var oldModal = document.getElementById('custom-image-modal');
    if (oldModal) oldModal.remove();

    var modal = document.createElement('div');
    modal.id = 'custom-image-modal';
    modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';

    var content = document.createElement('div');
    content.style = 'background:#fff;border-radius:10px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,0.32);position:relative;';

    var img = document.createElement('img');
    img.src = photoSrc;
    img.alt = title || '';
    img.style = 'max-width:90vw;max-height:80vh;border-radius:8px;';
    content.appendChild(img);

    if (title) {
      var caption = document.createElement('div');
      caption.textContent = title;
      caption.style = 'margin-top:10px;font-weight:bold;text-align:center;';
      content.appendChild(caption);
    }

    var close = document.createElement('span');
    close.textContent = '×';
    close.style = 'position:absolute;top:8px;right:16px;cursor:pointer;font-size:2rem;color:#222;';
    close.addEventListener('click', function () { modal.remove(); });
    content.appendChild(close);

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });
  }

  function stopTouchAndScrollEventPropagation(element) {
    ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'mousewheel'].forEach(function (eventName) {
      element.addEventListener(eventName, function (event) { event.stopPropagation(); });
    });
  }

  function findSceneById(id) {
    return scenes.find(function (s) { return s.data.id === id; });
  }

  function findSceneDataById(id) {
    return (data.scenes || []).find(function (s) { return s.id === id; });
  }

  // Asociar eventos a los elementos de la lista de escenas (DOM)
  scenes.forEach(function (scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    if (!el) return;
    el.addEventListener('click', function () {
      switchScene(scene);
      if (document.body.classList.contains('mobile')) hideSceneList();
    });
  });

  // Fullscreen
  if (screenfull && screenfull.enabled && data.settings && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    if (fullscreenToggleElement) {
      fullscreenToggleElement.addEventListener('click', function () { screenfull.toggle(); });
      screenfull.on('change', function () { fullscreenToggleElement.classList.toggle('enabled', screenfull.isFullscreen); });
    }
  }

  // Autorotate
  if (autorotateToggleElement) autorotateToggleElement.addEventListener('click', toggleAutorotate);
  var autorotate = Marzipano.autorotate({ yawSpeed: 0.5, targetPitch: -0.3529, targetFov: Math.PI / 2 });
  if (data.settings && data.settings.autorotateEnabled) {
    if (autorotateToggleElement) autorotateToggleElement.classList.add('enabled');
  }

  function toggleAutorotate() {
    if (!autorotateToggleElement) return;
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled'); stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled'); startAutorotate();
    }
  }
  function startAutorotate() {
    if (!autorotateToggleElement || !autorotateToggleElement.classList.contains('enabled')) return;
    viewer.startMovement(autorotate); viewer.setIdleMovement(3000, autorotate);
  }
  function stopAutorotate() { viewer.stopMovement(); viewer.setIdleMovement(Infinity); }

  // Mostrar/ocultar lista escenas
  function showSceneList() { if (sceneListElement) sceneListElement.classList.add('enabled'); if (sceneListToggleElement) sceneListToggleElement.classList.add('enabled'); }
  function hideSceneList() { if (sceneListElement) sceneListElement.classList.remove('enabled'); if (sceneListToggleElement) sceneListToggleElement.classList.remove('enabled'); }

  // Toggle lista escenas (botón)
  var sceneListToggle = document.getElementById("sceneListToggle");
  var sceneList = document.getElementById("sceneList");
  if (sceneListToggle && sceneList) {
    sceneListToggle.addEventListener("click", function () {
      var isEnabled = sceneList.classList.toggle("enabled");
      var iconOn = sceneListToggle.querySelector(".icon.on");
      var iconOff = sceneListToggle.querySelector(".icon.off");
      if (iconOn) iconOn.style.display = isEnabled ? "inline" : "none";
      if (iconOff) iconOff.style.display = isEnabled ? "none" : "inline";
    });
  }

// =========================
// BOTÓN DE PANTALLA COMPLETA
// =========================
if (document.fullscreenEnabled) {
  const fsBtn = document.getElementById('fullscreenToggle');
  if (fsBtn) {
    fsBtn.addEventListener('click', function() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.body.requestFullscreen();
      }
    });
  }
} else {
  const fsBtn = document.getElementById('fullscreenToggle');
  if (fsBtn) fsBtn.style.display = 'none';
}


// =========================
// BOTONES DE CONTROL
// =========================
var velocity = 1;
var zoomSpeed = 1;

  var el;
  el = document.getElementById('viewLeft');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setYaw(activeView.yaw() - velocity); });
  el = document.getElementById('viewRight');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setYaw(activeView.yaw() + velocity); });
  el = document.getElementById('viewUp');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setPitch(activeView.pitch() + velocity); });
  el = document.getElementById('viewDown');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setPitch(activeView.pitch() - velocity); });
  el = document.getElementById('viewIn');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setFov(activeView.fov() - zoomSpeed); });
  el = document.getElementById('viewOut');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setFov(activeView.fov() + zoomSpeed); });

  // Si no es mobile, mostramos la lista (pero switchScene la ocultará si no es la primera escena)
  if (!document.body.classList.contains('mobile')) showSceneList();

})();
