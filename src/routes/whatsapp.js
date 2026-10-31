import express from 'express';
const router = express.Router();

// Webhook para recibir los mensajes que te envían los clientes por WhatsApp
router.post('/webhook', async (req, res) => {
  try {
    const incomingMessage = req.body;
    
    // Teléfono del cliente y texto recibido
    const phoneNumber = incomingMessage.from; 
    const messageBody = (incomingMessage.body || '').toLowerCase(); 

    // Lógica básica de atención automatizada:
    if (messageBody.includes('precio') || messageBody.includes('stock')) {
      console.log(`Consulta de stock/precio de: ${phoneNumber}`);
    } else if (messageBody.includes('comprar') || messageBody.includes('pedido')) {
      console.log(`Nuevo pedido recibido desde WhatsApp de: ${phoneNumber}`);
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Error en el webhook de WhatsApp:', error);
    res.status(500).send('Error interno');
  }
});

export default router;