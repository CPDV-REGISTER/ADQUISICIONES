const SUPABASE_URL = "https://TU_PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU_ANON_KEY_PUBLICA";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById('pdfInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const statusText = document.getElementById('statusText');
  statusText.style.display = 'block';

  // 1. Convertir archivo PDF a base64
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    const base64String = reader.result.split(',')[1];

    try {
      // 2. Llamar a la Edge Function alojada en Supabase
      const response = await fetch(`${SUPABASE_URL}/functions/v1/extraer-cotizacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ pdfBase64: base64String })
      });

      const datos = await response.json();

      // 3. Autocompletar la pantalla con el JSON resultante
      document.getElementById('proveedor_nombre').value = datos.proveedor_razon_social || '';
      document.getElementById('proveedor_rut').value = datos.proveedor_rut || '';

      const itemsBody = document.getElementById('itemsBody');
      itemsBody.innerHTML = '';

      datos.items.forEach((item, index) => {
        itemsBody.innerHTML += `
          <tr>
            <td>${index + 1}</td>
            <td><input type="text" value="${item.descripcion}"></td>
            <td><input type="number" value="${item.cantidad}" style="width:60px"></td>
            <td><input type="number" value="${item.precio_unitario}" style="width:90px"></td>
            <td>$${(item.cantidad * item.precio_unitario).toLocaleString()}</td>
          </tr>
        `;
      });

    } catch (err) {
      alert("Error al procesar el archivo con IA: " + err.message);
    } finally {
      statusText.style.display = 'none';
    }
  };
});
