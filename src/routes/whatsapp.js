import express from 'express';
const router = express.Router();

// 1. RUTA GET: Verificación obligatoria del Webhook de Meta
router.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verificado correctamente por Meta.');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// 2. RUTA POST: Recibir los mensajes que te envían los clientes por WhatsApp
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Verificamos que sea un evento de la API de WhatsApp Business
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;
          
          // Comprobamos si el evento trae mensajes entrantes
          if (value && value.messages && value.messages.length > 0) {
            const message = value.messages[0];
            
            const phoneNumber = message.from; // Número del cliente
            const messageBody = message.text && message.text.body ? message.text.body.toLowerCase() : ''; 

            console.log(`Mensaje recibido de ${phoneNumber}: "${messageBody}"`);

            // Lógica básica de atención automatizada:
            if (messageBody.includes('precio') || messageBody.includes('stock')) {
              console.log(`-> Consulta de stock/precio de: ${phoneNumber}`);
            } else if (messageBody.includes('comprar') || messageBody.includes('pedido')) {
              console.log(`-> Nuevo pedido recibido desde WhatsApp de: ${phoneNumber}`);
            }
          }
        }
      }
    }

    // Es vital responder siempre un 200 OK rápido a Meta para que no reintente el envío
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Error en el webhook de WhatsApp:', error);
    res.status(500).send('Error interno');
  }
});

export default router;