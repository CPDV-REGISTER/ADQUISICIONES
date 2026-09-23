import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de peticiones preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      throw new Error('No se recibió el archivo PDF en base64');
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada en los Secrets de Supabase');
    }

    // Esquema de respuesta esperado en JSON
    const responseSchema = {
      type: "OBJECT",
      properties: {
        proveedor_rut: { type: "STRING" },
        proveedor_razon_social: { type: "STRING" },
        fecha_cotizacion: { type: "STRING" },
        items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              descripcion: { type: "STRING" },
              cantidad: { type: "NUMBER" },
              precio_unitario: { type: "NUMBER" },
              monto_total: { type: "NUMBER" }
            },
            required: ["descripcion", "cantidad", "precio_unitario"]
          }
        },
        monto_total_cotizacion: { type: "NUMBER" }
      },
      required: ["proveedor_razon_social", "items", "monto_total_cotizacion"]
    };

    const prompt = "Analiza este documento de cotización o propuesta económica. Extrae el RUT y nombre del proveedor, fecha, desglose de ítems (descripción, cantidad, precio unitario y total) y el monto total final.";

    // Petición HTTP directa a la API REST de Gemini
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfBase64
                }
              }
            ]
          }],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: responseSchema
          }
        })
      }
    );

    const result = await geminiResponse.json();

    if (!geminiResponse.ok) {
      // Retorna el error exacto que entregue Google en lugar de un 400 genérico
      throw new Error(result.error?.message || 'Error al comunicarse con Gemini API');
    }

    // Extraer y parsear la respuesta JSON generada
    const textResponse = result.candidates[0].content.parts[0].text;
    const datosJSON = JSON.parse(textResponse);

    return new Response(JSON.stringify(datosJSON), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
