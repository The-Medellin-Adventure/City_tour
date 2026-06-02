// MEDELLÍN 360° - VERSIÓN COMPLETA CON TOKENS Y VIDEOS
'use strict';

(function () {
  var Marzipano = window.Marzipano;
  var data = window.APP_DATA || {};

  window.token = new URLSearchParams(window.location.search).get("token");
  const FIRST_SCENE_ID = "0-plaza-botero-botero";

  var panoElement = document.getElementById('pano');
  var sceneNameElement = document.getElementById('sceneTitle');
  var sceneListElement = document.getElementById('sceneList');
  var sceneListToggleElement = document.getElementById('sceneListToggle');
  var autorotateToggleElement = document.getElementById('autorotateToggle');
  var fullscreenToggleElement = document.getElementById('fullscreenToggle');
  var musicToggleElement = document.getElementById('musicToggle');

  if (!panoElement || !data.scenes) {
    console.error('❌ Error: falta #pano o data');
    return;
  }

  var viewer = new Marzipano.Viewer(panoElement, { controls: { mouseViewMode: 'drag' } });
  window.viewer = viewer;

  var currentScene = null;
  var activeView = null;
  var currentSwiper = null;
  var currentVideoSceneId = null;
  var currentVideoTimeout = null;
  var bigOverlayOpen = false;
  var smallStartTimeout = null;

  // ========== VERIFICACIÓN TOKEN ==========
  if (window.token) {
    fetch(`https://citytour360.vercel.app/api/verify-token?token=${window.token}`, { 
      headers: { Accept: "application/json" } 
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok === false) {
        showErrorMessage("🚫 Acceso Denegado", data.error || "Token inválido");
        ocultarUI();
      } else {
        mostrarUI();
      }
    })
    .catch(err => {
      console.error("Error verificando token:", err);
      showErrorMessage("🚫 Error de Acceso", "No se pudo verificar el token");
      ocultarUI();
    });
  } else {
    showErrorMessage("🚫 Token Requerido", "Necesitas un token válido");
    ocultarUI();
  }

  function ocultarUI() {
    document.querySelectorAll('.link-hotspot-icon, .camera-hotspot-icon, #sceneList, #titleBar, #videoCard, .viewControlButton').forEach(el => {
      if (el) el.style.display = 'none';
    });
  }

  function mostrarUI() {
    document.querySelectorAll('.link-hotspot-icon, .camera-hotspot-icon, #sceneList, #titleBar, #videoCard, .viewControlButton').forEach(el => {
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
        <h2 style="font-size: 32px; margin-bottom: 20px;">${titulo}</h2>
        <p style="margin-bottom: 24px;">${mensaje}</p>
        <p style="font-size: 16px; opacity: 0.9;">The Medellin Adventure</p>
      </div>
    `;
  }

  // ========== VIDEOS ==========
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

  // ========== CARRUSEL ==========
  function mostrarCarrusel(imagenes, titulo) {
    imagenes = Array.isArray(imagenes) ? imagenes : [];
    const container = document.getElementById('carruselContainer');
    const tituloEl = document.getElementById('carruselTitulo');
    const wrapper = document.querySelector('#carrusel .swiper-wrapper');
    
    if (!container || !wrapper) return;
    
    tituloEl.textContent = titulo || '';
    wrapper.innerHTML = '';
    
    imagenes.forEach(img => {
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;padding:20px;">
          <img src="/api/signed-url?token=${window.token}&file=${encodeURIComponent(img.src || img.url || '')}"
               alt="${img.caption || ''}"
               style="max-width:90%;max-height:60vh;object-fit:contain;border-radius:12px;" />
          ${img.caption ? `<p style="margin-top:16px;color:#1a1a2e;font-size:15px;text-align:center;">${img.caption}</p>` : ""}
        </div>
      `;
      wrapper.appendChild(slide);
    });
    
    container.style.display = 'flex';
    
    if (currentSwiper) {
      try { currentSwiper.destroy(true, true); } catch (e) {}
    }
    
    setTimeout(() => {
      currentSwiper = new Swiper('.carrusel-swiper', {
        loop: imagenes.length > 1,
        slidesPerView: 1,
        autoplay: { delay: 4000 },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        effect: 'fade',
        fadeEffect: { crossFade: true }
      });
    }, 100);
    
    var cerrarBtn = document.getElementById('cerrarCarrusel');
    if (cerrarBtn) {
      cerrarBtn.onclick = () => {
        container.style.display = 'none';
        if (currentSwiper) {
          try { currentSwiper.destroy(true, true); } catch (e) {}
          currentSwiper = null;
        }
      };
    }
  }
  window.mostrarCarrusel = mostrarCarrusel;

  // ========== CREAR ESCENAS ==========
  function createScene(sceneData) {
    var urlPrefix = `/api/signed-url?token=${window.token}&file=tiles/${sceneData.id}`;
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/preview.jpg" }
    );
    
    var geometry = new Marzipano.CubeGeometry(sceneData.levels);
    var limiter = Marzipano.RectilinearView.limit.traditional(sceneData.faceSize, 100 * Math.PI / 180, 120 * Math.PI / 180);
    var view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);
    var scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
    
    (sceneData.linkHotspots || []).forEach(hotspot => {
      var element = createLinkHotspot(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });
    
    (sceneData.infoHotspots || []).forEach(hotspot => {
      var element = createInfoHotspot(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });
    
    (sceneData.hotSpots || []).forEach(hotspot => {
      if (hotspot.type === "camera") {
        var element = createCameraHotspot(hotspot);
        scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
      }
    });
    
    return { data: sceneData, scene, view };
  }

  function createLinkHotspot(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.className = 'hotspot link-hotspot';
    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.className = 'link-hotspot-icon';
    if (hotspot.rotation) icon.style.transform = 'rotate(' + hotspot.rotation + 'rad)';
    wrapper.appendChild(icon);
    
    var tooltip = document.createElement('div');
    tooltip.className = 'hotspot-tooltip link-hotspot-tooltip';
    var sceneData = findSceneDataById(hotspot.target);
    tooltip.innerHTML = (sceneData && sceneData.name) ? sceneData.name : '';
    wrapper.appendChild(tooltip);
    
    wrapper.addEventListener('click', () => {
      var s = findSceneById(hotspot.target);
      if (s) switchScene(s);
    });
    return wrapper;
  }

  function createInfoHotspot(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.className = 'hotspot info-hotspot';
    
    var header = document.createElement('div');
    header.className = 'info-hotspot-header';
    var iconWrapper = document.createElement('div');
    iconWrapper.className = 'info-hotspot-icon-wrapper';
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.className = 'info-hotspot-icon';
    iconWrapper.appendChild(icon);
    header.appendChild(iconWrapper);
    
    var text = document.createElement('div');
    text.className = 'info-hotspot-text';
    text.innerHTML = hotspot.text || '';
    
    wrapper.appendChild(header);
    wrapper.appendChild(text);
    
    var modal = document.createElement('div');
    modal.innerHTML = '<div class="info-hotspot-header">' + header.innerHTML + '</div><div class="info-hotspot-text">' + (hotspot.text || '') + '</div>';
    modal.className = 'info-hotspot-modal';
    document.body.appendChild(modal);
    
    var toggle = () => {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };
    
    header.addEventListener('click', toggle);
    text.addEventListener('click', e => {
      var rect = text.getBoundingClientRect();
      if (e.clientX - rect.left > rect.width - 50 && e.clientY - rect.top < 50) toggle();
    });
    
    return wrapper;
  }

  function createCameraHotspot(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.className = 'hotspot camera-hotspot';
    var icon = document.createElement('img');
    icon.src = hotspot.image || 'img/Camara.png';
    icon.className = 'camera-hotspot-icon';
    icon.title = hotspot.tooltip || 'Ver galería';
    
    icon.addEventListener('click', e => {
      e.stopPropagation();
      if (hotspot.carrusel && hotspot.images?.length) {
        mostrarCarrusel(hotspot.images, hotspot.tooltip || '');
      }
    });
    
    wrapper.appendChild(icon);
    return wrapper;
  }

  var scenes = (data.scenes || []).map(createScene);

  // ========== CAMBIO DE ESCENA CON VIDEOS ==========
  function switchScene(scene) {
    if (!scene) return;
    
    // Limpiar videos
    try {
      if (currentVideoTimeout) clearTimeout(currentVideoTimeout);
      if (smallStartTimeout) clearTimeout(smallStartTimeout);
      
      const smallV = document.getElementById('sceneVideo');
      const bigV = document.getElementById('bigSceneVideo');
      if (smallV) { smallV.pause(); try { smallV.currentTime = 0; } catch (e) {} }
      if (bigV) { bigV.pause(); try { bigV.currentTime = 0; } catch (e) {} }
      
      const overlay = document.getElementById('bigVideoOverlay');
      const backdrop = document.getElementById('bigVideoBackdrop');
      if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.style.display = 'none', 400);
      }
      if (backdrop) {
        backdrop.classList.remove('visible');
        setTimeout(() => backdrop.style.display = 'none', 400);
      }
      bigOverlayOpen = false;
    } catch (e) {}
    
    // Cambiar escena
    scene.scene.switchTo({ transitionDuration: 1000 });
    updateSceneName(scene);
    updateSceneList(scene);
    activeView = scene.view;
    currentScene = scene;
    
    try { scene.view.setParameters(scene.data.initialViewParameters); } catch (e) {}
    
    // Videos
    updateVideoForScene(scene.data.id);
    showBigOverlayForScene(scene.data.id);
    
    // Menú
    if (scene.data.id === FIRST_SCENE_ID && window.innerWidth >= 768) {
      sceneListElement.classList.add('enabled');
    }
  }

  // ========== VIDEO GRANDE (INSTRUCCIONES) ==========
  function showBigOverlayForScene(sceneId) {
    const overlay = document.getElementById("bigVideoOverlay");
    const backdrop = document.getElementById("bigVideoBackdrop");
    const bigVideo = document.getElementById("bigSceneVideo");
    const playBtn = document.getElementById("bigPlayPauseBtn");
    const muteBtn = document.getElementById("bigMuteBtn");
    const closeBtn = document.getElementById("bigCloseBtn");
    
    if (!overlay || !bigVideo || !bigSceneVideos[sceneId]) {
      if (overlay) overlay.style.display = "none";
      if (backdrop) backdrop.style.display = "none";
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
      }, 400);
      try { bigVideo.pause(); bigVideo.currentTime = 0; } catch (e) {}
      bigOverlayOpen = false;
      
      smallStartTimeout = setTimeout(() => updateVideoForScene(sceneId, 0), 3000);
    }
    
    if (closeBtn) closeBtn.onclick = closeOverlay;
    if (backdrop) backdrop.onclick = e => { if (e.target === backdrop) closeOverlay(); };
    bigVideo.onended = closeOverlay;
  }

  // ========== VIDEO PEQUEÑO LATERAL ==========
  function updateVideoForScene(sceneId, forceDelay) {
    const videoCard = document.getElementById("videoCard");
    const sceneVideo = document.getElementById("sceneVideo");
    if (!videoCard || !sceneVideo) return;
    
    if (currentVideoTimeout) clearTimeout(currentVideoTimeout);
    if (smallStartTimeout) clearTimeout(smallStartTimeout);
    
    if (currentVideoSceneId && currentVideoSceneId !== sceneId) {
      sceneVideo.pause();
      try { sceneVideo.currentTime = 0; } catch (e) {}
    }
    
    if ((bigSceneVideos[sceneId] && bigOverlayOpen) || !sceneVideos[sceneId]) {
      videoCard.classList.remove("visible");
      currentVideoSceneId = null;
      return;
    }
    
    currentVideoSceneId = sceneId;
    sceneVideo.src = sceneVideos[sceneId];
    sceneVideo.load();
    videoCard.classList.add("visible");
    
    let delay = typeof forceDelay === "number" ? forceDelay : (sceneId === FIRST_SCENE_ID ? 0 : 3000);
    
    currentVideoTimeout = setTimeout(() => {
      sceneVideo.play().catch(() => {});
    }, delay);
    
    sceneVideo.onended = () => {
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
      if (video.paused) { video.play(); playPauseBtn.textContent = "⏸"; }
      else { video.pause(); playPauseBtn.textContent = "▶"; }
    });
    
    muteBtn.addEventListener("click", () => {
      video.muted = !video.muted;
      muteBtn.textContent = video.muted ? "🔇" : "🔊";
    });
    
    closeVideoBtn.addEventListener("click", () => {
      video.pause();
      videoCardEl.classList.remove("visible");
      setTimeout(() => videoIcon.style.display = "block", 400);
    });
    
    videoIcon.addEventListener("click", () => {
      videoCardEl.classList.add("visible");
      videoIcon.style.display = "none";
    });
  }

  // ========== BOTÓN INSTRUCCIONES ==========
  const openInstructionsBtn = document.getElementById("openInstructions");
  if (openInstructionsBtn) {
    openInstructionsBtn.addEventListener("click", () => showBigOverlayForScene(FIRST_SCENE_ID));
  }

  function updateSceneName(scene) {
    if (sceneNameElement) sceneNameElement.textContent = scene.data.name || 'Medellín 360°';
  }

  function updateSceneList(scene) {
    document.querySelectorAll('#sceneList .scene').forEach(el => {
      el.classList.remove('current');
      if (el.getAttribute('data-id') === scene.data.id) el.classList.add('current');
    });
  }

  function findSceneById(id) { return scenes.find(s => s.data.id === id); }
  function findSceneDataById(id) { return (data.scenes || []).find(s => s.id === id); }

  // ========== CONTROLES ==========
  if (sceneListToggleElement) {
    sceneListToggleElement.addEventListener('click', () => {
      sceneListElement.classList.toggle('enabled');
      sceneListToggleElement.classList.toggle('enabled');
    });
  }

  var autorotate = Marzipano.autorotate({ yawSpeed: 0.3, targetPitch: -0.2, targetFov: Math.PI / 2 });
  if (autorotateToggleElement) {
    autorotateToggleElement.addEventListener('click', () => {
      if (autorotateToggleElement.classList.contains('enabled')) {
        autorotateToggleElement.classList.remove('enabled');
        viewer.stopMovement();
      } else {
        autorotateToggleElement.classList.add('enabled');
        viewer.startMovement(autorotate);
      }
    });
  }

  if (window.screenfull?.isEnabled && fullscreenToggleElement) {
    fullscreenToggleElement.addEventListener('click', () => window.screenfull.toggle(document.documentElement));
    window.screenfull.on('change', () => fullscreenToggleElement.classList.toggle('enabled', window.screenfull.isFullscreen));
  }

  var bgMusic = document.getElementById('bg-music');
  if (musicToggleElement && bgMusic) {
    bgMusic.volume = 0.3;
    setTimeout(() => {
      bgMusic.play().then(() => {
        musicToggleElement.classList.remove("off");
      }).catch(() => {
        musicToggleElement.classList.add("off");
      });
    }, 500);
    
    musicToggleElement.addEventListener('click', () => {
      if (bgMusic.paused) {
        bgMusic.play().catch(() => {});
        musicToggleElement.classList.remove('off');
      } else {
        bgMusic.pause();
        musicToggleElement.classList.add('off');
      }
    });
  }

  var velocity = 0.7, zoomSpeed = 0.7;
  document.getElementById('viewLeft')?.addEventListener('click', () => activeView && activeView.setYaw(activeView.yaw() - velocity));
  document.getElementById('viewRight')?.addEventListener('click', () => activeView && activeView.setYaw(activeView.yaw() + velocity));
  document.getElementById('viewUp')?.addEventListener('click', () => activeView && activeView.setPitch(activeView.pitch() + velocity));
  document.getElementById('viewDown')?.addEventListener('click', () => activeView && activeView.setPitch(activeView.pitch() - velocity));
  document.getElementById('viewIn')?.addEventListener('click', () => activeView && activeView.setFov(activeView.fov() - zoomSpeed));
  document.getElementById('viewOut')?.addEventListener('click', () => activeView && activeView.setFov(activeView.fov() + zoomSpeed));

  scenes.forEach(scene => {
    var el = document.querySelector(`#sceneList .scene[data-id="${scene.data.id}"]`);
    if (el) {
      el.addEventListener('click', () => {
        switchScene(scene);
        if (window.innerWidth < 768) sceneListElement.classList.remove('enabled');
      });
    }
  });

  // INICIALIZAR
  if (scenes.length > 0) {
    var start = scenes.find(s => s.data?.id === FIRST_SCENE_ID) || scenes[0];
    switchScene(start);
  }

  if (window.innerWidth >= 768) {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  console.log('✅ Medellín 360° - TODO cargado');
})();
