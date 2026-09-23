// 1. Reemplaza estos valores por los reales de tu panel en Supabase (Project Settings -> API)
const SUPABASE_URL = "https://avnvblywgpqgqomdgcgt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Oc2UCzUT2_f9t95H4erOTQ_VIsbtYX7";

// 2. Usamos 'supabaseClient' para evitar la colisión de nombres (SyntaxError)
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
    const base64String = reader.result.split(',')[1];

    try {
      // Llamar a la Edge Function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/extraer-cotizacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
