import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.pdfBase64) {
      return new Response(
        JSON.stringify({ error: "No se recibió el parámetro 'pdfBase64'." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Falta la variable GEMINI_API_KEY en los Secrets de Supabase." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Esquema de datos JSON estructurado
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

    // ✅ Usamos gemini-2.5-flash (o gemini-1.5-flash-latest) para evitar el error de endpoint no encontrado
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: body.pdfBase64
              }
            }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      })
    });

    const result = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const msg = result.error?.message || JSON.stringify(result);
      return new Response(
        JSON.stringify({ error: `Error desde Gemini API: ${msg}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      return new Response(
        JSON.stringify({ error: "Gemini API no devolvió una respuesta válida." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const datosJSON = JSON.parse(textResponse);

    return new Response(JSON.stringify(datosJSON), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
