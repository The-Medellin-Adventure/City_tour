// Instala primero: npm install @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://mvygkqueffafllfeiztm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eWdrcXVlZmZhZmxsZmVpenRtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg0NjMzNiwiZXhwIjoyMDcyNDIyMzM2fQ.1Ge_qv6V5kX-dWShobMDLUF-6x-q-o-pPssk6JSQZvE';
const BUCKET = 'Tour';

// Lee el archivo de configuración de escenas (ajusta el path si es necesario)
const appData = require('./public/data.js').APP_DATA || require('./public/data.js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verificarTiles() {
  let errores = [];
  for (const scene of appData.scenes) {
    const id = scene.id;
    for (const levelObj of scene.levels) {
      // Determina el nivel (ajusta si tu levels tiene "size" en lugar de número)
      let level = typeof levelObj.size === 'number' ? levelObj.size : levelObj;
      // Marzipano usa niveles 1,2,3 según la exportación
      // Ajusta si tu levels están numerados diferente
      for (const cara of ['f', 'b', 'l', 'r', 'u', 'd']) {
        for (let y = 0; y < 4; y++) { // Ajusta el rango según tu exportación (y/x máximos)
          for (let x = 0; x < 4; x++) {
            const path = `tiles/${id}/${level}/${cara}/${y}/${x}.jpg`;
            const { data, error } = await supabase.storage.from(BUCKET).list(path.replace(/\/[^\/]+$/, ''), { limit: 100 });
            if (error) {
              errores.push({ path, error });
            } else if (!data.find(f => f.name === `${x}.jpg`)) {
              errores.push({ path, error: 'NO EXISTE' });
            }
          }
        }
      }
    }
  }
  if (errores.length === 0) {
    console.log("No faltan archivos");
  } else {
    console.log("FALTAN archivos:");
    errores.forEach(e => console.log(e.path, e.error));
  }
}

verificarTiles();
