import { getSetting } from './db';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  error?: string;
}

export async function analyzeWithClaude(
  financialData: string,
  apiKey?: string
): Promise<ClaudeResponse> {
  const key = apiKey || await getSetting('claude_api_key');

  if (!key) {
    return {
      content: '',
      error: 'No se encontró API key de Claude. Por favor configúrala en Configuración.',
    };
  }

  const systemPrompt = `Eres un asesor financiero personal experto en finanzas personales para Argentina.
Analizas los datos financieros del usuario y proporcionas consejos prácticos, detallados y accionables.
Tu análisis debe ser en español argentino, empático y constructivo.
Considera el contexto económico argentino (inflación, dólar, etc.) cuando sea relevante.
Formatea tu respuesta con Markdown para mejor legibilidad.`;

  const userPrompt = `Por favor analiza mis datos financieros del período y dame:

1. **Análisis general** de mi situación financiera
2. **Evaluación de la regla 50/30/20**: ¿Cómo estoy respecto a los límites recomendados?
3. **Alertas** sobre gastos excesivos o categorías preocupantes
4. **Consejos de ahorro** específicos y prácticos para mi situación
5. **Sugerencias de inversión** apropiadas para el contexto argentino
6. **Proyección** si continúo con este patrón de gastos
7. **3 acciones concretas** que puedo tomar este mes para mejorar mis finanzas

Aquí están mis datos:

${financialData}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = (errorData as { error?: { message?: string } }).error?.message || `Error HTTP ${response.status}`;
      return { content: '', error: `Error al llamar a Claude: ${errorMsg}` };
    }

    const data = await response.json() as {
      content: { type: string; text: string }[];
    };
    const content = data.content?.[0]?.text ?? '';

    return { content };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return { content: '', error: `Error de red: ${message}` };
  }
}
