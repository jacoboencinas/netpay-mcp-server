import { Client } from '@notionhq/client';

// Asegúrate de que NOTION_TOKEN y NOTION_DB_ID estén configurados en tus variables de entorno de Vercel.
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DB_ID;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Solo se acepta POST' });
    }

    try {
        const retellPayload = req.body;

        // 1. FILTRO DE AHORRO DE COSTOS (GUARDARRAÍL CRÍTICO)
        // Si la duración de la llamada es muy corta (< 10s), omitimos el costoso acceso a la API de Notion.
        if (retellPayload.duration < 10) {
            return res.status(200).json({ mensaje: 'Llamada muy corta, omitiendo Notion para ahorrar recursos.' });
        }
        
        // 2. Extracción de Datos
        const callVariables = retellPayload.variables || {};
        const analysis = retellPayload.analysis_result || {};

        const nombre = callVariables.nombre_prospecto || 'Prospecto sin nombre';
        const telefono = callVariables.to_number || callVariables.from_number || 'No disponible';
        const agente = retellPayload.agent_id || 'Alicia Lopez'; 
        
        // CAMPOS CLAVE DEL PCA
        const followUpTime = analysis.follow_up_time; // Ej: "Mañana 9:30 AM" o "Re-dial Mañana temprano"
        const followUpComment = analysis.follow_up_instructions || 'Sin nota de re-dial.'; 
        
        // 3. Lógica CRÍTICA DE SEGUIMIENTO
        // Ignorar si NO hay tarea o si la cita fue AGENDADA (pues Cal.com se encargará)
        if (!followUpTime || followUpTime.toUpperCase().includes('AGENDADA')) {
            return res.status(200).json({ mensaje: 'Llamada finalizada sin tarea de seguimiento o cita agendada.' });
        }
        
        // 4. CONSOLIDACIÓN: Crear la nota única para el campo 'Comentarios'
        const fullComment = `TAREA: Buscar el ${followUpTime}. MOTIVO: ${followUpComment}. (Agente: ${agente})`; 

        // 5. INSERCIÓN: Crear un nuevo registro para el historial (Insert Only)
        await notion.pages.create({
            parent: { database_id: databaseId },
            properties: {
                // Propiedad Título
                'Nombre': { title: [{ text: { content: nombre } }] }, 
                // Propiedad de Teléfono
                'Teléfono': { rich_text: [{ text: { content: telefono } }] }, 
                // Propiedad Consolidada de Tarea/Comentarios
                'Comentarios': { rich_text: [{ text: { content: fullComment } }] },
                // *** Puedes añadir aquí otros campos, como 'Estado': { select: { name: 'Pendiente' } } ***
            }
        });

        res.status(200).json({ mensaje: 'Nueva tarea de seguimiento creada en Notion.' });

    } catch (error) {
        console.error('Error en el webhook:', error);
        res.status(500).json({ error: 'Error al procesar el webhook' });
    }
}
