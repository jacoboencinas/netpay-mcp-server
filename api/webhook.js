import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DB_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se acepta POST' });
  }

  const {
    nombre,
    telefono,
    agente,
    motivo,
    nota,
    producto,
    flujo,
    canal,
    notas
  } = req.body.args || req.body;

  console.log('Datos recibidos:', {
    nombre,
    telefono,
    agente,
    motivo,
    nota,
    producto,
    flujo,
    canal,
    notas
  });

  try {
    const respuesta = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Teléfono',
        rich_text: {
          equals: telefono
        }
      }
    });

    const prospecto = respuesta.results[0];

    if (prospecto) {
      await notion.pages.update({
        page_id: prospecto.id,
        properties: {
          Nombre: { rich_text: [{ text: { content: nombre } }] },
          Agente: { rich_text: [{ text: { content: agente } }] },
          Producto: { rich_text: [{ text: { content: producto } }] },
          Motivo: { rich_text: [{ text: { content: motivo } }] },
          Flujo: { rich_text: [{ text: { content: flujo } }] },
          Canal: { rich_text: [{ text: { content: canal } }] },
          Notas: { rich_text: [{ text: { content: notas } }] },
          Nota: { rich_text: [{ text: { content: nota } }] }
        }
      });

      res.status(200).json({ mensaje: 'Prospecto actualizado con éxito' });
    } else {
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Nombre: { title: [{ text: { content: nombre } }] },
          Teléfono: { rich_text: [{ text: { content: telefono } }] },
          Agente: { rich_text: [{ text: { content: agente } }] },
          Producto: { rich_text: [{ text: { content: producto } }] },
          Motivo: { rich_text: [{ text: { content: motivo } }] },
          Flujo: { rich_text: [{ text: { content: flujo } }] },
          Canal: { rich_text: [{ text: { content: canal } }] },
          Notas: { rich_text: [{ text: { content: notas } }] },
          Nota: { rich_text: [{ text: { content: nota } }] }
        }
      });

      res.status(200).json({ mensaje: 'Prospecto creado con éxito' });
    }
  } catch (error) {
    console.error('Error en el webhook:', error);
    res.status(500).json({ error: 'Error al procesar el webhook' });
  }
}
