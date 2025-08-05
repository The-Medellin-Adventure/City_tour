/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  var viewer = new Marzipano.Viewer(panoElement, {
    controls: { mouseViewMode: data.settings.mouseViewMode }
  });

  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" }
    );
    var geometry = new Marzipano.CubeGeometry(data.levels);
    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);
    var scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });

    if (data.hotSpots) {
      data.hotSpots.forEach(function(hotspot) {
        if (hotspot.type === "camera") {
          var element = createCameraHotspot(hotspot);
          scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
        }
      });
    }

    data.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    data.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    if (data.id === "0-plaza-botero-botero") {
      var audioElement = createAudioHotspot(1.0, 0.1, 'audio/audio1.mp3');
      scene.hotspotContainer().createHotspot(audioElement, { yaw: 1.0, pitch: 0.1 });
    }

    return { data, scene, view };
  });

  switchScene(scenes[0]);

  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'link-hotspot');

    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');
    icon.style.transform = 'rotate(' + hotspot.rotation + 'rad)';

    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip', 'link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

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
    title.innerHTML = hotspot.title;
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
    text.innerHTML = hotspot.text;

    wrapper.appendChild(header);
    wrapper.appendChild(text);

    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    return wrapper;
  }

  function createCameraHotspot(hotspot) {
    var element = document.createElement('img');
    element.src = hotspot.image;
    element.alt = hotspot.title || "Foto";
    element.className = "camera-hotspot-icon";
    element.style.width = "48px";
    element.style.height = "48px";
    element.style.cursor = "pointer";
    element.style.borderRadius = "50%";
    element.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
    element.title = hotspot.title || "";

    if (hotspot.carrusel) {
      element.addEventListener('click', mostrarCarrusel);
    } else {
      element.addEventListener('click', function() {
        showImageModal(hotspot.photo, hotspot.title);
      });
    }

    return element;
  }

  function showImageModal(photoSrc, title) {
    var oldModal = document.getElementById('custom-image-modal');
    if (oldModal) oldModal.remove();

    var modal = document.createElement('div');
    modal.id = 'custom-image-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';

    var content = document.createElement('div');
    content.style.background = '#fff';
    content.style.borderRadius = '10px';
    content.style.padding = '20px';
    content.style.boxShadow = '0 8px 32px rgba(0,0,0,0.32)';
    content.style.position = 'relative';

    var img = document.createElement('img');
    img.src = photoSrc;
    img.alt = title || "";
    img.style.maxWidth = '90vw';
    img.style.maxHeight = '80vh';
    img.style.borderRadius = '8px';
    content.appendChild(img);

    if (title) {
      var caption = document.createElement('div');
      caption.textContent = title;
      caption.style.marginTop = '10px';
      caption.style.fontWeight = 'bold';
      caption.style.textAlign = 'center';
      content.appendChild(caption);
    }

    var close = document.createElement('span');
    close.textContent = '×';
    close.style.position = 'absolute';
    close.style.top = '8px';
    close.style.right = '16px';
    close.style.cursor = 'pointer';
    close.style.fontSize = '2rem';
    close.style.color = '#222';
    close.addEventListener('click', function() {
      modal.remove();
    });
    content.appendChild(close);

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });
  }

  function mostrarCarrusel() {
    var modal = document.getElementById('carruselModal');
    modal.style.display = 'flex';
    carruselSwiper.update();
  }

  function createAudioHotspot(yaw, pitch, audioSrc) {
    var hotspot = document.createElement('div');
    hotspot.classList.add('hotspot-audio');

    var icon = document.createElement('img');
    icon.src = 'img/audio-icon.png';
    icon.style.width = '40px';
    icon.style.cursor = 'pointer';
    icon.style.transition = 'transform 0.2s';
    icon.addEventListener('mouseover', function () {
      icon.style.transform = 'scale(1.2)';
    });
    icon.addEventListener('mouseout', function () {
      icon.style.transform = 'scale(1)';
    });

    var audio = document.createElement('audio');
    audio.src = audioSrc;
    audio.preload = 'auto';

    icon.addEventListener('click', function () {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    });

    hotspot.appendChild(icon);
    hotspot.appendChild(audio);
    return hotspot;
  }

  function switchScene(scene) {
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    sceneNameElement.innerHTML = scene.data.name;
  }

  function findSceneById(id) {
    return scenes.find(s => s.data.id === id);
  }

  function findSceneDataById(id) {
    return data.scenes.find(s => s.id === id);
  }

})();