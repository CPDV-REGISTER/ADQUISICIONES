import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI, SchemaType } from "https://esm.sh/@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            proveedor_rut: { type: SchemaType.STRING },
            proveedor_razon_social: { type: SchemaType.STRING },
            fecha_cotizacion: { type: SchemaType.STRING },
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  descripcion: { type: SchemaType.STRING },
                  cantidad: { type: SchemaType.NUMBER },
                  precio_unitario: { type: SchemaType.NUMBER },
                  monto_total: { type: SchemaType.NUMBER }
                },
                required: ["descripcion", "cantidad", "precio_unitario"]
              }
            },
            monto_total_cotizacion: { type: SchemaType.NUMBER }
          },
          required: ["proveedor_razon_social", "items", "monto_total_cotizacion"]
        }
      }
    });

    const prompt = "Analiza este documento de cotización o propuesta económica. Extrae el RUT y nombre del proveedor, fecha, desglose de ítems (descripción, cantidad, precio unitario y total) y el monto total final.";

    const pdfPart = {
      inlineData: {
        data: pdfBase64,
        mimeType: "application/pdf"
      }
    };

    const result = await model.generateContent([prompt, pdfPart]);
    const datosJSON = JSON.parse(result.response.text());

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
