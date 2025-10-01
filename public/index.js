// =========================
// CREAR ESCENAS
// =========================
function createScene(sceneData) {
  // -----------------------------
  // Crear source usando plantilla
  // -----------------------------
  var urlPrefix = `/api/signed-url?token=${window.token}&file=tiles/${sceneData.id}`;

  // IMPORTANTE: según tu bucket -> tiles/<id>/<level>/<face>/<index>.jpg
  var template = urlPrefix + "/{z}/{f}/{x}.jpg";

  var source = Marzipano.ImageUrlSource.fromString(
    template,
    { cubeMapPreviewUrl: urlPrefix + "/preview.jpg" }
  );

  var geometry = new Marzipano.CubeGeometry(sceneData.levels);
  var view = new Marzipano.RectilinearView(sceneData.initialViewParameters);

  var sceneObj = viewer.createScene({
    source: source,
    geometry: geometry,
    view: view,
    pinFirstLevel: true
  });

  // linkHotspots
  (sceneData.linkHotspots || []).forEach(function (hotspot) {
    var element = createLinkHotspotElement(hotspot);
    sceneObj.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
  });

  // infoHotspots
  (sceneData.infoHotspots || []).forEach(function (hotspot) {
    var element = createInfoHotspotElement(hotspot);
    sceneObj.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
  });

  // hotSpots (cámaras u otros)
  (sceneData.hotSpots || []).forEach(function (hotspot) {
    if (hotspot.type === "camera") {
      var element = createCameraHotspot(hotspot);
      sceneObj.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    }
  });

  return { data: sceneData, scene: sceneObj, view: view };
}

// ----------------------------------------------------------
// Resto del código original sigue igual (hotspots, videos,
// fullscreen, carrusel, etc. NO se modificó nada más).
// ----------------------------------------------------------
