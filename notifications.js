// Sistema de Notificaciones Push
// Organizador de Finanzas Personal v3.0.0

class NotificationManager {
    constructor() {
        this.permissionGranted = false;
        this.registration = null;
        this.init();
    }

    async init() {
        // Verificar soporte de notificaciones
        if (!('Notification' in window)) {
            console.log('ℹ️ Este navegador no soporta notificaciones');
            return;
        }

        // Verificar si ya hay permiso
        if (Notification.permission === 'granted') {
            this.permissionGranted = true;
            await this.registerServiceWorker();
        } else if (Notification.permission === 'default') {
            // Mostrar UI para solicitar permiso
            this.showPermissionPrompt();
        }
    }

    showPermissionPrompt() {
        // Crear UI para solicitar permiso
        const promptHTML = `
            <div id="notification-permission-prompt" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                padding: 20px;
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 350px;
                z-index: 10000;
                animation: slideInRight 0.3s ease-out;
            ">
                <button onclick="document.getElementById('notification-permission-prompt').remove()" style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">×</button>
                <div style="margin-bottom: 15px;">
                    <div style="font-size: 32px; margin-bottom: 10px;">🔔</div>
                    <h3 style="margin: 0 0 10px 0; color: #667eea;">Recordatorios de Pagos</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                        Activa las notificaciones para recibir recordatorios automáticos de tus pagos pendientes.
                    </p>
                </div>
                <button onclick="notificationManager.requestPermission()" style="
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                ">
                    Activar Notificaciones
                </button>
                <button onclick="document.getElementById('notification-permission-prompt').remove()" style="
                    width: 100%;
                    padding: 12px;
                    background: transparent;
                    color: #666;
                    border: none;
                    font-size: 14px;
                    cursor: pointer;
                    margin-top: 8px;
                ">
                    Ahora no
                </button>
            </div>
        `;

        // Insertar el prompt
        const existingPrompt = document.getElementById('notification-permission-prompt');
        if (!existingPrompt) {
            document.body.insertAdjacentHTML('beforeend', promptHTML);
        }
    }

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                this.permissionGranted = true;
                console.log('✅ Permiso de notificaciones concedido');
                
                // Remover prompt
                const prompt = document.getElementById('notification-permission-prompt');
                if (prompt) prompt.remove();
                
                // Registrar Service Worker
                await this.registerServiceWorker();
                
                // Mostrar notificación de confirmación
                this.showTestNotification();
                
                // Programar notificaciones de pagos actuales
                this.schedulePaymentNotifications();
                
                alert('✅ ¡Notificaciones activadas!\n\nRecibirás recordatorios automáticos de tus pagos.');
            } else {
                console.log('❌ Permiso de notificaciones denegado');
                alert('⚠️ No se activaron las notificaciones.\n\nPuedes activarlas más tarde desde la configuración de tu navegador.');
            }
        } catch (error) {
            console.error('❌ Error al solicitar permiso:', error);
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.register('./sw.js');
                console.log('✅ Service Worker registrado para notificaciones');
            } catch (error) {
                console.error('❌ Error al registrar Service Worker:', error);
            }
        }
    }

    showTestNotification() {
        if (this.permissionGranted && this.registration) {
            this.registration.showNotification('💰 Finanzas Personal', {
                body: '¡Notificaciones activadas! Te recordaré tus pagos próximos.',
                icon: './icon-192.png',
                badge: './icon-192.png',
                vibrate: [200, 100, 200]
            });
        }
    }

    schedulePaymentNotifications() {
        // Obtener datos de gastos fijos del localStorage
        const presupuestoActual = localStorage.getItem('presupuesto-actual');
        if (!presupuestoActual) {
            console.log('ℹ️ No hay presupuesto actual para programar notificaciones');
            return;
        }

        const datos = JSON.parse(presupuestoActual);
        const payments = [];

        // Extraer gastos fijos
        if (datos.gastosFijos && datos.gastosFijos.length > 0) {
            datos.gastosFijos.forEach((gasto, index) => {
                if (gasto.nombre && gasto.monto && gasto.dia) {
                    const mes = gasto.mes === 'todos' ? new Date().getMonth() + 1 : parseInt(gasto.mes);
                    payments.push({
                        id: `gasto-fijo-${index}`,
                        name: gasto.nombre,
                        amount: parseFloat(gasto.monto),
                        day: parseInt(gasto.dia),
                        month: mes,
                        year: new Date().getFullYear()
                    });
                }
            });
        }

        // Extraer tarjetas de crédito
        if (datos.tarjetas && datos.tarjetas.length > 0) {
            datos.tarjetas.forEach((tarjeta, index) => {
                if (tarjeta.nombre && tarjeta.pagoMinimo && tarjeta.dia) {
                    const mes = tarjeta.mes === 'todos' ? new Date().getMonth() + 1 : parseInt(tarjeta.mes);
                    payments.push({
                        id: `tarjeta-${index}`,
                        name: `Tarjeta ${tarjeta.nombre}`,
                        amount: parseFloat(tarjeta.pagoMinimo),
                        day: parseInt(tarjeta.dia),
                        month: mes,
                        year: new Date().getFullYear()
                    });
                }
            });
        }

        // Enviar al Service Worker para programar
        if (payments.length > 0 && this.registration) {
            this.registration.active.postMessage({
                type: 'SCHEDULE_NOTIFICATIONS',
                payments: payments
            });
            
            console.log(`📅 ${payments.length} notificaciones programadas`);
        }
    }

    // Mostrar notificación inmediata (para testing)
    showImmediateNotification(title, body) {
        if (!this.permissionGranted) {
            console.log('⚠️ Permiso de notificaciones no concedido');
            return;
        }

        if (this.registration) {
            this.registration.showNotification(title, {
                body: body,
                icon: './icon-192.png',
                badge: './icon-192.png',
                vibrate: [200, 100, 200],
                requireInteraction: false
            });
        }
    }

    // Método para mostrar botón de activación en el UI
    showActivationButton() {
        if (Notification.permission === 'default') {
            // Mostrar botón persistente en la app
            const buttonHTML = `
                <button id="activate-notifications-btn" onclick="notificationManager.requestPermission()" style="
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                    z-index: 9999;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                    🔔
                </button>
            `;
            
            const existingBtn = document.getElementById('activate-notifications-btn');
            if (!existingBtn) {
                document.body.insertAdjacentHTML('beforeend', buttonHTML);
            }
        }
    }
}

// Instancia global
let notificationManager = null;

// Inicializar cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
    
    // Mostrar prompt después de 3 segundos si no hay permiso
    setTimeout(() => {
        if (Notification.permission === 'default') {
            notificationManager.showPermissionPrompt();
        }
    }, 3000);
});

// Reprogramar notificaciones cuando se calcule el presupuesto
function actualizarNotificaciones() {
    if (notificationManager && notificationManager.permissionGranted) {
        notificationManager.schedulePaymentNotifications();
        console.log('🔔 Notificaciones reprogramadas');
    }
}
