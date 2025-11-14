// Servidor MCP para Telnyx: Función 'agendar_cita' con Cal.com

// NOTA: 'fetch' está disponible globalmente en Vercel
const CAL_API_URL = 'https://api.cal.com/v1/bookings';

// La API Key debe estar en tus VARIABLES DE ENTORNO en Vercel, bajo el nombre CAL_API_KEY
const CAL_API_KEY = process.env.CAL_API_KEY; 

// El SLUG del tipo de evento en Cal.com (el que dice 'terminal-netpay')
const EVENT_TYPE_SLUG = 'terminal-netpay'; 
// Zona horaria: Se asume que es la Ciudad de México, ajústala si es necesario.
const TIME_ZONE = 'America/Mexico_City'; 
// Duración: Se asume 60 minutos según tu evento 'Terminal Netpay'

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        // Telnyx siempre enviará una solicitud POST
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = request.body;
        
        // Verifica que la solicitud de Telnyx sea para la herramienta correcta
        if (body.tool !== 'agendar_cita') {
            return response.status(400).json({ status: 'error', message: `Función no soportada: ${body.tool}` });
        }
        
        // Extrae los parámetros que el Agente de IA debe haber recolectado
        const { prospect_name, date, time, prospect_email } = body.arguments;

        // --- 1. Formato de Fecha/Hora para Cal.com (ISO 8601) ---
        const startDateTime = new Date(`${date}T${time}:00`);
        // Calcula la hora de finalización (60 minutos después)
        const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000)); 

        // --- 2. Llamada a la API de Cal.com ---
        const calResponse = await fetch(CAL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CAL_API_KEY}`, // Usa tu clave API secreta aquí
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventType: EVENT_TYPE_SLUG,
                start: startDateTime.toISOString(),
                end: endDateTime.toISOString(),
                timeZone: TIME_ZONE,
                name: `Cita NetPay - ${prospect_name}`,
                email: prospect_email,
                guests: [{ email: prospect_email, name: prospect_name }],
            })
        });

        const calData = await calResponse.json();

        // --- 3. Devolver la respuesta a Telnyx ---
        if (calResponse.ok) {
            // ÉXITO: El agente de IA recibirá esto y sabrá que la cita fue exitosa.
            return response.status(200).json({ 
                status: 'success', 
                result: `Cita confirmada con éxito. El enlace de la reunión es ${calData.booking.url}` 
            });
        } else {
            // ERROR: La IA recibirá esto y podrá disculparse/reagendar.
            console.error('Cal.com Error:', calData);
            return response.status(500).json({ status: 'error', result: `Error al agendar: ${calData.message || 'La fecha u hora no están disponibles.'}` });
        }

    } catch (error) {
        console.error('Error del servidor MCP:', error);
        return response.status(500).json({ status: 'error', result: 'Ocurrió un error inesperado. Por favor, intente con otro horario.' });
    }
}
