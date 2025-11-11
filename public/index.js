// =========================================================
// MEDELLÍN 360° - THE MEDELLIN ADVENTURE
// Tour Virtual Profesional con Sistema de Tokens
// =========================================================

'use strict';

(function () {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA || {};

  // ========== CONFIGURACIÓN INICIAL ==========
  window.token = new URLSearchParams(window.location.search).get("token");
  const FIRST_SCENE_ID = "0-plaza-botero-botero";

  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.getElementById('sceneTitle');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');
  var musicToggleElement = document.querySelector('#musicToggle');

  // ========== VERIFICACIÓN DE TOKEN ==========
  if (window.token) {
    fetch(`https://citytour360.vercel.app/api/verify-token?token=${window.token}`, { 
      headers: { Accept: "application/json" } 
    })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      console.log("🔎 Verificación de token:", res.status, data);

      if (res.status === 403 || data.ok === false) {
        showErrorMessage("🚫 Acceso Denegado", data.error || "Este enlace ya fue usado o ha expirado.");
        ocultarUI();
        throw new Error("Token inválido");
      }

      if (data.ok === true) {
        console.log("✅ Acceso autorizado");
        mostrarUI();
        initializeViewer();
      }
    })
    .catch(err => {
      console.warn("Error verificando token:", err.message);
    });
  } else {
    initializeViewer();
  }

  // ========== FUNCIONES DE UI ==========
  function ocultarUI() {
    document.querySelectorAll(
      '.link-hotspot-icon, .camera-hotspot, #sceneList, #titleBar, #videoCard, .viewControlButton'
    ).forEach(el => {
      if (el) el.style.display = 'none';
    });
  }

  function mostrarUI() {
    document.querySelectorAll(
      '.link-hotspot-icon, .camera-hotspot, #sceneList, #titleBar, #videoCard, .viewControlButton'
    ).forEach(el => {
      if (el) el.style.display = '';
    });
    const overlay = document.getElementById("errorOverlay");
    if (overlay) overlay.style.display = 'none';
  }

  function showErrorMessage(titulo, mensaje) {
    const overlay = document.getElementById("errorOverlay");
    if (!overlay) return;
    overlay.style.display = "flex";
    overlay.innerHTML = `
      <div style="background: linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%);
        color: white; padding: 40px; border-radius: 24px; text-align: center;
        max-width: 450px; font-size: 18px; font-weight: 600;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
        <h2 style="font-size: 32px; margin-bottom: 20px;">${escapeHtml(titulo)}</h2>
        <p style="margin-bottom: 24px;">${escapeHtml(mensaje)}</p>
        <p style="font-size: 16px; opacity: 0.9;">The Medellin Adventure</p>
        <button onclick="location.reload()" 
          style="margin-top: 20px; padding: 14px 28px; border: none; border-radius: 12px;
          background: white; color: #FF6B35; font-weight: bold; cursor: pointer;
          font-size: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: transform 0.2s;"
          onmouseover="this.style.transform='scale(1.05)'"
          onmouseout="this.style.transform='scale(1)'">
          Cerrar
        </button>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ========== INICIALIZACIÓN DEL VISOR ==========
  function initializeViewer() {
    var viewerOpts = {
      controls: {
        mouseViewMode: (data.settings && data.settings.mouseViewMode) || 'drag'
      }
    };
    var viewer = new Marzipano.Viewer(panoElement, viewerOpts);
    window.viewer = viewer;

    var currentSwiper = null;
    var activeView = null;
    var currentScene = null;
    var currentVideoSceneId = null;
    var currentVideoTimeout = null;
    var bigOverlayOpen = false;
    var smallStartTimeout = null;

    // ========== VIDEOS POR ESCENA ==========
    const bigSceneVideos = {
      "0-plaza-botero-botero": `/api/signed-url?token=${window.token}&file=videos/instrucciones.mp4`
    };

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

    // ========== FUNCIÓN MOSTRAR CARRUSEL ==========
    window.mostrarCarrusel = function(imagenes, titulo) {
      imagenes = Array.isArray(imagenes) ? imagenes : [];
      const carruselContainer = document.getElementById('carruselContainer');
      const carruselTitulo = document.getElementById('carruselTitulo');
      const swiperWrapper = document.querySelector('#carrusel .swiper-wrapper');

      if (!carruselContainer || !swiperWrapper) {
        console.error("Contenedor del carrusel no encontrado");
        return;
      }

      carruselTitulo.textContent = titulo || '';
      swiperWrapper.innerHTML = '';

      imagenes.forEach(function (img) {
        var filePath = img.src || img.url || '';
        var caption = img.caption || img.texto || '';

        var slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;padding:20px;">
            <img src="/api/signed-url?token=${window.token}&file=${encodeURIComponent(filePath)}"
                 alt="${escapeHtml(caption)}"
                 style="max-width:90%;max-height:60vh;object-fit:contain;border-radius:12px;
                 box-shadow:0 8px 30px rgba(0,0,0,0.2);" />
            ${caption ? `<p style="margin-top:16px;color:#1a1a2e;font-size:15px;line-height:1.6;
              text-align:center;max-width:700px;">${escapeHtml(caption)}</p>` : ""}
          </div>
        `;
        swiperWrapper.appendChild(slide);
      });

      carruselContainer.style.display = 'flex';

      if (currentSwiper) {
        try { currentSwiper.destroy(true, true); } catch (e) {}
        currentSwiper = null;
      }

      setTimeout(() => {
        currentSwiper = new Swiper('.carrusel-swiper', {
          loop: imagenes.length > 1,
          slidesPerView: 1,
          spaceBetween: 20,
          autoplay: { delay: 4000, disableOnInteraction: false },
          pagination: { el: '.swiper-pagination', clickable: true },
          navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
          effect: 'fade',
          fadeEffect: { crossFade: true }
        });
      }, 100);

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
    };

    // ========== CREAR ESCENAS ==========
    function createScene(sceneData) {
      var urlPrefix = `/api/signed-url?token=${window.token}&file=tiles/${sceneData.id}`;
      var source = Marzipano.ImageUrlSource.fromString(
        urlPrefix + "/{z}/{f}/{y}/{x}.jpg",
        { cubeMapPreviewUrl: urlPrefix + "/preview.jpg" }
      );

      var geometry = new Marzipano.CubeGeometry(sceneData.levels);
      var limiter = Marzipano.RectilinearView.limit.traditional(
        sceneData.faceSize, 
        100 * Math.PI / 180, 
        120 * Math.PI / 180
      );
      var view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);
      var scene = viewer.createScene({ 
        source: source, 
        geometry: geometry, 
        view: view, 
        pinFirstLevel: true 
      });

      // Link Hotspots
      (sceneData.linkHotspots || []).forEach(function (hotspot) {
        var element = createLinkHotspotElement(hotspot);
        scene.hotspotContainer().createHotspot(element, { 
          yaw: hotspot.yaw, 
          pitch: hotspot.pitch 
        });
      });

      // Info Hotspots
      (sceneData.infoHotspots || []).forEach(function (hotspot) {
        var element = createInfoHotspotElement(hotspot);
        scene.hotspotContainer().createHotspot(element, { 
          yaw: hotspot.yaw, 
          pitch: hotspot.pitch 
        });
      });

      // Camera Hotspots
      (sceneData.hotSpots || []).forEach(function (hotspot) {
        if (hotspot.type === "camera") {
          var element = createCameraHotspot(hotspot);
          scene.hotspotContainer().createHotspot(element, { 
            yaw: hotspot.yaw, 
            pitch: hotspot.pitch 
          });
        }
      });

      return { data: sceneData, scene: scene, view: view };
    }

    var scenes = (data.scenes || []).map(createScene);

    // ========== HOTSPOTS ==========
    function createLinkHotspotElement(hotspot) {
      var wrapper = document.createElement('div');
      wrapper.classList.add('hotspot', 'link-hotspot');

      var icon = document.createElement('img');
      icon.src = 'img/link.png';
      icon.classList.add('link-hotspot-icon');
      if (typeof hotspot.rotation !== 'undefined') {
        icon.style.transform = 'rotate(' + hotspot.rotation + 'rad)';
      }
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

      header.appendChild(iconWrapper);
      header.appendChild(titleWrapper);

      var text = document.createElement('div');
      text.classList.add('info-hotspot-text');
      text.innerHTML = hotspot.text || '';

      wrapper.appendChild(header);
      wrapper.appendChild(text);

      var toggle = function () {
        wrapper.classList.toggle('visible');
      };

      header.addEventListener('click', toggle);
      stopTouchAndScrollEventPropagation(wrapper);
      
      return wrapper;
    }

    function createCameraHotspot(hotspot) {
      var element = document.createElement('img');
      element.src = hotspot.image || 'img/Camara.png';
      element.className = 'camera-hotspot-icon';
      element.style = "width:56px;height:56px;cursor:pointer;border-radius:50%;box-shadow:0 4px 15px rgba(255,107,53,0.5);";
      element.title = hotspot.tooltip || hotspot.title || "";

      element.addEventListener('click', function () {
        if (hotspot.carrusel) {
          window.mostrarCarrusel(hotspot.images || [], hotspot.tooltip || hotspot.title || '');
        }
      });
      return element;
    }

    function stopTouchAndScrollEventPropagation(element) {
      ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'mousewheel'].forEach(function (eventName) {
        element.addEventListener(eventName, function (event) { 
          event.stopPropagation(); 
        });
      });
    }

    // ========== CAMBIO DE ESCENA ==========
    function switchScene(scene) {
      if (!scene) return;

      // Limpiar videos y timers
      try {
        if (currentVideoTimeout) { 
          clearTimeout(currentVideoTimeout); 
          currentVideoTimeout = null; 
        }
        if (smallStartTimeout) { 
          clearTimeout(smallStartTimeout); 
          smallStartTimeout = null; 
        }
        
        var smallV = document.getElementById('sceneVideo');
        if (smallV) { 
          smallV.pause(); 
          try { smallV.currentTime = 0; } catch (e) {} 
        }
        
        var bigV = document.getElementById('bigSceneVideo');
        if (bigV) { 
          bigV.pause(); 
          try { bigV.currentTime = 0; } catch (e) {} 
        }
        
        var overlay = document.getElementById('bigVideoOverlay');
        var backdrop = document.getElementById('bigVideoBackdrop');
        if (overlay) { 
          overlay.classList.remove('visible'); 
          setTimeout(() => { overlay.style.display = 'none'; }, 400);
        }
        if (backdrop) { 
          backdrop.classList.remove('visible'); 
          setTimeout(() => { backdrop.style.display = 'none'; }, 400);
        }
        bigOverlayOpen = false;
      } catch (e) {
        console.warn("Error limpiando videos:", e);
      }

      stopAutorotate();
      try {
        scene.view.setParameters(scene.data.initialViewParameters);
      } catch (e) {}

      scene.scene.switchTo({
        transitionDuration: 1000
      });
      
      updateSceneName(scene);
      updateSceneList(scene);
      activeView = scene.view;
      currentScene = scene;

      // Videos
      showBigOverlayForScene(scene.data.id);
      updateVideoForScene(scene.data.id);

      // Menú visible solo en primera escena
      if (scene.data && scene.data.id === FIRST_SCENE_ID) {
        showSceneList();
      } else {
        hideSceneList();
      }

      startAutorotate();
    }

    function updateSceneName(scene) {
      if (sceneNameElement) {
        sceneNameElement.innerHTML = escapeHtml(scene.data.name || 'Medellín 360°');
        
        // Actualizar título del navegador
        document.title = `${scene.data.name || 'Medellín 360°'} - The Medellin Adventure`;
      }
    }

    function updateSceneList(scene) {
      Array.prototype.forEach.call(sceneElements || [], function (el) {
        if (!el) return;
        el.classList.toggle('current', el.getAttribute('data-id') === (scene && scene.data && scene.data.id));
      });
    }

    // ========== VIDEO GRANDE (OVERLAY) ==========
    function showBigOverlayForScene(sceneId) {
      const overlay = document.getElementById("bigVideoOverlay");
      const backdrop = document.getElementById("bigVideoBackdrop");
      const bigVideo = document.getElementById("bigSceneVideo");
      const playBtn = document.getElementById("bigPlayPauseBtn");
      const muteBtn = document.getElementById("bigMuteBtn");
      const closeBtn = document.getElementById("bigCloseBtn");

      if (!overlay || !bigVideo) return;

      if (!bigSceneVideos[sceneId]) {
        overlay.style.display = "none";
        backdrop.style.display = "none";
        bigOverlayOpen = false;
        return;
      }

      bigOverlayOpen = true;
      overlay.style.display = "flex";
      backdrop.style.display = "block";
      
      requestAnimationFrame(() => {
        overlay.classList.add("visible");
        backdrop.classList.add("visible");
      });

      bigVideo.src = bigSceneVideos[sceneId];
      bigVideo.load();
      bigVideo.play().catch(() => {});

      if (playBtn) {
        playBtn.onclick = () => {
          if (bigVideo.paused) { 
            bigVideo.play(); 
            playBtn.textContent = "⏸"; 
          } else { 
            bigVideo.pause(); 
            playBtn.textContent = "▶"; 
          }
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
        }, 400);
        try { bigVideo.pause(); bigVideo.currentTime = 0; } catch (e) {}
        bigOverlayOpen = false;

        smallStartTimeout = setTimeout(() => {
          updateVideoForScene(sceneId, 0);
        }, 5000);
      }

      if (closeBtn) closeBtn.onclick = closeOverlay;
      if (backdrop) backdrop.onclick = (e) => { 
        if (e.target === backdrop) closeOverlay(); 
      };

      bigVideo.onended = function () {
        closeOverlay();
      };
    }

    // ========== VIDEO PEQUEÑO LATERAL ==========
    function updateVideoForScene(sceneId, forceDelay) {
      const videoCard = document.getElementById("videoCard");
      const sceneVideo = document.getElementById("sceneVideo");
      if (!videoCard || !sceneVideo) return;

      if (currentVideoTimeout) {
        clearTimeout(currentVideoTimeout);
        currentVideoTimeout = null;
      }
      if (smallStartTimeout) {
        clearTimeout(smallStartTimeout);
        smallStartTimeout = null;
      }

      if (currentVideoSceneId && currentVideoSceneId !== sceneId) {
        sceneVideo.pause();
        try { sceneVideo.currentTime = 0; } catch (e) {}
      }

      if (bigSceneVideos[sceneId] && bigOverlayOpen) {
        videoCard.classList.remove("visible");
        currentVideoSceneId = null;
        return;
      }

      if (!sceneVideos[sceneId]) {
        videoCard.classList.remove("visible");
        currentVideoSceneId = null;
        return;
      }

      currentVideoSceneId = sceneId;
      sceneVideo.src = sceneVideos[sceneId];
      sceneVideo.load();
      videoCard.classList.add("visible");

      let delay = 3000;
      if (typeof forceDelay === "number") delay = forceDelay;
      else if (sceneId === FIRST_SCENE_ID) delay = 5000;

      currentVideoTimeout = setTimeout(() => {
        sceneVideo.play().catch(err => console.warn("No se pudo reproducir video:", err));
      }, delay);

      sceneVideo.onended = function () {
        if (currentVideoSceneId === sceneId) {
          sceneVideo.pause();
          try { sceneVideo.currentTime = sceneVideo.duration; } catch (e) {}
        }
      };
    }

    // ========== CONTROLES DE VIDEO ==========
    const video = document.getElementById("sceneVideo");
    const playPauseBtn = document.getElementById("playPauseBtn");
    const muteBtn = document.getElementById("muteBtn");
    const closeVideoBtn = document.getElementById("closeBtn");
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

      closeVideoBtn.addEventListener("click", () => {
        video.pause();
        videoCardEl.classList.remove("visible");
        setTimeout(() => {
          videoIcon.style.display = "block";
        }, 400);
      });

      videoIcon.addEventListener("click", () => {
        videoCardEl.classList.add("visible");
        videoIcon.style.display = "none";
      });
    }

    // ========== CONTROL DE MÚSICA ==========
    const bgMusic = document.getElementById("bg-music");
    if (musicToggleElement && bgMusic) {
      bgMusic.volume = 0.3;
      
      musicToggleElement.addEventListener("click", function() {
        if (bgMusic.paused) {
          bgMusic.play().catch(() => {});
          musicToggleElement.classList.remove("off");
        } else {
          bgMusic.pause();
          musicToggleElement.classList.add("off");
        }
      });

      // Intentar reproducir automáticamente
      setTimeout(() => {
        bgMusic.play().catch(() => {
          musicToggleElement.classList.add("off");
        });
      }, 1000);
    }

    // ========== AUTOROTATE ==========
    if (autorotateToggleElement) {
      autorotateToggleElement.addEventListener('click', toggleAutorotate);
    }
    
    var autorotate = Marzipano.autorotate({ 
      yawSpeed: 0.3, 
      targetPitch: -0.2, 
      targetFov: Math.PI / 2 
    });
    
    if (data.settings && data.settings.autorotateEnabled) {
      if (autorotateToggleElement) autorotateToggleElement.classList.add('enabled');
    }

    function toggleAutorotate() {
      if (!autorotateToggleElement) return;
      if (autorotateToggleElement.classList.contains('enabled')) {
        autorotateToggleElement.classList.remove('enabled');
        stopAutorotate();
      } else {
        autorotateToggleElement.classList.add('enabled');
        startAutorotate();
      }
    }

    function startAutorotate() {
      if (!autorotateToggleElement || !autorotateToggleElement.classList.contains('enabled')) return;
      viewer.startMovement(autorotate);
      viewer.setIdleMovement(3000, autorotate);
    }

    function stopAutorotate() {
      viewer.stopMovement();
      viewer.setIdleMovement(Infinity);
    }

    // ========== FULLSCREEN ==========
    if (screenfull && screenfull.isEnabled && fullscreenToggleElement) {
      fullscreenToggleElement.addEventListener('click', function () {
        screenfull.toggle(document.documentElement);
      });
      
      screenfull.on('change', function () {
        fullscreenToggleElement.classList.toggle('enabled', screenfull.isFullscreen);
      });
    }

    // ========== MOSTRAR/OCULTAR MENÚ ==========
    function showSceneList() {
      if (sceneListElement) sceneListElement.classList.add('enabled');
      if (sceneListToggleElement) sceneListToggleElement.classList.add('enabled');
    }

    function hideSceneList() {
      if (sceneListElement) sceneListElement.classList.remove('enabled');
      if (sceneListToggleElement) sceneListToggleElement.classList.remove('enabled');
    }

    if (sceneListToggleElement) {
      sceneListToggleElement.addEventListener("click", function () {
        var isEnabled = sceneListElement.classList.toggle("enabled");
        sceneListToggleElement.classList.toggle("enabled", isEnabled);
      });
    }

    // ========== BOTONES DE CONTROL ==========
    var velocity = 0.7;
    var zoomSpeed = 0.7;

    var el;
    el = document.getElementById('viewLeft');
    if (el) el.addEventListener('click', function () { 
      if (activeView) activeView.setYaw(activeView.yaw() - velocity); 
    });
    
    el = document.getElementById('viewRight');
    if (el) el.addEventListener('click', function () { 
      if (activeView) activeView.setYaw(activeView.yaw() + velocity); 
    });
    
    el = document.getElementById('viewUp');
    if (el) el.addEventListener('click', function () { 
      if (activeView) activeView.setPitch(activeView.pitch() + velocity); 
    });
    
    el = document.getElementById('viewDown');
    if (el) el.addEventListener('click', function () { 
      if (activeView) activeView.setPitch(activeView.pitch() - velocity); 
    });
    
    el = document.getElementById('viewIn');
    if (el) el.addEventListener('click', function () { 
      if (activeView) activeView.setFov(activeView.fov() - zoomSpeed); 
    });
    
    el = document.getElementById('viewOut');
    if (el) el.addEventListener('click', function () { 
      if (activeView) activeView.setFov(activeView.fov() + zoomSpeed); 
    });

    // ========== GIROSCOPIO (MÓVIL) ==========
    if (bowser.mobile) {
      let basePitch = null;
      let baseYaw = null;

      function getScreenOrientationAngle() {
        if (window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
          return window.screen.orientation.angle;
        }
        return 0;
      }

      window.addEventListener('deviceorientation', function (event) {
        let yaw = event.alpha ? event.alpha * Math.PI / 180 : 0;
        let pitch = event.beta ? event.beta * Math.PI / 180 : 0;

        const screenAngleRad = getScreenOrientationAngle() * Math.PI / 180;
        let adjustedYaw = yaw;
        let adjustedPitch = pitch;

        if (screenAngleRad === Math.PI / 2) {
          adjustedYaw = pitch;
          adjustedPitch = -yaw;
        } else if (screenAngleRad === -Math.PI / 2 || screenAngleRad === 270 * Math.PI / 180) {
          adjustedYaw = -pitch;
          adjustedPitch = yaw;
        } else if (screenAngleRad === Math.PI) {
          adjustedYaw = -yaw;
          adjustedPitch = -pitch;
        }

        if (basePitch === null) {
          basePitch = adjustedPitch;
          baseYaw = adjustedYaw;
        }

        if (activeView) {
          activeView.setYaw(-(adjustedYaw - baseYaw));
          activeView.setPitch(-(adjustedPitch - basePitch));
        }
      }, true);
    }

    // ========== EVENTOS DE ESCENA ==========
    scenes.forEach(function (scene) {
      var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
      if (!el) return;
      el.addEventListener('click', function () {
        switchScene(scene);
        if (document.body.classList.contains('mobile') || window.innerWidth < 768) {
          hideSceneList();
        }
      });
    });

    // ========== FUNCIONES HELPER ==========
    function findSceneById(id) {
      return scenes.find(function (s) { return s.data.id === id; });
    }

    function findSceneDataById(id) {
      return (data.scenes || []).find(function (s) { return s.id === id; });
    }

    // ========== INICIALIZAR PRIMERA ESCENA ==========
    if (scenes.length > 0) {
      var start = scenes.find(s => s.data && s.data.id === FIRST_SCENE_ID) || scenes[0];
      switchScene(start);
    }

    // No mostrar menú en móvil por defecto
    if (!document.body.classList.contains('mobile') && window.innerWidth >= 768) {
      showSceneList();
    }
  }

  // ========== PROTECCIÓN DE CONTENIDO ==========
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('selectstart', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (
      e.key === 'F12' || 
      (e.ctrlKey && (e.key === 'c' || e.key === 's' || e.key === 'u' || e.key === 'i')) ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
    ) {
      e.preventDefault();
    }
  });

  // ========== ANIMACIONES Y EFECTOS ==========
  
  // Efecto parallax en el título
  document.addEventListener('mousemove', function(e) {
    const titleLogo = document.querySelector('.title-logo');
    if (titleLogo && window.innerWidth > 768) {
      const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
      titleLogo.style.transform = `translateX(${xAxis}px) translateY(${yAxis}px)`;
    }
  });

  // Mostrar indicador de carga
  window.addEventListener('load', function() {
    document.body.classList.add('loaded');
    
    // Animación de entrada suave
    setTimeout(() => {
      const titleBar = document.getElementById('titleBar');
      if (titleBar) {
        titleBar.style.opacity = '1';
        titleBar.style.transform = 'translateY(0)';
      }
    }, 300);
  });

  // Detectar dispositivo móvil
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    document.body.classList.add('mobile');
  } else {
    document.body.classList.add('desktop');
  }

  // Notificación de bienvenida (opcional)
  setTimeout(() => {
    if (window.token) {
      console.log('🎉 ¡Bienvenido a Medellín 360°!');
      console.log('🌍 Explora la ciudad de la eterna primavera');
      console.log('📱 The Medellin Adventure Tour Operador');
    }
  }, 2000);

  // ========== OPTIMIZACIÓN DE RENDIMIENTO ==========
  
  // Lazy loading para imágenes
  const observerOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.01
  };

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, observerOptions);

  // Observar todas las imágenes con data-src
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });

  // Optimizar rendimiento de scroll
  let ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        // Realizar operaciones de scroll aquí
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // ========== ANALYTICS Y TRACKING (OPCIONAL) ==========
  
  // Tracking de escenas visitadas
  const visitedScenes = new Set();
  
  function trackSceneVisit(sceneId, sceneName) {
    if (!visitedScenes.has(sceneId)) {
      visitedScenes.add(sceneId);
      console.log(`📍 Escena visitada: ${sceneName}`);
      
      // Aquí podrías enviar datos a Google Analytics o similar
      // gtag('event', 'scene_view', { scene_id: sceneId, scene_name: sceneName });
    }
  }

  // ========== MANEJO DE ERRORES GLOBAL ==========
  
  window.addEventListener('error', function(e) {
    console.error('Error capturado:', e.error);
    // Aquí podrías enviar errores a un servicio de logging
  });

  window.addEventListener('unhandledrejection', function(e) {
    console.error('Promesa rechazada:', e.reason);
    // Manejo de promesas rechazadas
  });

  // ========== GESTIÓN DE MEMORIA ==========
  
  // Limpiar recursos cuando el usuario sale
  window.addEventListener('beforeunload', function() {
    // Pausar música
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.src = '';
    }
    
    // Detener videos
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
      video.src = '';
    });
    
    console.log('🔄 Recursos liberados');
  });

  // ========== DETECCIÓN DE CONEXIÓN ==========
  
  window.addEventListener('online', function() {
    console.log('✅ Conexión restaurada');
    // Opcional: mostrar notificación al usuario
  });

  window.addEventListener('offline', function() {
    console.log('❌ Sin conexión a internet');
    // Opcional: mostrar notificación al usuario
  });

  // ========== SOPORTE PARA PWA (PROGRESSIVE WEB APP) ==========
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Descomentá esta línea si querés agregar un service worker
      // navigator.serviceWorker.register('/service-worker.js')
      //   .then(reg => console.log('Service Worker registrado', reg))
      //   .catch(err => console.log('Error en Service Worker', err));
    });
  }

  // ========== ACCESIBILIDAD ==========
  
  // Navegación con teclado
  document.addEventListener('keydown', function(e) {
    // ESC para cerrar modales
    if (e.key === 'Escape') {
      const carruselContainer = document.getElementById('carruselContainer');
      const bigVideoOverlay = document.getElementById('bigVideoOverlay');
      
      if (carruselContainer && carruselContainer.style.display !== 'none') {
        document.getElementById('cerrarCarrusel').click();
      }
      
      if (bigVideoOverlay && bigVideoOverlay.classList.contains('visible')) {
        document.getElementById('bigCloseBtn').click();
      }
    }
    
    // M para toggle de música
    if (e.key === 'm' || e.key === 'M') {
      const musicToggle = document.getElementById('musicToggle');
      if (musicToggle) musicToggle.click();
    }
    
    // Espacio para toggle de autorotate
    if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const autorotateToggle = document.getElementById('autorotateToggle');
      if (autorotateToggle) autorotateToggle.click();
    }
  });

  // ========== INFORMACIÓN DE DEBUG (SOLO DESARROLLO) ==========
  
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('%c🏙️ MEDELLÍN 360° - THE MEDELLIN ADVENTURE', 
      'font-size: 20px; font-weight: bold; color: #FF6B35;');
    console.log('%c✨ Tour Virtual Profesional', 
      'font-size: 14px; color: #004E89;');
    console.log('%c📱 Versión: 2.0.0', 
      'font-size: 12px; color: #FFD700;');
    console.log('%c💻 Desarrollado con ❤️ por The Medellin Adventure Team', 
      'font-size: 11px; color: #666;');
    
    // Exponer funciones útiles para debug
    window.debugInfo = {
      getScenes: () => scenes,
      getCurrentScene: () => currentScene,
      getViewer: () => viewer,
      version: '2.0.0'
    };
  }

  // ========== MEJORAS DE UX ==========
  
  // Tooltip mejorado para botones
  const buttons = document.querySelectorAll('button, a[title]');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    });
  });

  // Feedback visual al hacer clic
  document.addEventListener('click', function(e) {
    const target = e.target.closest('button, a, .hotspot');
    if (target) {
      target.style.transform = 'scale(0.95)';
      setTimeout(() => {
        target.style.transform = '';
      }, 150);
    }
  }, true);

  // ========== MENSAJES DE CONSOLA PERSONALIZADOS ==========
  
  console.log('%c🌎 ¡Gracias por elegir The Medellin Adventure!', 
    'background: linear-gradient(135deg, #FF6B35 0%, #004E89 100%); color: white; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: bold;');
  
  console.log('%c📞 Contáctanos: +57 324 761 5677', 
    'color: #25D366; font-size: 12px; font-weight: bold;');
  
  console.log('%c🌐 Web: https://themedellinadventure-com.webnode.com.co/', 
    'color: #FFD700; font-size: 12px;');

})();

// ========== FIN DEL SCRIPT ==========
