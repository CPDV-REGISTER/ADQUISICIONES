// 1. Configuración de Supabase
const SUPABASE_URL = "https://avnvblywgpqgqomdgcgt.supabase.co";
// ⚠️ Reemplaza esto con tu clave real que empieza por 'eyJ...'
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bnZibHl3Z3BxZ3FvbWRnY2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDUxNTEsImV4cCI6MjEwNTY4MTE1MX0.nRh1GLyxglL4iwIkYkC4WGUdKd9064pNQFiBfSza53w";

// 2. Cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById('pdfInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const statusText = document.getElementById('statusText');
  statusText.style.display = 'block';

  // Convertir PDF a base64
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    // Aseguramos limpiar correctamente la cabecera Data URL
    const rawResult = reader.result;
    const base64String = rawResult.includes(',') ? rawResult.split(',')[1] : rawResult;

    try {
      // Llamar a la Edge Function enviando tanto Authorization como apikey
      const response = await fetch(`${SUPABASE_URL}/functions/v1/extraer-cotizacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ pdfBase64: base64String })
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      const datos = await response.json();

      // Autocompletar la interfaz
      document.getElementById('proveedor_nombre').value = datos.proveedor_razon_social || '';
      document.getElementById('proveedor_rut').value = datos.proveedor_rut || '';

      const itemsBody = document.getElementById('itemsBody');
      itemsBody.innerHTML = '';

      if (datos.items && datos.items.length > 0) {
        datos.items.forEach((item, index) => {
          itemsBody.innerHTML += `
            <tr>
              <td>${index + 1}</td>
              <td><input type="text" value="${item.descripcion || ''}"></td>
              <td><input type="number" value="${item.cantidad || 0}" style="width:60px"></td>
              <td><input type="number" value="${item.precio_unitario || 0}" style="width:90px"></td>
              <td>$${((item.cantidad || 0) * (item.precio_unitario || 0)).toLocaleString()}</td>
            </tr>
          `;
        });
      }

    } catch (err) {
      alert("Error al procesar el archivo con IA: " + err.message);
    } finally {
      statusText.style.display = 'none';
    }
  };
});
