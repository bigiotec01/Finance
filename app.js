// Organizador de Finanzas Personal - App v3.0.2
'use strict';

let gastosChartInstance = null;
let comparacionChartInstance = null;

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

let gastoCounter = 0;
        let miscelaneoCounter = 0;
        let gastoFijoCounter = 0;
        let tarjetaCounter = 0;
        let presupuestoActual = null;
        let autoguardadoTimeout = null;
        let deferredPrompt = null; // Para PWA install
        
        // ==================== FUNCIONES PWA ====================
        
        // Detectar si puede instalarse como PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            mostrarBotonInstalarPWA();
        });
        
        function mostrarBotonInstalarPWA() {
            const panel = document.getElementById('notificaciones-panel');
            if (!panel) return;
            
            const btnHTML = `
                <div style="background: rgba(102, 126, 234, 0.1); padding: 15px; border-radius: 10px; margin-top: 15px; text-align: center;">
                    <div style="margin-bottom: 10px; font-weight: bold; color: #667eea;">
                        📱 ¡Instala esta app en tu dispositivo!
                    </div>
                    <p style="margin: 10px 0; font-size: 0.9em; color: #666;">
                        Agrega a tu pantalla de inicio para acceso rápido y funcionar sin conexión
                    </p>
                    <button onclick="instalarPWA()" class="btn-install-pwa">
                        ⬇️ Instalar App
                    </button>
                </div>
            `;
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = btnHTML;
            panel.appendChild(tempDiv.firstElementChild);
        }
        
        async function instalarPWA() {
            if (!deferredPrompt) {
                alert('📱 Para instalar en iOS:\n\n1. Toca el botón Compartir\n2. Selecciona "Agregar a pantalla de inicio"\n\nPara Android:\n\n1. Abre el menú del navegador (⋮)\n2. Toca "Agregar a pantalla de inicio"');
                return;
            }
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('✅ PWA instalada');
            }
            
            deferredPrompt = null;
        }
        
        // ==================== SISTEMA DE NOTIFICACIONES ====================
        
        function verificarVencimientos() {
            const hoy = new Date();
            const notificaciones = [];
            
            // Obtener gastos fijos
            const filasGastosFijos = document.querySelectorAll('#tabla-gastos-fijos-body tr');
            filasGastosFijos.forEach(fila => {
                const nombre = fila.querySelector('.gasto-fijo-nombre')?.value || '';
                const dia = parseInt(fila.querySelector('.gasto-fijo-dia')?.value) || 0;
                const mes = fila.querySelector('.gasto-fijo-mes')?.value || '';
                
                if (nombre && dia > 0) {
                    const mesGasto = (mes && mes !== 'todos') ? parseInt(mes) : (hoy.getMonth() + 1);
                    const fechaVencimiento = new Date(hoy.getFullYear(), mesGasto - 1, dia);
                    const diasHasta = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                    
                    if (diasHasta >= 0 && diasHasta <= 7) {
                        notificaciones.push({
                            tipo: diasHasta <= 3 ? 'urgente' : 'normal',
                            titulo: nombre,
                            dias: diasHasta,
                            fecha: fechaVencimiento
                        });
                    }
                }
            });
            
            // Obtener tarjetas
            const tarjetasElements = document.querySelectorAll('#tarjetas-container .gasto-categoria');
            tarjetasElements.forEach(tarjetaEl => {
                const nombre = tarjetaEl.querySelector('.tarjeta-nombre')?.value || '';
                const dia = parseInt(tarjetaEl.querySelector('.tarjeta-dia')?.value) || 0;
                const mes = tarjetaEl.querySelector('.tarjeta-mes')?.value || '';
                
                if (nombre && dia > 0) {
                    const mesTarjeta = (mes && mes !== 'todos') ? parseInt(mes) : (hoy.getMonth() + 1);
                    const fechaVencimiento = new Date(hoy.getFullYear(), mesTarjeta - 1, dia);
                    const diasHasta = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                    
                    if (diasHasta >= 0 && diasHasta <= 7) {
                        notificaciones.push({
                            tipo: diasHasta <= 3 ? 'urgente' : 'normal',
                            titulo: `💳 ${nombre}`,
                            dias: diasHasta,
                            fecha: fechaVencimiento
                        });
                    }
                }
            });
            
            return notificaciones;
        }
        
        function mostrarNotificaciones() {
            const notificaciones = verificarVencimientos();
            const panel = document.getElementById('notificaciones-panel');
            
            if (!panel) return;
            
            if (notificaciones.length === 0) {
                panel.style.display = 'none';
                return;
            }
            
            // Ordenar por días (más urgentes primero)
            notificaciones.sort((a, b) => a.dias - b.dias);
            
            let html = `
                <h3>
                    🔔 Recordatorios
                    <span class="notificacion-badge">${notificaciones.length}</span>
                </h3>
            `;
            
            notificaciones.forEach(notif => {
                const textoTiempo = notif.dias === 0 ? 'HOY' : 
                                   notif.dias === 1 ? 'Mañana' : 
                                   `En ${notif.dias} días`;
                
                html += `
                    <div class="notificacion-item notificacion-${notif.tipo}">
                        <div>
                            <strong>${sanitizeHTML(notif.titulo)}</strong>
                            <div style="font-size: 0.85em; color: #666; margin-top: 3px;">
                                Vence: ${textoTiempo}
                            </div>
                        </div>
                        <div style="font-weight: bold; color: ${notif.tipo === 'urgente' ? '#ff6b6b' : '#ff9800'};">
                            ${notif.tipo === 'urgente' ? '⚠️ Urgente' : '📅'}
                        </div>
                    </div>
                `;
            });
            
            panel.innerHTML = html;
            panel.style.display = 'block';
        }
        
        // ==================== SMART SCROLL ====================
        
        function guardarScrollPosition() {
            const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
            localStorage.setItem('scrollPosition', scrollPos.toString());
        }
        
        function restaurarScrollPosition() {
            const scrollPos = localStorage.getItem('scrollPosition');
            if (scrollPos) {
                setTimeout(() => {
                    window.scrollTo({
                        top: parseInt(scrollPos),
                        behavior: 'smooth'
                    });
                }, 500);
            }
        }
        
        // Guardar scroll cada 2 segundos mientras se hace scroll
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(guardarScrollPosition, 2000);
        });
        
        // ==================== FIN FUNCIONES PWA ====================
        
        // Agregar algunos misceláneos de ejemplo al cargar
        window.onload = function() {
            console.log('🔄 Iniciando aplicación...');
            inicializarPresupuestos();
            activarAutoguardado();
            
            // Verificar que la tabla existe
            const tbody = document.getElementById('tabla-gastos-fijos-body');
            console.log('📋 Tabla gastos fijos:', tbody ? '✅ Encontrada' : '❌ No encontrada');
            
            const datosActuales = localStorage.getItem('presupuesto_' + presupuestoActual);
            if (!datosActuales) {
                const miscelaneosEjemplo = [
                    'Salidas/Entretenimiento',
                    'Regalos',
                    'Emergencias'
                ];
                
                miscelaneosEjemplo.forEach(nombre => {
                    agregarMiscelaneo(nombre);
                });
                
                agregarFilaGastoFijo();
            }
        };
        
        // ==================== FUNCIONES DE PRESUPUESTOS ====================
        
        function inicializarPresupuestos() {
            const presupuestos = obtenerPresupuestos();
            
            if (presupuestos.length === 0) {
                const fechaActual = new Date();
                const nombreDefault = obtenerNombreMes(fechaActual.getMonth() + 1) + ' ' + fechaActual.getFullYear();
                presupuestoActual = nombreDefault;
                guardarPresupuesto();
            } else {
                presupuestoActual = localStorage.getItem('presupuestoActual') || presupuestos[presupuestos.length - 1];
            }
            
            actualizarSelectorPresupuestos();
            cargarPresupuesto();
        }
        
        function obtenerPresupuestos() {
            const keys = Object.keys(localStorage);
            return keys.filter(key => key.startsWith('presupuesto_')).map(key => key.replace('presupuesto_', ''));
        }
        
        function actualizarSelectorPresupuestos() {
            const selector = document.getElementById('presupuesto-selector');
            const presupuestos = obtenerPresupuestos();
            
            selector.innerHTML = '';
            presupuestos.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                if (nombre === presupuestoActual) option.selected = true;
                selector.appendChild(option);
            });
        }
        
        function cambiarPresupuesto() {
            const selector = document.getElementById('presupuesto-selector');
            presupuestoActual = selector.value;
            localStorage.setItem('presupuestoActual', presupuestoActual);
            cargarPresupuesto();
        }
        
        function nuevoPresupuesto() {
            const nombre = prompt('Nombre del nuevo presupuesto (Ej: Marzo 2026):');
            if (!nombre) return;
            
            const presupuestos = obtenerPresupuestos();
            if (presupuestos.includes(nombre)) {
                alert('Ya existe un presupuesto con ese nombre');
                return;
            }
            
            presupuestoActual = nombre;
            localStorage.setItem('presupuestoActual', presupuestoActual);
            limpiarFormulario();
            actualizarSelectorPresupuestos();
            mostrarMensajeAutoguardado();
        }
        
        function copiarPresupuesto() {
            const fechaActual = new Date();
            const nombreSugerido = obtenerNombreMes(fechaActual.getMonth() + 1) + ' ' + fechaActual.getFullYear();
            const nombre = prompt('Nombre para la copia:', nombreSugerido);
            if (!nombre) return;
            
            const presupuestos = obtenerPresupuestos();
            if (presupuestos.includes(nombre)) {
                alert('Ya existe un presupuesto con ese nombre');
                return;
            }
            
            guardarPresupuesto();
            const datosActuales = localStorage.getItem('presupuesto_' + presupuestoActual);
            localStorage.setItem('presupuesto_' + nombre, datosActuales);
            
            presupuestoActual = nombre;
            localStorage.setItem('presupuestoActual', presupuestoActual);
            actualizarSelectorPresupuestos();
            cargarPresupuesto();
            
            alert('✅ Presupuesto copiado exitosamente');
        }
        
        function eliminarPresupuesto() {
            const presupuestos = obtenerPresupuestos();
            if (presupuestos.length === 1) {
                alert('No puedes eliminar el único presupuesto');
                return;
            }
            
            if (!confirm(`¿Seguro que quieres eliminar "${presupuestoActual}"?\n\nEsta acción no se puede deshacer.`)) {
                return;
            }
            
            localStorage.removeItem('presupuesto_' + presupuestoActual);
            const presupuestosRestantes = obtenerPresupuestos();
            presupuestoActual = presupuestosRestantes[0];
            localStorage.setItem('presupuestoActual', presupuestoActual);
            
            actualizarSelectorPresupuestos();
            cargarPresupuesto();
            alert('✅ Presupuesto eliminado');
        }
        
        
        function guardarPresupuesto() {
            const datos = {
                balanceActual: document.getElementById('balance-actual')?.value || '',
                metaAhorro: document.getElementById('meta-ahorro')?.value || '',
                metaTotal: document.getElementById('meta-total')?.value || '',
                fechaObjetivo: document.getElementById('fecha-objetivo')?.value || '',
                tipoPago: document.querySelector('input[name="tipo-pago"]:checked')?.value || 'quincenal',
                mesPago1: document.getElementById('mes-pago1')?.value || '',
                diaPago1: document.getElementById('dia-pago1')?.value || '',
                montoPago1: document.getElementById('monto-pago1')?.value || '',
                mesPago2: document.getElementById('mes-pago2')?.value || '',
                diaPago2: document.getElementById('dia-pago2')?.value || '',
                montoPago2: document.getElementById('monto-pago2')?.value || '',
                mesPago3: document.getElementById('mes-pago3')?.value || '',
                diaPago3: document.getElementById('dia-pago3')?.value || '',
                montoPago3: document.getElementById('monto-pago3')?.value || '',
                mesPago4: document.getElementById('mes-pago4')?.value || '',
                diaPago4: document.getElementById('dia-pago4')?.value || '',
                montoPago4: document.getElementById('monto-pago4')?.value || '',
                gastoGasolina: document.getElementById('gasto-gasolina')?.value || '',
                gastoComida: document.getElementById('gasto-comida')?.value || '',
                gastosFijos: [],
                tarjetas: [],
                miscelaneos: [],
                imprevistos: []
            };
            
            const filasGastosFijos = document.querySelectorAll('#tabla-gastos-fijos-body tr');
            filasGastosFijos.forEach(fila => {
                const nombre = fila.querySelector('.gasto-fijo-nombre')?.value || '';
                const monto = fila.querySelector('.gasto-fijo-monto')?.value || '';
                const dia = fila.querySelector('.gasto-fijo-dia')?.value || '';
                const mes = fila.querySelector('.gasto-fijo-mes')?.value || '';
                const recurrencia = fila.querySelector('.gasto-fijo-recurrencia')?.value || '';
                if (nombre || monto) datos.gastosFijos.push({ nombre, monto, dia, mes, recurrencia });
            });
            
            const tarjetasElements = document.querySelectorAll('#tarjetas-container .gasto-categoria');
            tarjetasElements.forEach(tarjetaEl => {
                const nombre = tarjetaEl.querySelector('.tarjeta-nombre')?.value || '';
                const minimo = tarjetaEl.querySelector('.tarjeta-minimo')?.value || '';
                const deuda = tarjetaEl.querySelector('.tarjeta-deuda')?.value || '';
                const mes = tarjetaEl.querySelector('.tarjeta-mes')?.value || '';
                const dia = tarjetaEl.querySelector('.tarjeta-dia')?.value || '';
                if (nombre || minimo || deuda) datos.tarjetas.push({ nombre, minimo, deuda, mes, dia });
            });
            
            const miscelaneosElements = document.querySelectorAll('#miscelaneos-container .gasto-item');
            miscelaneosElements.forEach(miscEl => {
                const nombre = miscEl.querySelector('.miscelaneo-nombre-input')?.value || '';
                const monto = miscEl.querySelector('.miscelaneo-monto')?.value || '';
                if (nombre || monto) datos.miscelaneos.push({ nombre, monto });
            });
            
            const imprevistosElements = document.querySelectorAll('#imprevistos-container .gasto-item');
            imprevistosElements.forEach(impEl => {
                const nombre = impEl.querySelector('.imprevisto-nombre-input')?.value || '';
                const monto = impEl.querySelector('.imprevisto-monto')?.value || '';
                const mes = impEl.querySelector('.imprevisto-mes')?.value || '';
                const dia = impEl.querySelector('.imprevisto-dia')?.value || '';
                if (nombre || monto) datos.imprevistos.push({ nombre, monto, mes, dia });
            });
            
            localStorage.setItem('presupuesto_' + presupuestoActual, JSON.stringify(datos));
        }
        
        function cargarPresupuesto() {
            const datosJSON = localStorage.getItem('presupuesto_' + presupuestoActual);
            if (!datosJSON) {
                limpiarFormulario();
                return;
            }
            
            const datos = JSON.parse(datosJSON);
            
            if (document.getElementById('balance-actual')) document.getElementById('balance-actual').value = datos.balanceActual || '';
            if (document.getElementById('meta-ahorro')) document.getElementById('meta-ahorro').value = datos.metaAhorro || '';
            if (document.getElementById('meta-total')) document.getElementById('meta-total').value = datos.metaTotal || '';
            if (document.getElementById('fecha-objetivo')) document.getElementById('fecha-objetivo').value = datos.fechaObjetivo || '';
            
            if (datos.tipoPago) {
                const radioButton = document.querySelector(`input[name="tipo-pago"][value="${datos.tipoPago}"]`);
                if (radioButton) {
                    radioButton.checked = true;
                    cambiarTipoPago(datos.tipoPago);
                }
            }
            
            if (document.getElementById('mes-pago1')) document.getElementById('mes-pago1').value = datos.mesPago1 || '';
            if (document.getElementById('dia-pago1')) document.getElementById('dia-pago1').value = datos.diaPago1 || '';
            if (document.getElementById('monto-pago1')) document.getElementById('monto-pago1').value = datos.montoPago1 || '';
            if (document.getElementById('mes-pago2')) document.getElementById('mes-pago2').value = datos.mesPago2 || '';
            if (document.getElementById('dia-pago2')) document.getElementById('dia-pago2').value = datos.diaPago2 || '';
            if (document.getElementById('monto-pago2')) document.getElementById('monto-pago2').value = datos.montoPago2 || '';
            if (document.getElementById('mes-pago3')) document.getElementById('mes-pago3').value = datos.mesPago3 || '';
            if (document.getElementById('dia-pago3')) document.getElementById('dia-pago3').value = datos.diaPago3 || '';
            if (document.getElementById('monto-pago3')) document.getElementById('monto-pago3').value = datos.montoPago3 || '';
            if (document.getElementById('mes-pago4')) document.getElementById('mes-pago4').value = datos.mesPago4 || '';
            if (document.getElementById('dia-pago4')) document.getElementById('dia-pago4').value = datos.diaPago4 || '';
            if (document.getElementById('monto-pago4')) document.getElementById('monto-pago4').value = datos.montoPago4 || '';
            
            if (document.getElementById('gasto-gasolina')) document.getElementById('gasto-gasolina').value = datos.gastoGasolina || '';
            if (document.getElementById('gasto-comida')) document.getElementById('gasto-comida').value = datos.gastoComida || '';
            
            const tbody = document.getElementById('tabla-gastos-fijos-body');
            if (tbody) {
                tbody.innerHTML = '';
                datos.gastosFijos.forEach(gasto => {
                    agregarFilaGastoFijo();
                    const ultimaFila = tbody.lastElementChild;
                    if (ultimaFila) {
                        if (ultimaFila.querySelector('.gasto-fijo-nombre')) ultimaFila.querySelector('.gasto-fijo-nombre').value = gasto.nombre;
                        if (ultimaFila.querySelector('.gasto-fijo-monto')) ultimaFila.querySelector('.gasto-fijo-monto').value = gasto.monto;
                        if (ultimaFila.querySelector('.gasto-fijo-dia')) ultimaFila.querySelector('.gasto-fijo-dia').value = gasto.dia;
                        if (ultimaFila.querySelector('.gasto-fijo-mes')) ultimaFila.querySelector('.gasto-fijo-mes').value = gasto.mes;
                        if (ultimaFila.querySelector('.gasto-fijo-recurrencia')) ultimaFila.querySelector('.gasto-fijo-recurrencia').value = gasto.recurrencia;
                    }
                });
                if (datos.gastosFijos.length === 0) agregarFilaGastoFijo();
            }
            
            const tarjetasContainer = document.getElementById('tarjetas-container');
            if (tarjetasContainer) {
                tarjetasContainer.innerHTML = '';
                datos.tarjetas.forEach(tarjeta => {
                    agregarTarjeta();
                    const ultimaTarjeta = tarjetasContainer.lastElementChild;
                    if (ultimaTarjeta) {
                        if (ultimaTarjeta.querySelector('.tarjeta-nombre')) ultimaTarjeta.querySelector('.tarjeta-nombre').value = tarjeta.nombre;
                        if (ultimaTarjeta.querySelector('.tarjeta-minimo')) ultimaTarjeta.querySelector('.tarjeta-minimo').value = tarjeta.minimo;
                        if (ultimaTarjeta.querySelector('.tarjeta-deuda')) ultimaTarjeta.querySelector('.tarjeta-deuda').value = tarjeta.deuda;
                        if (ultimaTarjeta.querySelector('.tarjeta-mes')) ultimaTarjeta.querySelector('.tarjeta-mes').value = tarjeta.mes;
                        if (ultimaTarjeta.querySelector('.tarjeta-dia')) ultimaTarjeta.querySelector('.tarjeta-dia').value = tarjeta.dia;
                    }
                });
            }
            
            const miscelaneosContainer = document.getElementById('miscelaneos-container');
            if (miscelaneosContainer) {
                miscelaneosContainer.innerHTML = '';
                datos.miscelaneos.forEach(misc => {
                    agregarMiscelaneo();
                    const ultimoMisc = miscelaneosContainer.lastElementChild;
                    if (ultimoMisc) {
                        if (ultimoMisc.querySelector('.miscelaneo-nombre-input')) ultimoMisc.querySelector('.miscelaneo-nombre-input').value = misc.nombre;
                        if (ultimoMisc.querySelector('.miscelaneo-monto')) ultimoMisc.querySelector('.miscelaneo-monto').value = misc.monto;
                    }
                });
            }
            
            const imprevistosContainer = document.getElementById('imprevistos-container');
            if (imprevistosContainer) {
                imprevistosContainer.innerHTML = '';
                datos.imprevistos.forEach(imp => {
                    agregarImprevisto();
                    const ultimoImp = imprevistosContainer.lastElementChild;
                    if (ultimoImp) {
                        if (ultimoImp.querySelector('.imprevisto-nombre-input')) ultimoImp.querySelector('.imprevisto-nombre-input').value = imp.nombre;
                        if (ultimoImp.querySelector('.imprevisto-monto')) ultimoImp.querySelector('.imprevisto-monto').value = imp.monto;
                        if (ultimoImp.querySelector('.imprevisto-mes')) ultimoImp.querySelector('.imprevisto-mes').value = imp.mes;
                        if (ultimoImp.querySelector('.imprevisto-dia')) ultimoImp.querySelector('.imprevisto-dia').value = imp.dia;
                    }
                });
            }
        }
        
        function limpiarFormulario() {
            const inputs = document.querySelectorAll('input[type="number"], input[type="text"], input[type="date"]');
            inputs.forEach(input => input.value = '');
            
            const selects = document.querySelectorAll('select');
            selects.forEach(select => {
                if (select.id !== 'presupuesto-selector') select.selectedIndex = 0;
            });
            
            if (document.getElementById('tabla-gastos-fijos-body')) {
                document.getElementById('tabla-gastos-fijos-body').innerHTML = '';
                agregarFilaGastoFijo();
            }
            if (document.getElementById('tarjetas-container')) document.getElementById('tarjetas-container').innerHTML = '';
            if (document.getElementById('miscelaneos-container')) document.getElementById('miscelaneos-container').innerHTML = '';
            if (document.getElementById('imprevistos-container')) document.getElementById('imprevistos-container').innerHTML = '';
            if (document.getElementById('resultado')) document.getElementById('resultado').innerHTML = '';
        }
        
        function limpiarTodo() {
            if (!confirm('🧹 ¿Estás seguro de limpiar TODOS los datos del formulario?\n\n⚠️ Esta acción borrará:\n• Todos los ingresos\n• Todos los gastos fijos\n• Todas las tarjetas\n• Todos los misceláneos\n• Todos los imprevistos\n• Los resultados calculados\n\nEl presupuesto actual se guardará vacío.')) {
                return;
            }
            
            // Limpiar todos los inputs
            const inputs = document.querySelectorAll('input[type="number"], input[type="text"], input[type="date"]');
            inputs.forEach(input => {
                if (input.id !== 'presupuesto-selector') {
                    input.value = '';
                }
            });
            
            // Resetear selects (excepto presupuesto-selector)
            const selects = document.querySelectorAll('select');
            selects.forEach(select => {
                if (select.id !== 'presupuesto-selector') {
                    select.selectedIndex = 0;
                }
            });
            
            // Resetear radios a quincenal
            const radioQuincenal = document.querySelector('input[name="tipo-pago"][value="quincenal"]');
            if (radioQuincenal) {
                radioQuincenal.checked = true;
                cambiarTipoPago('quincenal');
            }
            
            const radioMensual = document.querySelector('input[name="tipo-ahorro"][value="mensual"]');
            if (radioMensual) {
                radioMensual.checked = true;
                cambiarTipoAhorro('mensual');
            }
            
            // Limpiar tabla de gastos fijos
            const tbody = document.getElementById('tabla-gastos-fijos-body');
            if (tbody) {
                tbody.innerHTML = '';
                agregarFilaGastoFijo();
            }
            
            // Limpiar tarjetas
            const tarjetasContainer = document.getElementById('tarjetas-container');
            if (tarjetasContainer) tarjetasContainer.innerHTML = '';
            
            // Limpiar misceláneos
            const miscelaneosContainer = document.getElementById('miscelaneos-container');
            if (miscelaneosContainer) miscelaneosContainer.innerHTML = '';
            
            // Limpiar imprevistos
            const imprevistosContainer = document.getElementById('imprevistos-container');
            if (imprevistosContainer) imprevistosContainer.innerHTML = '';
            
            // Limpiar resultados
            const resultado = document.getElementById('resultado');
            if (resultado) {
                resultado.innerHTML = '';
                resultado.classList.remove('show');
            }
            
            // Ocultar mensajes de error/éxito
            const errorContainer = document.getElementById('error-container');
            const successContainer = document.getElementById('success-container');
            if (errorContainer) errorContainer.classList.remove('show');
            if (successContainer) successContainer.classList.remove('show');
            
            // Guardar estado vacío
            guardarPresupuesto();
            mostrarMensajeAutoguardado();
            
            // Scroll al inicio
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Mostrar confirmación
            setTimeout(() => {
                alert('✅ Formulario limpiado correctamente.\n\nTodos los datos han sido borrados y el presupuesto actual está vacío.');
            }, 300);
        }
        
        function programarAutoguardado() {
            if (autoguardadoTimeout) clearTimeout(autoguardadoTimeout);
            autoguardadoTimeout = setTimeout(() => {
                guardarPresupuesto();
                mostrarMensajeAutoguardado();
            }, 1000);
        }
        
        function mostrarMensajeAutoguardado() {
            const indicator = document.getElementById('autosave-indicator');
            if (indicator) {
                indicator.style.opacity = '1';
                setTimeout(() => indicator.style.opacity = '0', 2000);
            }
        }
        
        function activarAutoguardado() {
            document.addEventListener('input', function(e) {
                if (e.target.matches('input, select, textarea')) {
                    programarAutoguardado();
                }
            });
            
            const observer = new MutationObserver(() => programarAutoguardado());
            ['tabla-gastos-fijos-body', 'tarjetas-container', 'miscelaneos-container', 'imprevistos-container'].forEach(id => {
                const container = document.getElementById(id);
                if (container) observer.observe(container, { childList: true });
            });
        }
        
        // ==================== FIN FUNCIONES DE PRESUPUESTOS ====================
        

        // Función para agregar fila a la tabla de gastos fijos
        function agregarFilaGastoFijo() {
            console.log('🔵 Agregando fila de gasto fijo...');
            const tbody = document.getElementById('tabla-gastos-fijos-body');
            
            if (!tbody) {
                console.error('❌ No se encontró el tbody');
                alert('Error: No se encontró la tabla de gastos fijos');
                return;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Nombre">
                    <input type="text" class="gasto-fijo-nombre" placeholder="Agua" />
                </td>
                <td data-label="Monto ($)">
                    <input type="number" class="gasto-fijo-monto" min="0" step="0.01" placeholder="45.00" />
                </td>
                <td data-label="Día">
                    <input type="number" class="gasto-fijo-dia" min="1" max="31" placeholder="15" />
                </td>
                <td data-label="Mes">
                    <select class="gasto-fijo-mes">
                        <option value="todos" selected>Todos</option>
                        <option value="1">Enero</option>
                        <option value="2">Febrero</option>
                        <option value="3">Marzo</option>
                        <option value="4">Abril</option>
                        <option value="5">Mayo</option>
                        <option value="6">Junio</option>
                        <option value="7">Julio</option>
                        <option value="8">Agosto</option>
                        <option value="9">Septiembre</option>
                        <option value="10">Octubre</option>
                        <option value="11">Noviembre</option>
                        <option value="12">Diciembre</option>
                    </select>
                </td>
                <td data-label="Recurrencia">
                    <select class="gasto-fijo-recurrencia">
                        <option value="mensual" selected>Mensual</option>
                        <option value="unico">Pago Único</option>
                    </select>
                </td>
                <td>
                    <button class="btn-copiar-fila" onclick="copiarFilaGastoFijo(this)" title="Copiar fila">📋</button>
                    <button class="btn-eliminar-fila" onclick="eliminarFilaGastoFijo(this)" title="Eliminar">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
            
            // AUTO-FOCUS: Enfocar el primer input
            const primerInput = tr.querySelector('.gasto-fijo-nombre');
            if (primerInput) {
                setTimeout(() => primerInput.focus(), 100);
            }
            
            // NAVEGACIÓN CON TECLADO
            const inputs = tr.querySelectorAll('input, select');
            inputs.forEach((input, index) => {
                // Enter en el último campo → Agregar nueva fila
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && index === inputs.length - 1) {
                        e.preventDefault();
                        agregarFilaGastoFijo();
                    }
                });
            });
            
            gastoFijoCounter++;
            console.log('✅ Fila agregada correctamente');
        }
        
        // Función para copiar/duplicar fila
        function copiarFilaGastoFijo(btn) {
            const tr = btn.closest('tr');
            const nombre = tr.querySelector('.gasto-fijo-nombre').value;
            const monto = tr.querySelector('.gasto-fijo-monto').value;
            const dia = tr.querySelector('.gasto-fijo-dia').value;
            const mes = tr.querySelector('.gasto-fijo-mes').value;
            const recurrencia = tr.querySelector('.gasto-fijo-recurrencia').value;
            
            // Crear nueva fila
            agregarFilaGastoFijo();
            
            // Llenar con los valores copiados
            const tbody = document.getElementById('tabla-gastos-fijos-body');
            const ultimaFila = tbody.lastElementChild;
            
            if (ultimaFila) {
                ultimaFila.querySelector('.gasto-fijo-nombre').value = nombre;
                ultimaFila.querySelector('.gasto-fijo-monto').value = monto;
                ultimaFila.querySelector('.gasto-fijo-dia').value = dia;
                ultimaFila.querySelector('.gasto-fijo-mes').value = mes;
                ultimaFila.querySelector('.gasto-fijo-recurrencia').value = recurrencia;
            }
        }
        
        // Función para eliminar fila con confirmación
        function eliminarFilaGastoFijo(btn) {
            const tr = btn.closest('tr');
            const nombre = tr.querySelector('.gasto-fijo-nombre').value || 'este gasto';
            
            // CONFIRMACIÓN antes de eliminar
            if (confirm(`¿Seguro que quieres eliminar "${nombre}"?`)) {
                tr.remove();
            }
        }
        
        // Función para ordenar tabla
        function ordenarTablaGastosFijos(columna) {
            const tbody = document.getElementById('tabla-gastos-fijos-body');
            const filas = Array.from(tbody.querySelectorAll('tr'));
            
            filas.sort((a, b) => {
                let valorA, valorB;
                
                if (columna === 'nombre') {
                    valorA = a.querySelector('.gasto-fijo-nombre').value.toLowerCase();
                    valorB = b.querySelector('.gasto-fijo-nombre').value.toLowerCase();
                    return valorA.localeCompare(valorB);
                } else if (columna === 'monto') {
                    valorA = parseFloat(a.querySelector('.gasto-fijo-monto').value) || 0;
                    valorB = parseFloat(b.querySelector('.gasto-fijo-monto').value) || 0;
                    return valorA - valorB;
                } else if (columna === 'dia') {
                    valorA = parseInt(a.querySelector('.gasto-fijo-dia').value) || 0;
                    valorB = parseInt(b.querySelector('.gasto-fijo-dia').value) || 0;
                    return valorA - valorB;
                }
                
                return 0;
            });
            
            // Limpiar tbody y re-agregar filas ordenadas
            tbody.innerHTML = '';
            filas.forEach(fila => tbody.appendChild(fila));
        }
        
        // Función para expandir/colapsar ayuda
        function toggleHelp(header) {
            const content = header.nextElementSibling;
            header.classList.toggle('active');
            content.classList.toggle('active');
        }
        
        let imprevistoCounter = 0;
        
        // ==================== FUNCIONES DE AHORRO CON FECHA ====================
        
        function cambiarTipoAhorro(tipo) {
            const mensualDiv = document.getElementById('ahorro-mensual');
            const fechaDiv = document.getElementById('ahorro-fecha');
            const metaAhorroInput = document.getElementById('meta-ahorro');
            
            if (tipo === 'mensual') {
                mensualDiv.style.display = 'block';
                fechaDiv.style.display = 'none';
                document.getElementById('resultado-calculo').style.display = 'none';
            } else {
                mensualDiv.style.display = 'none';
                fechaDiv.style.display = 'block';
                metaAhorroInput.value = 0; // Resetear meta mensual
            }
        }
        
        // Función para cambiar entre Quincenal y Semanal
        function cambiarTipoPago(tipo) {
            const paychecksSemanales = document.getElementById('paychecks-semanales');
            
            if (tipo === 'semanal') {
                paychecksSemanales.style.display = 'block';
            } else {
                paychecksSemanales.style.display = 'none';
            }
        }
        
        function calcularAhorroMensual() {
            // Esta función se llama cuando cambia el input de ahorro mensual
            // No hace nada especial, solo está para consistencia
        }
        
        function calcularAhorroConFecha() {
            const metaTotal = parseFloat(document.getElementById('meta-total').value) || 0;
            const fechaObjetivo = document.getElementById('fecha-objetivo').value;
            const resultadoDiv = document.getElementById('resultado-calculo');
            const infoDiv = document.getElementById('info-calculo');
            const metaAhorroInput = document.getElementById('meta-ahorro');
            
            if (metaTotal <= 0 || !fechaObjetivo) {
                resultadoDiv.style.display = 'none';
                metaAhorroInput.value = 0;
                return;
            }
            
            // Calcular meses y días hasta la fecha objetivo
            const hoy = new Date();
            const objetivo = new Date(fechaObjetivo);
            
            // Validar que la fecha sea futura
            if (objetivo <= hoy) {
                infoDiv.innerHTML = '<div style="color: #d32f2f;">⚠️ La fecha debe ser futura</div>';
                resultadoDiv.style.display = 'block';
                metaAhorroInput.value = 0;
                return;
            }
            
            // Calcular diferencia en milisegundos
            const diferenciaMilisegundos = objetivo - hoy;
            const diferenciaDias = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
            const diferenciaMeses = Math.ceil(diferenciaDias / 30);
            
            // Calcular cuánto ahorrar por mes y por paycheck
            const ahorroPorMes = metaTotal / diferenciaMeses;
            const ahorroPorPaycheck = ahorroPorMes / 2;
            
            // Actualizar el input de meta-ahorro con el cálculo
            metaAhorroInput.value = ahorroPorMes.toFixed(2);
            
            // Formatear fecha objetivo
            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const fechaFormateada = `${objetivo.getDate()} de ${meses[objetivo.getMonth()]} ${objetivo.getFullYear()}`;
            
            // Mostrar resultado
            infoDiv.innerHTML = `
                <div style="margin-bottom: 8px;">
                    🗓️ <strong>Tiempo disponible:</strong> ${diferenciaMeses} meses (${diferenciaDias} días)
                </div>
                <div style="margin-bottom: 8px;">
                    📅 <strong>Fecha objetivo:</strong> ${fechaFormateada}
                </div>
                <div style="margin-bottom: 8px;">
                    💰 <strong>Meta total:</strong> $${metaTotal.toFixed(2)}
                </div>
                <hr style="border: none; border-top: 1px solid #a5d6a7; margin: 10px 0;">
                <div style="background: white; padding: 10px; border-radius: 5px; margin-top: 10px;">
                    <div style="font-size: 1.1em; color: #2e7d32; margin-bottom: 5px;">
                        <strong>Debes ahorrar por mes:</strong> <span style="font-size: 1.3em;">$${ahorroPorMes.toFixed(2)}</span>
                    </div>
                    <div style="color: #666; font-size: 0.9em;">
                        O $${ahorroPorPaycheck.toFixed(2)} por cada PayCheck
                    </div>
                </div>
                <div style="margin-top: 10px; padding: 10px; background: #fff9c4; border-radius: 5px; font-size: 0.85em; color: #f57f17;">
                    💡 <strong>Consejo:</strong> Este monto se aplicará automáticamente al calcular tu plan financiero.
                </div>
            `;
            
            resultadoDiv.style.display = 'block';
        }
        
        // ==================== FIN FUNCIONES DE AHORRO ====================
        
        function agregarImprevisto(nombrePredefinido = '') {
            imprevistoCounter++;
            const container = document.getElementById('imprevistos-container');
            const imprevistoDiv = document.createElement('div');
            imprevistoDiv.className = 'gasto-item';
            imprevistoDiv.style.borderColor = '#ff6b6b';
            imprevistoDiv.id = `imprevisto-${imprevistoCounter}`;
            
            imprevistoDiv.innerHTML = `
                <div class="gasto-header">
                    <input type="text" class="imprevisto-nombre-input" placeholder="Ej: Cumpleaños de mamá, Viaje, Reparación carro" value="${sanitizeHTML(nombrePredefinido)}" style="border: none; font-weight: bold; color: #ff6b6b; font-size: 1.1em; background: transparent; width: 60%;">
                    <button class="btn-remove" onclick="removerImprevisto(${imprevistoCounter})" style="background: #ff6b6b; color: white;">✖ Eliminar</button>
                </div>
                <div class="input-group">
    <label>💸 Monto total ($)</label>
    <input type="number" class="imprevisto-monto" min="0" step="0.01" placeholder="0.00">
</div>
<div class="row">
    <div class="input-group">
        <label>📅 Mes</label>
        <select class="imprevisto-mes" style="width: 100%; padding: 12px 15px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 1em; background: white;">
            <option value="1">Enero</option>
            <option value="2">Febrero</option>
            <option value="3">Marzo</option>
            <option value="4">Abril</option>
            <option value="5">Mayo</option>
            <option value="6">Junio</option>
            <option value="7">Julio</option>
            <option value="8">Agosto</option>
            <option value="9">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
        </select>
    </div>
    <div class="input-group">
        <label>📅 Día (1-31)</label>
        <input type="number" class="imprevisto-dia" min="1" max="31" placeholder="15">
    </div>
</div>
            `;
            
            container.appendChild(imprevistoDiv);
        }
        

        function agregarTarjeta(nombrePredefinido = '') {
            tarjetaCounter++;
            const container = document.getElementById('tarjetas-container');
            const tarjetaDiv = document.createElement('div');
            tarjetaDiv.className = 'gasto-categoria';
            tarjetaDiv.id = `tarjeta-${tarjetaCounter}`;
            
            tarjetaDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <input type="text" class="tarjeta-nombre" placeholder="Visa" value="${sanitizeHTML(nombrePredefinido)}" 
                        style="border: none; font-weight: bold; color: #667eea; font-size: 1.1em; background: transparent; flex: 1;">
                    <button class="btn-remove" onclick="removerTarjeta(${tarjetaCounter})" 
                        style="background: #667eea; color: white; padding: 8px 15px; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9em;">
                        ✖ Eliminar
                    </button>
                </div>
                <div class="row">
                    <div class="input-group">
                        <label>Pago mínimo</label>
                        <input type="number" class="tarjeta-minimo" min="0" step="0.01" placeholder="50.00">
                        <small style="color: #999;">Lo mínimo que pide la tarjeta</small>
                    </div>
                    <div class="input-group">
                        <label>Cuánto debes en total</label>
                        <input type="number" class="tarjeta-deuda" min="0" step="0.01" placeholder="1500.00">
                    </div>
                </div>
                <div class="row">
                    <div class="input-group">
                        <label>Mes</label>
                        <select class="tarjeta-mes" style="width: 100%; padding: 12px 15px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 1em; background: white;">
                            <option value="todos" selected>Todos los meses</option>
                            <option value="1">Enero</option>
                            <option value="2">Febrero</option>
                            <option value="3">Marzo</option>
                            <option value="4">Abril</option>
                            <option value="5">Mayo</option>
                            <option value="6">Junio</option>
                            <option value="7">Julio</option>
                            <option value="8">Agosto</option>
                            <option value="9">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Día que vence</label>
                        <input type="number" class="tarjeta-dia" min="1" max="31" placeholder="15">
                    </div>
                </div>
            `;
            
            container.appendChild(tarjetaDiv);
        }
        
        function removerTarjeta(id) {
            const tarjeta = document.getElementById(`tarjeta-${id}`);
            if (tarjeta) tarjeta.remove();
        }
        
        function removerImprevisto(id) {
            const imprevisto = document.getElementById(`imprevisto-${id}`);
            if (imprevisto) {
                imprevisto.remove();
            }
        }
        
        
        function agregarMiscelaneo(nombrePredefinido = '') {
            miscelaneoCounter++;
            const container = document.getElementById('miscelaneos-container');
            const miscelaneoDiv = document.createElement('div');
            miscelaneoDiv.className = 'gasto-item';
            miscelaneoDiv.style.borderColor = '#ffd43b';
            miscelaneoDiv.id = `miscelaneo-${miscelaneoCounter}`;
            
            miscelaneoDiv.innerHTML = `
                <div class="gasto-header">
                    <input type="text" class="miscelaneo-nombre-input" placeholder="Nombre del gasto misceláneo" value="${sanitizeHTML(nombrePredefinido)}" style="border: none; font-weight: bold; color: #f59f00; font-size: 1.1em; background: transparent; width: 60%;">
                    <button class="btn-remove" onclick="removerMiscelaneo(${miscelaneoCounter})" style="background: #ffd43b; color: #333;">✖ Eliminar</button>
                </div>
                <div class="input-group">
                    <label>Presupuesto mensual estimado ($)</label>
                    <input type="number" class="miscelaneo-monto" min="0" step="0.01" placeholder="0.00">
                </div>
            `;
            
            container.appendChild(miscelaneoDiv);
        }
        
        
        function removerMiscelaneo(id) {
            const miscelaneo = document.getElementById(`miscelaneo-${id}`);
            if (miscelaneo) {
                miscelaneo.remove();
            }
        }
        
        // ==================== FUNCIONES DE VALIDACIÓN ====================
        
        function mostrarError(mensajes) {
            const errorContainer = document.getElementById('error-container');
            const errorList = document.getElementById('error-list');
            const successContainer = document.getElementById('success-container');
            
            // Ocultar mensaje de éxito
            successContainer.classList.remove('show');
            
            // Limpiar lista anterior
            errorList.innerHTML = '';
            
            // Agregar cada mensaje
            mensajes.forEach(msg => {
                const li = document.createElement('li');
                li.textContent = msg;
                errorList.appendChild(li);
            });
            
            // Mostrar error
            errorContainer.classList.add('show');
            
            // Scroll al error
            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Ocultar después de 5 segundos
            setTimeout(() => {
                errorContainer.classList.remove('show');
            }, 5000);
        }
        
        function mostrarExito() {
            const errorContainer = document.getElementById('error-container');
            const successContainer = document.getElementById('success-container');
            
            // Ocultar errores
            errorContainer.classList.remove('show');
            
            // Mostrar éxito
            successContainer.classList.add('show');
            
            // Ocultar después de 3 segundos
            setTimeout(() => {
                successContainer.classList.remove('show');
            }, 3000);
        }
        
        function marcarCampoError(elemento) {
            if (elemento) {
                elemento.classList.add('input-error');
                setTimeout(() => {
                    elemento.classList.remove('input-error');
                }, 3000);
            }
        }
        
        function validarDatos() {
            const errores = [];
            
            // Validar PayCheck 1
            const diaPago1 = parseInt(document.getElementById('dia-pago1').value);
            const montoPago1 = parseFloat(document.getElementById('monto-pago1').value);
            
            if (!diaPago1) {
                errores.push('Día de PayCheck 1 es requerido');
                marcarCampoError(document.getElementById('dia-pago1'));
            } else if (diaPago1 < 1 || diaPago1 > 31) {
                errores.push('Día de PayCheck 1 debe estar entre 1 y 31');
                marcarCampoError(document.getElementById('dia-pago1'));
            }
            
            if (!montoPago1 || montoPago1 <= 0) {
                errores.push('Monto de PayCheck 1 debe ser mayor a 0');
                marcarCampoError(document.getElementById('monto-pago1'));
            }
            
            // Validar PayCheck 2
            const diaPago2 = parseInt(document.getElementById('dia-pago2').value);
            const montoPago2 = parseFloat(document.getElementById('monto-pago2').value);
            
            if (!diaPago2) {
                errores.push('Día de PayCheck 2 es requerido');
                marcarCampoError(document.getElementById('dia-pago2'));
            } else if (diaPago2 < 1 || diaPago2 > 31) {
                errores.push('Día de PayCheck 2 debe estar entre 1 y 31');
                marcarCampoError(document.getElementById('dia-pago2'));
            }
            
            if (!montoPago2 || montoPago2 <= 0) {
                errores.push('Monto de PayCheck 2 debe ser mayor a 0');
                marcarCampoError(document.getElementById('monto-pago2'));
            }
            
            // Validar Balance Actual (si existe)
            const balanceActual = parseFloat(document.getElementById('balance-actual').value) || 0;
            if (balanceActual < 0) {
                errores.push('Balance actual no puede ser negativo');
                marcarCampoError(document.getElementById('balance-actual'));
            }
            
            // Validar Meta de Ahorro (si existe)
            const metaAhorro = parseFloat(document.getElementById('meta-ahorro').value) || 0;
            if (metaAhorro < 0) {
                errores.push('Meta de ahorro no puede ser negativa');
                marcarCampoError(document.getElementById('meta-ahorro'));
            }
            
            // Validar Gastos Fijos (tabla)
            const filasGastosFijos = document.querySelectorAll('#tabla-gastos-fijos-body tr');
            let gastosValidos = 0;
            
            filasGastosFijos.forEach((fila, index) => {
                const nombreInput = fila.querySelector('.gasto-fijo-nombre');
                const montoInput = fila.querySelector('.gasto-fijo-monto');
                const diaInput = fila.querySelector('.gasto-fijo-dia');
                
                const nombre = nombreInput.value.trim();
                const monto = parseFloat(montoInput.value) || 0;
                const dia = parseInt(diaInput.value) || 0;
                
                // Solo validar si tiene algún dato
                if (nombre || monto > 0 || dia > 0) {
                    if (!nombre) {
                        errores.push(`Gasto fijo ${index + 1}: Falta el nombre`);
                        marcarCampoError(nombreInput);
                    }
                    if (monto <= 0) {
                        errores.push(`Gasto fijo "${nombre || index + 1}": Monto debe ser mayor a 0`);
                        marcarCampoError(montoInput);
                    }
                    if (dia < 1 || dia > 31) {
                        errores.push(`Gasto fijo "${nombre || index + 1}": Día debe estar entre 1 y 31`);
                        marcarCampoError(diaInput);
                    }
                    
                    if (nombre && monto > 0 && dia >= 1 && dia <= 31) {
                        gastosValidos++;
                    }
                }
            });
            
            // Validar Tarjetas
            const tarjetasElements = document.querySelectorAll('.tarjeta-nombre');
            tarjetasElements.forEach((tarjetaNombreEl, index) => {
                const nombre = tarjetaNombreEl.value.trim();
                const contenedor = tarjetaNombreEl.closest('.gasto-categoria');
                const minimoInput = contenedor.querySelector('.tarjeta-minimo');
                const deudaInput = contenedor.querySelector('.tarjeta-deuda');
                const diaInput = contenedor.querySelector('.tarjeta-dia');
                
                const minimo = parseFloat(minimoInput.value) || 0;
                const deuda = parseFloat(deudaInput.value) || 0;
                const dia = parseInt(diaInput.value) || 0;
                
                // Solo validar si tiene algún dato
                if (nombre || minimo > 0 || deuda > 0 || dia > 0) {
                    if (!nombre) {
                        errores.push(`Tarjeta ${index + 1}: Falta el nombre`);
                        marcarCampoError(tarjetaNombreEl);
                    }
                    if (minimo <= 0) {
                        errores.push(`Tarjeta "${nombre || index + 1}": Pago mínimo debe ser mayor a 0`);
                        marcarCampoError(minimoInput);
                    }
                    if (deuda <= 0) {
                        errores.push(`Tarjeta "${nombre || index + 1}": Balance debe ser mayor a 0`);
                        marcarCampoError(deudaInput);
                    }
                    if (dia < 1 || dia > 31) {
                        errores.push(`Tarjeta "${nombre || index + 1}": Día debe estar entre 1 y 31`);
                        marcarCampoError(diaInput);
                    }
                }
            });
            
            // Validar Imprevistos
            const imprevistosElementsVal = document.querySelectorAll('#imprevistos-container .gasto-item');
            imprevistosElementsVal.forEach((contenedor, index) => {
                const nombreEl = contenedor.querySelector('.imprevisto-nombre-input');
                const montoInput = contenedor.querySelector('.imprevisto-monto');
                const diaInput = contenedor.querySelector('.imprevisto-dia');
                
                if (!nombreEl || !montoInput || !diaInput) return;
                
                const nombre = nombreEl.value.trim();
                const monto = parseFloat(montoInput.value) || 0;
                const dia = parseInt(diaInput.value) || 0;
                
                // Solo validar si tiene algún dato
                if (nombre || monto > 0 || dia > 0) {
                    if (!nombre) {
                        errores.push(`Imprevisto ${index + 1}: Falta el nombre`);
                        marcarCampoError(nombreEl);
                    }
                    if (monto <= 0) {
                        errores.push(`Imprevisto "${nombre || index + 1}": Monto debe ser mayor a 0`);
                        marcarCampoError(montoInput);
                    }
                    if (dia < 1 || dia > 31) {
                        errores.push(`Imprevisto "${nombre || index + 1}": Día debe estar entre 1 y 31`);
                        marcarCampoError(diaInput);
                    }
                }
            });
            
            return errores;
        }
        
        // ==================== FIN FUNCIONES DE VALIDACIÓN ====================
        
        // ==================== RENDERIZAR GRAFICOS ====================
        function renderizarGraficos(gastos, tarjetas, totalMiscelaneos, totalImprevistos) {
            setTimeout(() => {
                const ctx = document.getElementById('gastosChart');
                if (ctx) {
                    // Calcular categorías de gastos
                    const categorias = {
                        'Servicios del Hogar': 0,
                        'Vivienda': 0,
                        'Transporte': 0,
                        'Alimentación': 0,
                        'Tarjetas de Crédito': 0,
                        'Misceláneos': totalMiscelaneos,
                        'Imprevistos': totalImprevistos,
                        'Otros': 0
                    };

                    gastos.forEach(gasto => {
                        const nombre = gasto.nombre.toLowerCase();
                        if (nombre.includes('agua') || nombre.includes('luz') || nombre.includes('internet') || nombre.includes('teléfono') || nombre.includes('telefono')) {
                            categorias['Servicios del Hogar'] += gasto.monto;
                        } else if (nombre.includes('renta') || nombre.includes('hipoteca')) {
                            categorias['Vivienda'] += gasto.monto;
                        } else if (nombre.includes('carro') || nombre.includes('gasolina') || nombre.includes('transporte')) {
                            categorias['Transporte'] += gasto.monto;
                        } else if (nombre.includes('comida') || nombre.includes('despensa') || nombre.includes('alimento')) {
                            categorias['Alimentación'] += gasto.monto;
                        } else {
                            categorias['Otros'] += gasto.monto;
                        }
                    });

                    tarjetas.forEach(t => {
                        categorias['Tarjetas de Crédito'] += t.minimo;
                    });

                    // Filtrar categorías con valor > 0
                    const labels = [];
                    const data = [];
                    const colors = ['#51cf66', '#667eea', '#ffd43b', '#ff6b6b', '#e91e63', '#f59f00', '#fa5252', '#868e96'];
                    const backgroundColors = [];

                    let colorIndex = 0;
                    Object.keys(categorias).forEach(key => {
                        if (categorias[key] > 0) {
                            labels.push(key);
                            data.push(categorias[key]);
                            backgroundColors.push(colors[colorIndex % colors.length]);
                            colorIndex++;
                        }
                    });

                    if (gastosChartInstance) { gastosChartInstance.destroy(); }
                    gastosChartInstance = new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: labels,
                            datasets: [{
                                data: data,
                                backgroundColor: backgroundColors,
                                borderWidth: 2,
                                borderColor: '#fff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        padding: 15,
                                        font: {
                                            size: 12
                                        }
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const label = context.label || '';
                                            const value = context.parsed || 0;
                                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                            const percentage = ((value / total) * 100).toFixed(1);
                                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            }, 100);
        }

        // ==================== LEER INPUTS DEL FORMULARIO ====================
        function leerInputs() {
            const mesPago1 = parseInt(document.getElementById('mes-pago1').value) || 0;
            const diaPago1 = parseInt(document.getElementById('dia-pago1').value) || 0;
            const montoPago1 = parseFloat(document.getElementById('monto-pago1').value) || 0;
            const mesPago2 = parseInt(document.getElementById('mes-pago2').value) || 0;
            const diaPago2 = parseInt(document.getElementById('dia-pago2').value) || 0;
            const montoPago2 = parseFloat(document.getElementById('monto-pago2').value) || 0;

            const tipoPago = document.querySelector('input[name="tipo-pago"]:checked').value;
            const esSemanal = tipoPago === 'semanal';

            let mesPago3 = 0, diaPago3 = 0, montoPago3 = 0;
            let mesPago4 = 0, diaPago4 = 0, montoPago4 = 0;

            if (esSemanal) {
                mesPago3 = parseInt(document.getElementById('mes-pago3').value) || 0;
                diaPago3 = parseInt(document.getElementById('dia-pago3').value) || 0;
                montoPago3 = parseFloat(document.getElementById('monto-pago3').value) || 0;
                mesPago4 = parseInt(document.getElementById('mes-pago4').value) || 0;
                diaPago4 = parseInt(document.getElementById('dia-pago4').value) || 0;
                montoPago4 = parseFloat(document.getElementById('monto-pago4').value) || 0;
            }

            const balanceActual = parseFloat(document.getElementById('balance-actual').value) || 0;
            const metaAhorro = parseFloat(document.getElementById('meta-ahorro').value) || 0;

            const mesesNombres = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const totalIngresos = esSemanal ? (montoPago1 + montoPago2 + montoPago3 + montoPago4) : (montoPago1 + montoPago2);

            return {
                mesPago1, diaPago1, montoPago1,
                mesPago2, diaPago2, montoPago2,
                mesPago3, diaPago3, montoPago3,
                mesPago4, diaPago4, montoPago4,
                tipoPago, esSemanal,
                balanceActual, metaAhorro,
                mesesNombres, totalIngresos
            };
        }

        function calcularFinanzas() {
            // Limpiar mensajes anteriores
            document.getElementById('error-container').classList.remove('show');
            document.getElementById('success-container').classList.remove('show');

            // VALIDAR PRIMERO
            const errores = validarDatos();
            if (errores.length > 0) {
                mostrarError(errores);
                return; // No continuar si hay errores
            }

            // Mostrar mensaje de éxito breve
            mostrarExito();

            try {
            // Obtener ingresos desde formulario
            const inputs = leerInputs();
            const { mesPago1, diaPago1, montoPago1, mesPago2, diaPago2, montoPago2,
                    mesPago3, diaPago3, montoPago3, mesPago4, diaPago4, montoPago4,
                    esSemanal, balanceActual, metaAhorro,
                    mesesNombres, totalIngresos } = inputs;

            if (!diaPago1 || !montoPago1 || !diaPago2 || !montoPago2) {
                alert('⚠️ Por favor completa todos los datos de ingresos');
                return;
            }

            if (esSemanal && (!diaPago3 || !montoPago3 || !diaPago4 || !montoPago4)) {
                alert('⚠️ En modo semanal debes completar los 4 PayChecks');
                return;
            }
            
            // Obtener gastos fijos de la TABLA COMPACTA
            const filasGastosFijos = document.querySelectorAll('#tabla-gastos-fijos-body tr');
            const gastos = [];
            let totalGastos = 0;
            
            filasGastosFijos.forEach(fila => {
                const nombreInput = fila.querySelector('.gasto-fijo-nombre');
                const montoInput = fila.querySelector('.gasto-fijo-monto');
                const diaInput = fila.querySelector('.gasto-fijo-dia');
                const mesSelect = fila.querySelector('.gasto-fijo-mes');
                
                if (nombreInput && montoInput && diaInput && mesSelect) {
                    const nombre = nombreInput.value.trim();
                    const monto = parseFloat(montoInput.value) || 0;
                    const dia = parseInt(diaInput.value) || 0;
                    const mes = mesSelect.value;
                    
                    if (nombre && monto > 0 && dia > 0) {
                        gastos.push({ nombre, monto, dia, mes, tipo: 'servicio' });
                        totalGastos += monto;
                    }
                }
            });
            
            // Obtener gastos sin día específico (gasolina, comida)
            const serviciosSinDiaElements = document.querySelectorAll('.servicio-monto-sin-dia');
            serviciosSinDiaElements.forEach(servicioEl => {
                const nombre = servicioEl.getAttribute('data-nombre');
                const monto = parseFloat(servicioEl.value) || 0;
                
                if (monto > 0) {
                    // Dividir entre los dos pagos y asignarlos correctamente
                    const montoPorPago = monto / 2;
                    // Primer pago recibe la primera mitad
                    gastos.push({ nombre: nombre + ' (1ra quincena)', monto: montoPorPago, dia: diaPago1 + 1, tipo: 'variable', esPrimerPago: true });
                    // Segundo pago recibe la segunda mitad
                    gastos.push({ nombre: nombre + ' (2da quincena)', monto: montoPorPago, dia: diaPago2 + 1, tipo: 'variable', esPrimerPago: false });
                    totalGastos += monto;
                }
            });
            
            // Obtener tarjetas de crédito (pago mínimo y deuda total)
            const tarjetasElements = document.querySelectorAll('.tarjeta-nombre');
            const tarjetas = [];
            let totalMinimosTarjetas = 0;
            let totalDeudasTarjetas = 0;
            
            tarjetasElements.forEach(tarjetaEl => {
                const contenedor = tarjetaEl.closest('.gasto-categoria');
                const nombre = tarjetaEl.value || 'Tarjeta';
                const minimo = parseFloat(contenedor.querySelector('.tarjeta-minimo').value) || 0;
                const deuda = parseFloat(contenedor.querySelector('.tarjeta-deuda').value) || 0;
                const dia = parseInt(contenedor.querySelector('.tarjeta-dia').value) || 0;
                const mesSelect = contenedor.querySelector('.tarjeta-mes');
                const mes = mesSelect ? mesSelect.value : 'todos';
                
                if (minimo > 0 && dia > 0) {
                    tarjetas.push({ nombre, minimo, deuda, dia, mes, tipo: 'tarjeta' });
                    totalMinimosTarjetas += minimo;
                    totalDeudasTarjetas += deuda;
                }
            });
            
            // Obtener gastos adicionales personalizados
            const gastosElements = document.querySelectorAll('#gastos-container .gasto-item');
            
            gastosElements.forEach(gastoEl => {
                const nombreInput = gastoEl.querySelector('.gasto-nombre-input');
                const montoInput = gastoEl.querySelector('.gasto-monto');
                const diaInput = gastoEl.querySelector('.gasto-dia');
                const mesSelect = gastoEl.querySelector('.gasto-mes');
                
                if (nombreInput && montoInput && diaInput) {
                    const nombre = nombreInput.value || 'Sin nombre';
                    const monto = parseFloat(montoInput.value) || 0;
                    const dia = parseInt(diaInput.value) || 0;
                    const mes = mesSelect ? mesSelect.value : 'todos';
                    
                    if (monto > 0 && dia > 0) {
                        gastos.push({ nombre, monto, dia, mes, tipo: 'personalizado' });
                        totalGastos += monto;
                    }
                }
            });
            
            // Obtener misceláneos
            const miscelaneosElements = document.querySelectorAll('#miscelaneos-container .gasto-item');
            const miscelaneos = [];
            let totalMiscelaneos = 0;
            
            miscelaneosElements.forEach(miscEl => {
                const nombreInput = miscEl.querySelector('.miscelaneo-nombre-input');
                const montoInput = miscEl.querySelector('.miscelaneo-monto');
                
                if (nombreInput && montoInput) {
                    const nombre = nombreInput.value || 'Sin nombre';
                    const monto = parseFloat(montoInput.value) || 0;
                    
                    if (monto > 0) {
                        miscelaneos.push({ nombre, monto, tipo: 'miscelaneo' });
                        totalMiscelaneos += monto;
                    }
                }
            });
            
            // Obtener gastos imprevistos (solo este mes)
            const imprevistosElements = document.querySelectorAll('#imprevistos-container .gasto-item');
            const imprevistos = [];
            let totalImprevistos = 0;
            
            imprevistosElements.forEach(impEl => {
                const nombreInput = impEl.querySelector('.imprevisto-nombre-input');
                const montoInput = impEl.querySelector('.imprevisto-monto');
                const mesInput = impEl.querySelector('.imprevisto-mes');
                const diaInput = impEl.querySelector('.imprevisto-dia');
                
                if (nombreInput && montoInput && mesInput && diaInput) {
                    const nombre = nombreInput.value || 'Sin nombre';
                    const monto = parseFloat(montoInput.value) || 0;
                    const mes = mesInput.value;
                    const dia = parseInt(diaInput.value) || 0;
                    
                    if (monto > 0 && dia > 0) {
                        imprevistos.push({ nombre, monto, mes, dia, tipo: 'imprevisto' });
                        totalImprevistos += monto;
                    }
                }
            });
            
            
            
            if (gastos.length === 0 && miscelaneos.length === 0 && tarjetas.length === 0 && imprevistos.length === 0) {
                alert('⚠️ Por favor agrega al menos un gasto');
                return;
            }
            
            // Calcular gastos urgentes (que vencen antes del PayCheck 1)
            let totalGastosUrgentes = 0;
            if (balanceActual > 0) {
                const hoy = new Date();
                const añoActual = hoy.getFullYear();
                const fechaPago1 = new Date(añoActual, mesPago1 - 1, diaPago1);
                
                // Revisar gastos regulares
                gastos.forEach(gasto => {
                    if (gasto.tipo !== 'variable' && gasto.dia) {
                        const mesGasto = (gasto.mes && gasto.mes !== 'todos') ? parseInt(gasto.mes) : mesPago1;
                        const fechaGasto = new Date(añoActual, mesGasto - 1, gasto.dia);
                        if (fechaGasto < fechaPago1) {
                            totalGastosUrgentes += gasto.monto;
                        }
                    }
                });
                
                // Revisar tarjetas
                tarjetas.forEach(tarjeta => {
                    if (tarjeta.dia) {
                        const mesTarjeta = (tarjeta.mes && tarjeta.mes !== 'todos') ? parseInt(tarjeta.mes) : mesPago1;
                        const fechaTarjeta = new Date(añoActual, mesTarjeta - 1, tarjeta.dia);
                        if (fechaTarjeta < fechaPago1) {
                            totalGastosUrgentes += tarjeta.minimo;
                        }
                    }
                });
                
                // Revisar imprevistos
                imprevistos.forEach(imprevisto => {
                    if (imprevisto.mes && imprevisto.dia) {
                        const mesImprevisto = parseInt(imprevisto.mes);
                        const fechaImprevisto = new Date(añoActual, mesImprevisto - 1, imprevisto.dia);
                        if (fechaImprevisto < fechaPago1) {
                            totalGastosUrgentes += imprevisto.monto;
                        }
                    }
                });
            }
            
            const balanceDisponible = balanceActual - totalGastosUrgentes;
            const capitalTotal = totalIngresos + balanceDisponible;
            
            // Organizar gastos por pago (adaptado para quincenal o semanal)
            const gastosPago1 = [];
            const gastosPago2 = [];
            const gastosPago3 = [];
            const gastosPago4 = [];
            
            gastos.forEach(gasto => {
                // Si es un gasto variable, ya sabemos a qué pago pertenece
                if (gasto.tipo === 'variable') {
                    if (gasto.esPrimerPago) {
                        gastosPago1.push(gasto);
                    } else {
                        gastosPago2.push(gasto);
                    }
                } else {
                    // Para otros gastos, determinar cuál pago viene primero después del vencimiento
                    const añoActual = new Date().getFullYear();
                    const fechaPago1 = new Date(añoActual, mesPago1 - 1, diaPago1);
                    const fechaPago2 = new Date(añoActual, mesPago2 - 1, diaPago2);
                    
                    const mesGasto = (gasto.mes && gasto.mes !== 'todos') ? parseInt(gasto.mes) : mesPago1;
                    const fechaGasto = new Date(añoActual, mesGasto - 1, gasto.dia);
                    
                    if (esSemanal) {
                        // Modo semanal: asignar al pago más cercano después del vencimiento
                        const fechaPago3 = new Date(añoActual, mesPago3 - 1, diaPago3);
                        const fechaPago4 = new Date(añoActual, mesPago4 - 1, diaPago4);
                        
                        if (fechaGasto <= fechaPago1) {
                            gastosPago1.push(gasto);
                        } else if (fechaGasto <= fechaPago2) {
                            gastosPago2.push(gasto);
                        } else if (fechaGasto <= fechaPago3) {
                            gastosPago3.push(gasto);
                        } else if (fechaGasto <= fechaPago4) {
                            gastosPago4.push(gasto);
                        } else {
                            gastosPago4.push(gasto);
                        }
                    } else {
                        // Modo quincenal (original)
                        if (fechaGasto <= fechaPago1) {
                            gastosPago1.push(gasto);
                        } else if (fechaGasto <= fechaPago2) {
                            gastosPago2.push(gasto);
                        } else {
                            gastosPago2.push(gasto);
                        }
                    }
                }
            });
            
            // Organizar imprevistos por pago
            imprevistos.forEach(imprevisto => {
                const añoActual = new Date().getFullYear();
                const fechaPago1 = new Date(añoActual, mesPago1 - 1, diaPago1);
                const fechaPago2 = new Date(añoActual, mesPago2 - 1, diaPago2);
                
                const mesImprevisto = parseInt(imprevisto.mes);
                const fechaImprevisto = new Date(añoActual, mesImprevisto - 1, imprevisto.dia);
                
                if (esSemanal) {
                    const fechaPago3 = new Date(añoActual, mesPago3 - 1, diaPago3);
                    const fechaPago4 = new Date(añoActual, mesPago4 - 1, diaPago4);
                    
                    if (fechaImprevisto <= fechaPago1) {
                        gastosPago1.push(imprevisto);
                    } else if (fechaImprevisto <= fechaPago2) {
                        gastosPago2.push(imprevisto);
                    } else if (fechaImprevisto <= fechaPago3) {
                        gastosPago3.push(imprevisto);
                    } else if (fechaImprevisto <= fechaPago4) {
                        gastosPago4.push(imprevisto);
                    } else {
                        gastosPago4.push(imprevisto);
                    }
                } else {
                    if (fechaImprevisto <= fechaPago1) {
                        gastosPago1.push(imprevisto);
                    } else if (fechaImprevisto <= fechaPago2) {
                        gastosPago2.push(imprevisto);
                    } else {
                        gastosPago2.push(imprevisto);
                    }
                }
            });
            
            // Dividir misceláneos entre los pagos
            const numPagos = esSemanal ? 4 : 2;
            const miscelaneosPorPago = totalMiscelaneos / numPagos;
            
            // Calcular totales SIN tarjetas primero
            const totalPago1SinTarjetas = gastosPago1.reduce((sum, g) => sum + g.monto, 0) + miscelaneosPorPago;
            const totalPago2SinTarjetas = gastosPago2.reduce((sum, g) => sum + g.monto, 0) + miscelaneosPorPago;
            const totalPago3SinTarjetas = esSemanal ? (gastosPago3.reduce((sum, g) => sum + g.monto, 0) + miscelaneosPorPago) : 0;
            const totalPago4SinTarjetas = esSemanal ? (gastosPago4.reduce((sum, g) => sum + g.monto, 0) + miscelaneosPorPago) : 0;
            
            // Calcular dinero disponible para tarjetas
            const disponiblePago1 = montoPago1 - totalPago1SinTarjetas;
            const disponiblePago2 = montoPago2 - totalPago2SinTarjetas;
            const disponiblePago3 = esSemanal ? (montoPago3 - totalPago3SinTarjetas) : 0;
            const disponiblePago4 = esSemanal ? (montoPago4 - totalPago4SinTarjetas) : 0;
            
            // Organizar tarjetas por pago
          const tarjetasPago1 = [];
const tarjetasPago2 = [];
const tarjetasPago3 = [];
const tarjetasPago4 = [];

tarjetas.forEach(tarjeta => {
    const añoActual = new Date().getFullYear();
    const fechaPago1 = new Date(añoActual, mesPago1 - 1, diaPago1);
    const fechaPago2 = new Date(añoActual, mesPago2 - 1, diaPago2);
    
    const mesTarjeta = (tarjeta.mes && tarjeta.mes !== 'todos') ? parseInt(tarjeta.mes) : mesPago1;
    const fechaTarjeta = new Date(añoActual, mesTarjeta - 1, tarjeta.dia);
    
    if (esSemanal) {
        const fechaPago3 = new Date(añoActual, mesPago3 - 1, diaPago3);
        const fechaPago4 = new Date(añoActual, mesPago4 - 1, diaPago4);
        
        if (fechaTarjeta <= fechaPago1) {
            tarjetasPago1.push(tarjeta);
        } else if (fechaTarjeta <= fechaPago2) {
            tarjetasPago2.push(tarjeta);
        } else if (fechaTarjeta <= fechaPago3) {
            tarjetasPago3.push(tarjeta);
        } else if (fechaTarjeta <= fechaPago4) {
            tarjetasPago4.push(tarjeta);
        } else {
            tarjetasPago4.push(tarjeta);
        }
    } else {
        if (fechaTarjeta <= fechaPago1) {
            tarjetasPago1.push(tarjeta);
        } else if (fechaTarjeta <= fechaPago2) {
            tarjetasPago2.push(tarjeta);
        } else {
            tarjetasPago2.push(tarjeta);
        }
    }
});
            
            // Calcular cuánto pagar en cada tarjeta de forma inteligente
            function calcularPagosTarjetas(tarjetas, disponible, balance) {
                const totalMinimos = tarjetas.reduce((sum, t) => sum + t.minimo, 0);
                const totalDeudas = tarjetas.reduce((sum, t) => sum + t.deuda, 0);
                
                if (disponible <= 0) {
                    // No hay dinero: pagar solo mínimos (o advertir que falta)
                    return tarjetas.map(t => ({
                        ...t,
                        pagoRecomendado: t.minimo,
                        pagoReal: 0,
                        faltante: t.minimo,
                        opcionMinimo: t.minimo,
                        opcionRecomendado: t.minimo
                    }));
                } else if (disponible < totalMinimos) {
                    // Hay dinero pero no alcanza para todos los mínimos
                    return tarjetas.map(t => {
                        const proporcion = totalDeudas > 0 ? (t.deuda / totalDeudas) : (1 / tarjetas.length);
                        const pagoAsignado = disponible * proporcion;
                        return {
                            ...t,
                            pagoRecomendado: t.minimo,
                            pagoReal: pagoAsignado,
                            faltante: t.minimo - pagoAsignado,
                            opcionMinimo: t.minimo,
                            opcionRecomendado: t.minimo
                        };
                    });
                } else {
                    // Hay dinero suficiente para mínimos
                    if (tarjetas.length === 0) return [];
                    
                    return tarjetas.map(t => {
                        // Calcular diferentes opciones de pago
                        const opcionMinimo = t.minimo;
                        
                        // Opción conservadora: mínimo + $20-50 dependiendo de la deuda
                        let extra;
                        if (t.deuda > 0) {
                            if (t.deuda < 500) {
                                extra = 20; // Deuda pequeña
                            } else if (t.deuda < 2000) {
                                extra = 30; // Deuda mediana
                            } else {
                                extra = 50; // Deuda grande
                            }
                        } else {
                            extra = 20; // Default
                        }
                        
                        // Asegurarnos de que el extra no exceda ciertos límites
                        const limite1 = t.deuda * 0.15; // Máximo 15% de la deuda
                        const limite2 = t.minimo * 2;   // Máximo 2x el mínimo
                        extra = Math.min(extra, limite1, limite2);
                        
                        let opcionRecomendado = opcionMinimo + extra;
                        
                        // No pagar más de lo que se debe
                        if (t.deuda > 0 && opcionRecomendado > t.deuda) {
                            opcionRecomendado = t.deuda;
                            extra = t.deuda - opcionMinimo;
                        }
                        
                        // Si tenemos balance actual, usar opción recomendada
                        // Si no, usar solo el mínimo
                        const pagoFinal = balance > 0 ? opcionRecomendado : opcionMinimo;
                        
                        return {
                            ...t,
                            pagoRecomendado: pagoFinal,
                            pagoReal: pagoFinal,
                            faltante: 0,
                            porcentajePagado: t.deuda > 0 ? ((pagoFinal / t.deuda) * 100).toFixed(1) : 0,
                            opcionMinimo: opcionMinimo,
                            opcionRecomendado: opcionRecomendado,
                            extraRecomendado: extra
                        };
                    });
                }
            }
            
            const tarjetasConPagoPago1 = calcularPagosTarjetas(tarjetasPago1, disponiblePago1, balanceActual);
            const tarjetasConPagoPago2 = calcularPagosTarjetas(tarjetasPago2, disponiblePago2, balanceActual);
            const tarjetasConPagoPago3 = esSemanal ? calcularPagosTarjetas(tarjetasPago3, disponiblePago3, balanceActual) : [];
            const tarjetasConPagoPago4 = esSemanal ? calcularPagosTarjetas(tarjetasPago4, disponiblePago4, balanceActual) : [];
            
            // Agregar tarjetas a los gastos de cada pago
            tarjetasConPagoPago1.forEach(t => {
                gastosPago1.push({
                    nombre: t.nombre,
                    monto: t.pagoReal,
                    dia: t.dia,
                    mes: t.mes,
                    tipo: 'tarjeta',
                    minimo: t.minimo,
                    pagoRecomendado: t.pagoRecomendado,
                    faltante: t.faltante
                });
            });
            
            tarjetasConPagoPago2.forEach(t => {
                gastosPago2.push({
                    nombre: t.nombre,
                    monto: t.pagoReal,
                    dia: t.dia,
                    mes: t.mes,
                    tipo: 'tarjeta',
                    minimo: t.minimo,
                    pagoRecomendado: t.pagoRecomendado,
                    faltante: t.faltante
                });
            });
            
            if (esSemanal) {
                tarjetasConPagoPago3.forEach(t => {
                    gastosPago3.push({
                        nombre: t.nombre,
                        monto: t.pagoReal,
                        dia: t.dia,
                        mes: t.mes,
                        tipo: 'tarjeta',
                        minimo: t.minimo,
                        pagoRecomendado: t.pagoRecomendado,
                        faltante: t.faltante
                    });
                });
                
                tarjetasConPagoPago4.forEach(t => {
                    gastosPago4.push({
                        nombre: t.nombre,
                        monto: t.pagoReal,
                        dia: t.dia,
                        mes: t.mes,
                        tipo: 'tarjeta',
                        minimo: t.minimo,
                        pagoRecomendado: t.pagoRecomendado,
                        faltante: t.faltante
                    });
                });
            }
            
            // Recalcular totales CON tarjetas
            const totalPago1 = gastosPago1.reduce((sum, g) => sum + g.monto, 0) + miscelaneosPorPago;
            const totalPago2 = gastosPago2.reduce((sum, g) => sum + g.monto, 0) + miscelaneosPorPago;
            
            const totalTarjetasPagado = tarjetasConPagoPago1.reduce((s, t) => s + t.pagoReal, 0) + 
                                        tarjetasConPagoPago2.reduce((s, t) => s + t.pagoReal, 0) +
                                        (esSemanal ? tarjetasConPagoPago3.reduce((s, t) => s + t.pagoReal, 0) : 0) +
                                        (esSemanal ? tarjetasConPagoPago4.reduce((s, t) => s + t.pagoReal, 0) : 0);
            
            const totalGastosCompleto = totalGastos + totalMiscelaneos + totalImprevistos + totalTarjetasPagado;
            
            const sobrante = capitalTotal - totalGastosCompleto - metaAhorro;
            const porcentajeAhorro = totalIngresos > 0 ? ((sobrante / totalIngresos) * 100).toFixed(1) : 0;
            
            // Generar resultado
            let resultadoHTML = `
                <h2>📊 Tu Plan Financiero</h2>
                
                <!-- SEMÁFORO DE SALUD FINANCIERA -->
                <div class="health-meter">
                    <div class="health-circle ${sobrante >= capitalTotal * 0.2 ? 'health-green' : sobrante >= 0 ? 'health-yellow' : 'health-red'}">
                        ${sobrante >= capitalTotal * 0.2 ? '🟢' : sobrante >= 0 ? '🟡' : '🔴'}
                    </div>
                    <div class="health-info">
                        <h3>${sobrante >= capitalTotal * 0.2 ? '¡Excelente Salud Financiera!' : sobrante >= 0 ? 'Salud Financiera Aceptable' : '⚠️ Atención Requerida'}</h3>
                        <p>${sobrante >= capitalTotal * 0.2 ? 'Estás ahorrando más del 20% de tu capital. ¡Sigue así!' : sobrante >= 0 ? 'Estás equilibrado pero podrías ahorrar más.' : 'Tus gastos exceden tus ingresos. Revisa tus prioridades.'}</p>
                        <p style="margin-top: 5px;"><strong>${sobrante >= 0 ? 'Te sobran' : 'Te faltan'}: $${Math.abs(sobrante).toFixed(2)}</strong> (${Math.abs((sobrante / capitalTotal) * 100).toFixed(1)}% de tu capital)</p>
                    </div>
                </div>
                
                ${metaAhorro > 0 ? `
                <!-- BARRA DE PROGRESO META DE AHORRO -->
                <div class="resumen-box" style="border-left-color: #f57c00;">
                    <h3 style="color: #f57c00; margin-bottom: 15px;">🎯 Progreso de Meta de Ahorro</h3>
                    <p style="color: #666; margin-bottom: 10px;">Meta: $${metaAhorro.toFixed(2)}</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${Math.min((sobrante / metaAhorro) * 100, 100)}%">
                            ${sobrante >= metaAhorro ? '✅ Meta Alcanzada!' : `${((sobrante / metaAhorro) * 100).toFixed(0)}%`}
                        </div>
                    </div>
                    ${sobrante >= metaAhorro ? 
                        '<p style="color: #51cf66; margin-top: 10px; font-weight: bold;">🎉 ¡Felicitaciones! Alcanzaste tu meta de ahorro.</p>' : 
                        `<p style="color: #666; margin-top: 10px;">Faltan $${(metaAhorro - sobrante).toFixed(2)} para alcanzar tu meta.</p>`
                    }
                </div>
                ` : ''}
                
                <!-- GRÁFICA DE DISTRIBUCIÓN DE GASTOS -->
                <div class="chart-container">
                    <h3 style="color: #667eea; margin-bottom: 15px;">📊 Distribución de tus Gastos</h3>
                    <canvas id="gastosChart"></canvas>
                </div>
                
                <!-- ALERTAS INTELIGENTES -->
                <div class="smart-alerts">
                    <h3 style="color: #667eea; margin-bottom: 15px;">💡 Alertas Inteligentes</h3>
                </div>
                
                <div class="resumen-box">
                    <h3 style="color: #667eea; margin-bottom: 15px;">💰 Resumen General</h3>
                    ${balanceActual > 0 ? `
                    <div class="resumen-item" style="background: #e8f5e9;">
                        <span>💵 Balance Actual (Capital):</span>
                        <span style="color: #37b24d; font-weight: bold;">$${balanceActual.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="resumen-item">
                        <span>Total Ingresos Mensuales:</span>
                        <span style="color: #51cf66; font-weight: bold;">$${totalIngresos.toFixed(2)}</span>
                    </div>
                    ${balanceActual > 0 ? `
                    <div class="resumen-item">
                        <span>💎 Capital Total (Balance + Ingresos):</span>
                        <span style="color: #51cf66; font-weight: bold;">$${capitalTotal.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="resumen-item">
                        <span>Total Gastos Fijos:</span>
                        <span style="color: #ff6b6b; font-weight: bold;">$${totalGastos.toFixed(2)}</span>
                    </div>
                    <div class="resumen-item">
                        <span>Total Misceláneos:</span>
                        <span style="color: #f59f00; font-weight: bold;">$${totalMiscelaneos.toFixed(2)}</span>
                    </div>
                    ${totalImprevistos > 0 ? `
                    <div class="resumen-item">
                        <span>🚨 Gastos Imprevistos (Este Mes):</span>
                        <span style="color: #ff6b6b; font-weight: bold;">$${totalImprevistos.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    ${metaAhorro > 0 ? `
                    <div class="resumen-item" style="background: #fff3e0;">
                        <span>🎯 Meta de Ahorro:</span>
                        <span style="color: #f57c00; font-weight: bold;">$${metaAhorro.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="resumen-item">
                        <span>Total Gastos:</span>
                        <span style="color: #ff6b6b; font-weight: bold;">$${totalGastosCompleto.toFixed(2)}</span>
                    </div>
                    <div class="resumen-item">
                        <span>${sobrante >= 0 ? '💵 Te Sobra:' : '⚠️ Te Falta:'}</span>
                        <span style="color: ${sobrante >= 0 ? '#51cf66' : '#ff6b6b'};">$${Math.abs(sobrante).toFixed(2)}</span>
                    </div>
                    ${metaAhorro > 0 && sobrante >= 0 ? `
                    <div class="resumen-item" style="background: #e8f5e9;">
                        <span>✅ ¡Cumplirás tu meta de ahorro!</span>
                        <span style="color: #37b24d; font-weight: bold;">🎉</span>
                    </div>
                    ` : metaAhorro > 0 ? `
                    <div class="resumen-item" style="background: #ffebee;">
                        <span>⚠️ Ajusta gastos para alcanzar tu meta</span>
                        <span style="color: #ff6b6b; font-weight: bold;">Falta: $${Math.abs(sobrante).toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="calendario-pago">
                    <div class="pago-title">
                        💳 PAYCHECK 1 (${diaPago1} de ${mesesNombres[mesPago1]}) - $${montoPago1.toFixed(2)}
                    </div>
                    <div class="pago-detalle">
            `;
            
            if (gastosPago1.length > 0) {
                gastosPago1.sort((a, b) => a.dia - b.dia).forEach(gasto => {
                    const mesTexto = gasto.mes && gasto.mes !== 'todos' ? ` de ${mesesNombres[parseInt(gasto.mes)]}` : '';
                    
                    let itemClass = 'pago-item';
                    let itemStyle = '';
                    let icon = '✅';
                    let detalle = '';
                    
                    if (gasto.tipo === 'tarjeta') {
                        itemStyle = 'border-left-color: #667eea; background: #f0f2ff;';
                        icon = '💳';
                        
                        if (gasto.faltante && gasto.faltante > 0) {
                            detalle = ` <span style="color: #ff6b6b;">⚠️ (Falta: $${gasto.faltante.toFixed(2)} para el mínimo de $${(gasto.minimo || 0).toFixed(2)})</span>`;
                        } else if (gasto.opcionMinimo && gasto.opcionRecomendado) {
                            let detalleDeuda = gasto.deuda > 0 ? ` - Balance: $${gasto.deuda.toFixed(2)}` : '';
                            let extra = gasto.extraRecomendado || 0;
                            detalle = `<br><span style="color: #667eea; font-weight: bold;">💡 Opciones:</span> <span style="color: #ff9800;">Mínimo $${gasto.opcionMinimo.toFixed(2)}</span> o <span style="color: #51cf66;">✨ $${gasto.opcionRecomendado.toFixed(2)} (+ $${extra.toFixed(2)})</span>${detalleDeuda}`;
                        } else {
                            // Fallback if no options calculated
                            let detalleDeuda = gasto.deuda > 0 ? ` - Balance: $${gasto.deuda.toFixed(2)}` : '';
                            detalle = `<br><span style="color: #ff9800;">Pago mínimo: $${(gasto.minimo || 0).toFixed(2)}</span>${detalleDeuda}`;
                        }
                    } else if (gasto.tipo === 'variable') {
                        itemStyle = 'border-left-color: #51cf66;';
                        icon = '📦';
                    } else if (gasto.tipo === 'imprevisto') {
                        itemStyle = 'border-left-color: #ff6b6b; background: #fff5f5;';
                        icon = '🚨';
                        detalle = ` <span style="color: #ff6b6b; font-weight: bold;">(GASTO ÚNICO - Solo este mes)</span>`;
                    }
                    
                    resultadoHTML += `
                        <div class="${itemClass}" style="${itemStyle}">
                            ${icon} <strong>${gasto.nombre}</strong>: $${gasto.monto.toFixed(2)} (vence día ${gasto.dia}${mesTexto})<br>
                            ${detalle}
                        </div>
                    `;
                });
            }
            
            if (totalMiscelaneos > 0) {
                resultadoHTML += `
                    <div class="pago-item" style="border-left-color: #ffd43b; background: #fffbf0;">
                        🎯 <strong>Presupuesto Misceláneos (1ra quincena)</strong>: $${miscelaneosPorPago.toFixed(2)}
                    </div>
                `;
            }
            
            if (gastosPago1.length > 0 || totalMiscelaneos > 0) {
                // Calcular ahorro por paycheck si hay meta
                const ahorroPorPaycheck = metaAhorro / (esSemanal ? 4 : 2);
                const sobranteDespuesAhorro1 = (montoPago1 - totalPago1) - ahorroPorPaycheck;
                
                resultadoHTML += `
                    <div style="margin-top: 15px; padding: 15px; background: #e8eaff; border-radius: 8px; font-weight: bold;">
                        Total a pagar: $${totalPago1.toFixed(2)} | 
                        <span style="color: ${(montoPago1 - totalPago1) >= 0 ? '#51cf66' : '#ff6b6b'};">
                            Te ${(montoPago1 - totalPago1) >= 0 ? 'sobran' : 'faltan'}: $${Math.abs(montoPago1 - totalPago1).toFixed(2)}
                        </span>
                        ${metaAhorro > 0 ? `
                        <br><br>
                        <div style="background: #51cf66; color: white; padding: 12px; border-radius: 8px; margin-top: 10px;">
                            💰 <strong>AHORRO:</strong> Aparta $${ahorroPorPaycheck.toFixed(2)} apenas cobres
                            <br>
                            <span style="font-size: 0.9em;">Después del ahorro te quedan: 
                            <strong style="color: ${sobranteDespuesAhorro1 >= 0 ? '#d1f7dd' : '#ff6b6b'};">
                                $${sobranteDespuesAhorro1.toFixed(2)}
                            </strong> disponibles</span>
                        </div>
                        ` : ''}
                    </div>
                `;
            } else {
                resultadoHTML += `<p style="color: #999;">No hay gastos asignados a este pago</p>`;
            }
            
            resultadoHTML += `
                    </div>
                </div>
                
                <div class="calendario-pago">
                    <div class="pago-title">
                        💳 PAYCHECK 2 (${diaPago2} de ${mesesNombres[mesPago2]}) - $${montoPago2.toFixed(2)}
                    </div>
                    <div class="pago-detalle">
            `;
            
            if (gastosPago2.length > 0) {
                gastosPago2.sort((a, b) => a.dia - b.dia).forEach(gasto => {
                    const mesTexto = gasto.mes && gasto.mes !== 'todos' ? ` de ${mesesNombres[parseInt(gasto.mes)]}` : '';
                    
                    let itemClass = 'pago-item';
                    let itemStyle = '';
                    let icon = '✅';
                    let detalle = '';
                    
                    if (gasto.tipo === 'tarjeta') {
                        itemStyle = 'border-left-color: #667eea; background: #f0f2ff;';
                        icon = '💳';
                        
                        if (gasto.faltante && gasto.faltante > 0) {
                            detalle = ` <span style="color: #ff6b6b;">⚠️ (Falta: $${gasto.faltante.toFixed(2)} para el mínimo de $${(gasto.minimo || 0).toFixed(2)})</span>`;
                        } else if (gasto.opcionMinimo && gasto.opcionRecomendado) {
                            let detalleDeuda = gasto.deuda > 0 ? ` - Balance: $${gasto.deuda.toFixed(2)}` : '';
                            let extra = gasto.extraRecomendado || 0;
                            detalle = `<br><span style="color: #667eea; font-weight: bold;">💡 Opciones:</span> <span style="color: #ff9800;">Mínimo $${gasto.opcionMinimo.toFixed(2)}</span> o <span style="color: #51cf66;">✨ $${gasto.opcionRecomendado.toFixed(2)} (+ $${extra.toFixed(2)})</span>${detalleDeuda}`;
                        } else {
                            // Fallback if no options calculated
                            let detalleDeuda = gasto.deuda > 0 ? ` - Balance: $${gasto.deuda.toFixed(2)}` : '';
                            detalle = `<br><span style="color: #ff9800;">Pago mínimo: $${(gasto.minimo || 0).toFixed(2)}</span>${detalleDeuda}`;
                        }
                    } else if (gasto.tipo === 'variable') {
                        itemStyle = 'border-left-color: #51cf66;';
                        icon = '📦';
                    } else if (gasto.tipo === 'imprevisto') {
                        itemStyle = 'border-left-color: #ff6b6b; background: #fff5f5;';
                        icon = '🚨';
                        detalle = ` <span style="color: #ff6b6b; font-weight: bold;">(GASTO ÚNICO - Solo este mes)</span>`;
                    }
                    
                    resultadoHTML += `
                        <div class="${itemClass}" style="${itemStyle}">
                            ${icon} <strong>${gasto.nombre}</strong>: $${gasto.monto.toFixed(2)} (vence día ${gasto.dia}${mesTexto})<br>
                            ${detalle}
                        </div>
                    `;
                });
            }
            
            if (totalMiscelaneos > 0) {
                resultadoHTML += `
                    <div class="pago-item" style="border-left-color: #ffd43b; background: #fffbf0;">
                        🎯 <strong>Presupuesto Misceláneos (2da quincena)</strong>: $${miscelaneosPorPago.toFixed(2)}
                    </div>
                `;
            }
            
            if (gastosPago2.length > 0 || totalMiscelaneos > 0) {
                // Calcular ahorro por paycheck si hay meta
                const ahorroPorPaycheck = metaAhorro / (esSemanal ? 4 : 2);
                const sobranteDespuesAhorro2 = (montoPago2 - totalPago2) - ahorroPorPaycheck;
                
                resultadoHTML += `
                    <div style="margin-top: 15px; padding: 15px; background: #e8eaff; border-radius: 8px; font-weight: bold;">
                        Total a pagar: $${totalPago2.toFixed(2)} | 
                        <span style="color: ${(montoPago2 - totalPago2) >= 0 ? '#51cf66' : '#ff6b6b'};">
                            Te ${(montoPago2 - totalPago2) >= 0 ? 'sobran' : 'faltan'}: $${Math.abs(montoPago2 - totalPago2).toFixed(2)}
                        </span>
                        ${metaAhorro > 0 ? `
                        <br><br>
                        <div style="background: #51cf66; color: white; padding: 12px; border-radius: 8px; margin-top: 10px;">
                            💰 <strong>AHORRO:</strong> Aparta $${ahorroPorPaycheck.toFixed(2)} apenas cobres
                            <br>
                            <span style="font-size: 0.9em;">Después del ahorro te quedan: 
                            <strong style="color: ${sobranteDespuesAhorro2 >= 0 ? '#d1f7dd' : '#ff6b6b'};">
                                $${sobranteDespuesAhorro2.toFixed(2)}
                            </strong> disponibles</span>
                        </div>
                        ` : ''}
                    </div>
                `;
            } else {
                resultadoHTML += `<p style="color: #999;">No hay gastos asignados a este pago</p>`;
            }
            
            resultadoHTML += `
                    </div>
                </div>
            `;
            
            // COMPARACIÓN DE PAYCHECKS
            const sobrantePago1 = montoPago1 - totalPago1;
            const sobrantePago2 = montoPago2 - totalPago2;
            const diferenciaPaychecks = Math.abs(sobrantePago1 - sobrantePago2);
            
            resultadoHTML += `
                <div class="resumen-box" style="border-left-color: #667eea; background: linear-gradient(135deg, #f8f9ff 0%, #e8eaff 100%);">
                    <h3 style="color: #667eea; margin-bottom: 15px;">⚖️ Comparación de PayChecks</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div style="background: ${sobrantePago1 >= sobrantePago2 ? '#d1e7dd' : '#fff3cd'}; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">💳 PayCheck 1</div>
                            <div style="font-size: 1.3em; font-weight: bold; color: ${sobrantePago1 >= 0 ? '#37b24d' : '#ff6b6b'};">
                                ${sobrantePago1 >= 0 ? 'Sobran' : 'Faltan'}: $${Math.abs(sobrantePago1).toFixed(2)}
                            </div>
                            ${sobrantePago1 >= sobrantePago2 ? '<div style="margin-top: 5px; color: #37b24d;">✅ Más Alivio</div>' : ''}
                        </div>
                        <div style="background: ${sobrantePago2 >= sobrantePago1 ? '#d1e7dd' : '#fff3cd'}; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">💳 PayCheck 2</div>
                            <div style="font-size: 1.3em; font-weight: bold; color: ${sobrantePago2 >= 0 ? '#37b24d' : '#ff6b6b'};">
                                ${sobrantePago2 >= 0 ? 'Sobran' : 'Faltan'}: $${Math.abs(sobrantePago2).toFixed(2)}
                            </div>
                            ${sobrantePago2 >= sobrantePago1 ? '<div style="margin-top: 5px; color: #37b24d;">✅ Más Alivio</div>' : ''}
                        </div>
                    </div>
                    <div style="background: ${sobrantePago1 >= 0 && sobrantePago2 >= 0 ? '#e7f5ff' : '#fff3cd'}; padding: 12px; border-radius: 8px; text-align: center; font-size: 0.9em;">
                        ${sobrantePago1 >= 0 && sobrantePago2 >= 0 ? 
                            `💡 <strong>Ambos paychecks están balanceados.</strong> Diferencia: $${diferenciaPaychecks.toFixed(2)}` :
                            sobrantePago1 < 0 || sobrantePago2 < 0 ?
                            `⚠️ <strong>Atención:</strong> Al menos un paycheck tiene déficit. Considera redistribuir gastos.` :
                            `⚡ <strong>El PayCheck ${sobrantePago1 < sobrantePago2 ? '1' : '2'} está más ajustado.</strong> Diferencia: $${diferenciaPaychecks.toFixed(2)}`
                        }
                    </div>
                </div>
            `;
            
            // ANÁLISIS DE GASTOS IMPREVISTOS
            if (totalImprevistos > 0) {
                const porcentajeImprevistos = (totalImprevistos / totalIngresos * 100).toFixed(1);
                const imprevistosDesglose = imprevistos.map(imp => `<li><strong>${imp.nombre}:</strong> $${imp.monto.toFixed(2)}</li>`).join('');
                
                resultadoHTML += `
                    <div class="resumen-box" style="border-left-color: #ff6b6b; background: linear-gradient(135deg, #fff5f5 0%, #ffe9e9 100%);">
                        <h3 style="color: #ff6b6b; margin-bottom: 15px;">🚨 Análisis de Gastos Imprevistos</h3>
                        <div style="background: white; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <span style="font-size: 1.1em; font-weight: bold;">Total Imprevistos Este Mes:</span>
                                <span style="font-size: 1.5em; font-weight: bold; color: #ff6b6b;">$${totalImprevistos.toFixed(2)}</span>
                            </div>
                            <div style="font-size: 0.9em; color: #666;">
                                Representa el <strong>${porcentajeImprevistos}%</strong> de tus ingresos mensuales
                            </div>
                        </div>
                        
                        <div style="background: #fff; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
                            <h4 style="color: #666; margin-bottom: 10px; font-size: 0.95em;">📋 Desglose:</h4>
                            <ul style="margin: 0; padding-left: 20px; color: #333;">
                                ${imprevistosDesglose}
                            </ul>
                        </div>
                        
                        <div style="background: #e7f5ff; padding: 15px; border-radius: 10px;">
                            <strong style="color: #1c7ed6;">💡 Buenas Noticias:</strong>
                            <p style="margin: 8px 0 0 0; color: #495057;">
                                Estos gastos <strong>NO se repetirán el próximo mes.</strong> 
                                Si mantienes tus gastos fijos actuales, tendrás aproximadamente 
                                <strong style="color: #37b24d;">$${totalImprevistos.toFixed(2)} más disponibles</strong> 
                                el próximo mes para ahorrar o para otros objetivos.
                            </p>
                        </div>
                        
                        ${totalImprevistos > totalIngresos * 0.2 ? `
                        <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-top: 15px; font-size: 0.9em; color: #856404;">
                            ⚠️ <strong>Consejo:</strong> Los imprevistos representan más del 20% de tus ingresos. 
                            Considera crear un fondo de emergencia para estos casos.
                        </div>
                        ` : ''}
                    </div>
                `;
            }
            
            // Desglose de misceláneos
            if (miscelaneos.length > 0) {
                resultadoHTML += `
                    <div class="resumen-box" style="border-left-color: #ffd43b;">
                        <h3 style="color: #f59f00; margin-bottom: 15px;">🎯 Desglose de Misceláneos</h3>
                        <p style="color: #666; margin-bottom: 10px; font-size: 0.9em;">
                            Presupuesto sugerido dividido entre tus 2 quincenas ($${miscelaneosPorPago.toFixed(2)} c/u):
                        </p>
                `;
                
                miscelaneos.forEach(misc => {
                    if (!misc || !misc.monto) return; // Skip if undefined
                    const porPago = misc.monto / 2;
                    resultadoHTML += `
                        <div class="resumen-item">
                            <span>• ${misc.nombre || 'Sin nombre'}</span>
                            <span style="color: #f59f00;">$${misc.monto.toFixed(2)}/mes ($${porPago.toFixed(2)} c/quincena)</span>
                        </div>
                    `;
                });
                
                resultadoHTML += `
                        <div style="margin-top: 15px; padding: 10px; background: #fffbf0; border-radius: 5px; font-size: 0.9em; color: #666;">
                            💡 <strong>Tip:</strong> Intenta no exceder estos montos para mantener tus finanzas en orden
                        </div>
                    </div>
                `;
            }
            
            if (sobrante > 0) {
                const ahorroSugerido = Math.floor(sobrante * 0.8);
                const emergencias = sobrante - ahorroSugerido;
                
                resultadoHTML += `
                    <div class="ahorro-box">
                        <h3>🎯 Plan de Ahorro Sugerido</h3>
                        <div class="ahorro-amount">$${ahorroSugerido.toFixed(2)}</div>
                        <p style="font-size: 1.1em;">Puedes ahorrar este mes (${porcentajeAhorro}% de tus ingresos)</p>
                        <p style="margin-top: 10px; font-size: 0.95em;">💡 Deja $${emergencias.toFixed(2)} para imprevistos</p>
                        <p style="margin-top: 5px; font-size: 0.9em;">📈 En un año ahorrarías: $${(ahorroSugerido * 12).toFixed(2)}</p>
                    </div>
                `;
            } else if (sobrante < 0) {
                resultadoHTML += `
                    <div class="alert">
                        ⚠️ ALERTA: Tus gastos superan tus ingresos por $${Math.abs(sobrante).toFixed(2)}
                    </div>
                    <div class="consejos">
                        <h3 style="color: #f59f00; margin-bottom: 15px;">⚡ Recomendaciones Urgentes:</h3>
                        <div class="consejo-item">🔍 Revisa los gastos que puedas reducir o eliminar</div>
                        <div class="consejo-item">💬 Negocia pagos o plazos con tus proveedores</div>
                        <div class="consejo-item">📊 Busca ingresos adicionales temporales</div>
                        <div class="consejo-item">🎯 Prioriza los gastos esenciales (servicios básicos)</div>
                        <div class="consejo-item">🎯 <strong>Reduce misceláneos:</strong> Son gastos variables que puedes controlar</div>
                    </div>
                `;
            }
            
            // GENERAR CONSEJOS PERSONALIZADOS
            let consejosHTML = '';
            let numConsejos = 0;
            
            // Consejo 1: Sobre tarjetas de crédito (si hay)
            if (tarjetas.length > 0) {
                const totalDeudasTarjetas = tarjetas.reduce((sum, t) => sum + t.deuda, 0);
                const totalMinimos = tarjetas.reduce((sum, t) => sum + t.minimo, 0);
                const pagoExtra = totalDeudasTarjetas - totalMinimos;
                
                if (totalDeudasTarjetas > totalMinimos * 2) {
                    consejosHTML += `
                        <div class="consejo-item">
                            💳 <strong>Tus Tarjetas:</strong> Debes $${totalDeudasTarjetas.toFixed(2)} en total. 
                            Si pagas solo el mínimo ($${totalMinimos.toFixed(2)}), tardarás mucho en liquidar. 
                            ${sobrante > 100 ? `Intenta abonar $${Math.min(sobrante * 0.3, pagoExtra * 0.2).toFixed(2)} extra este mes.` : ''}
                        </div>
                    `;
                    numConsejos++;
                }
            }
            
            // Consejo 2: Sobre el paycheck más ajustado
            // Ya tenemos sobrantePago1 y sobrantePago2 declarados arriba, los reutilizamos
            
            if (Math.abs(sobrantePago1 - sobrantePago2) > 200) {
                const paycheckAjustado = sobrantePago1 < sobrantePago2 ? 1 : 2;
                const diferencia = Math.abs(sobrantePago1 - sobrantePago2);
                consejosHTML += `
                    <div class="consejo-item">
                        ⚖️ <strong>Balance de PayChecks:</strong> Tu PayCheck ${paycheckAjustado} está $${diferencia.toFixed(2)} más ajustado. 
                        Considera mover algunos gastos flexibles al otro paycheck para equilibrar mejor.
                    </div>
                `;
                numConsejos++;
            }
            
            // Consejo 3: Sobre fondo de emergencia
            const fondoRecomendado = totalGastos * 3;
            if (balanceActual < fondoRecomendado) {
                const faltaFondo = fondoRecomendado - balanceActual;
                const mesesParaFondo = Math.ceil(faltaFondo / (sobrante > 0 ? sobrante : 1));
                consejosHTML += `
                    <div class="consejo-item">
                        🎯 <strong>Fondo de Emergencia:</strong> Se recomienda tener 3 meses de gastos ahorrados ($${fondoRecomendado.toFixed(2)}). 
                        Te falta $${faltaFondo.toFixed(2)}. ${sobrante > 0 ? `Ahorrando tu sobrante actual, lo lograrías en ~${mesesParaFondo} meses.` : 'Intenta reducir gastos para crear este fondo.'}
                    </div>
                `;
                numConsejos++;
            }
            
            // Consejo 4: Sobre imprevistos
            if (totalImprevistos > totalIngresos * 0.15) {
                consejosHTML += `
                    <div class="consejo-item">
                        🚨 <strong>Gastos Imprevistos:</strong> Este mes tuviste $${totalImprevistos.toFixed(2)} en imprevistos (${(totalImprevistos/totalIngresos*100).toFixed(1)}% de tus ingresos). 
                        Como no son recurrentes, el próximo mes podrás usar ese dinero para ahorrar o pagar deudas.
                    </div>
                `;
                numConsejos++;
            }
            
            // Consejo 5: Sobre ahorro (si está bien)
            if (sobrante > capitalTotal * 0.2) {
                const ahorroAnual = sobrante * 12;
                consejosHTML += `
                    <div class="consejo-item">
                        🎉 <strong>¡Excelente Ahorro!</strong> Estás ahorrando ${((sobrante/capitalTotal)*100).toFixed(1)}% de tu capital. 
                        Si mantienes este ritmo, en un año ahorrarás $${ahorroAnual.toFixed(2)}. 
                        Considera invertir parte de ese dinero para que crezca más.
                    </div>
                `;
                numConsejos++;
            }
            
            // Consejo 6: Sobre gastos de transporte (si son altos)
            const gastosTransporte = gastos.filter(g => g.nombre.toLowerCase().includes('carro') || g.nombre.toLowerCase().includes('gasolina')).reduce((sum, g) => sum + g.monto, 0);
            if (gastosTransporte > totalIngresos * 0.2) {
                consejosHTML += `
                    <div class="consejo-item">
                        🚗 <strong>Transporte:</strong> Gastas $${gastosTransporte.toFixed(2)} en transporte (${(gastosTransporte/totalIngresos*100).toFixed(1)}% de ingresos). 
                        Lo recomendado es 15-20%. Considera carpooling o transporte público para reducir este gasto.
                    </div>
                `;
                numConsejos++;
            }
            
            // Consejo 7: Sobre fecha de vencimiento (si hay gastos cerca)
            const hoy = new Date().getDate();
            const gastosProximos = gastos.filter(g => g.dia <= hoy + 7 && g.dia >= hoy);
            if (gastosProximos.length > 0) {
                const nombresGastos = gastosProximos.map(g => g.nombre).slice(0, 3).join(', ');
                consejosHTML += `
                    <div class="consejo-item">
                        📅 <strong>Próximos Vencimientos:</strong> En los próximos 7 días vencen: ${nombresGastos}${gastosProximos.length > 3 ? ' y otros' : ''}. 
                        Asegúrate de tener el dinero disponible para evitar cargos por mora.
                    </div>
                `;
                numConsejos++;
            }
            
            // Consejo 8: Domiciliar pagos (si hay muchos gastos)
            if (gastos.length >= 5) {
                consejosHTML += `
                    <div class="consejo-item">
                        📱 <strong>Domicilia tus Pagos:</strong> Tienes ${gastos.length} gastos fijos mensuales. 
                        Considera domiciliar al menos ${Math.min(5, gastos.length)} de ellos para no olvidar ningún pago.
                    </div>
                `;
                numConsejos++;
            }
            
            // Consejo 9: Regla 50/30/20 personalizada
            const porcentajeNecesidades = (totalGastos / totalIngresos) * 100;
            const porcentajeAhorroLocal = (sobrante / totalIngresos) * 100;
            consejosHTML += `
                <div class="consejo-item">
                    💰 <strong>Tu Regla Personal:</strong> Actualmente: ${porcentajeNecesidades.toFixed(0)}% necesidades, ${porcentajeAhorroLocal.toFixed(0)}% ahorro. 
                    ${porcentajeAhorroLocal >= 20 ? '¡Cumples con la regla 50/30/20! 🎯' : `Intenta llegar al 20% de ahorro (faltan ${(20-porcentajeAhorroLocal).toFixed(0)}%).`}
                </div>
            `;
            numConsejos++;
            
            // Si no hay suficientes consejos, agregar consejos generales útiles
            if (numConsejos < 5) {
                consejosHTML += `
                    <div class="consejo-item">
                        💾 <strong>Guarda Este Mes:</strong> Usa el botón "💾 Guardar Este Mes" para hacer seguimiento de tu progreso mensual y comparar tu evolución.
                    </div>
                `;
            }
            
            resultadoHTML += `
                <div class="consejos">
                    <h3 style="color: #f59f00; margin-bottom: 15px;">💡 Consejos Personalizados Para Ti</h3>
                    ${consejosHTML || '<div class="consejo-item">✅ ¡Todo se ve bien! Continúa así y revisa mensualmente.</div>'}
                </div>
                
                <div class="action-buttons">
                    <button onclick="guardarMes()" class="btn-secondary" style="flex: 1; min-width: 200px;">
                        💾 GUARDAR ESTE MES
                    </button>
                    <button onclick="verProgresoAhorro()" class="btn-secondary" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);">
                        📊 VER PROGRESO DE AHORRO
                    </button>
                    <button onclick="verHistorial()" class="btn-secondary" style="flex: 1; min-width: 200px;">
                        📂 VER MESES ANTERIORES
                    </button>
                    <button onclick="compararMeses()" class="btn-secondary" style="flex: 1; min-width: 200px;">
                        📈 COMPARAR MESES
                    </button>
                </div>
                
                <button onclick="exportarPDF()" style="width: 100%; background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%); color: white; border: none; padding: 18px; border-radius: 15px; font-size: 1.2em; font-weight: bold; cursor: pointer; margin-top: 20px; box-shadow: 0 10px 30px rgba(81, 207, 102, 0.3); transition: all 0.3s;">
                    🖨️ IMPRIMIR / GUARDAR COMO PDF
                </button>
                
                <div style="margin-top: 15px; padding: 15px; background: #e7f5ff; border-radius: 10px; font-size: 0.9em; color: #1c7ed6;">
                    <strong>💡 ¿No funciona el botón?</strong><br>
                    <strong>En computadora:</strong> Presiona Ctrl+P (Windows) o Cmd+P (Mac)<br>
                    <strong>En iPhone/iPad:</strong> Toca el botón de compartir 🔗 arriba, luego selecciona "Imprimir" o captura de pantalla y compártela
                </div>
            `;
            
            // GENERAR ALERTAS INTELIGENTES
            let alertasHTML = '';
            
            // Alerta: Renta muy alta
            const porcentajeRenta = (gastos.find(g => g.nombre && g.nombre.toLowerCase().includes('renta'))?.monto || 0) / totalIngresos * 100;
            if (porcentajeRenta > 30) {
                alertasHTML += `
                    <div class="alert-item alert-warning">
                        <span class="icon">⚠️</span>
                        <div class="content">
                            <strong>Renta Alta</strong>
                            <p>Tu renta es el ${porcentajeRenta.toFixed(0)}% de tus ingresos. Lo recomendado es máximo 30%.</p>
                        </div>
                    </div>
                `;
            }
            
            // Alerta: Sin ahorro
            if (sobrante <= 0) {
                alertasHTML += `
                    <div class="alert-item alert-warning">
                        <span class="icon">💸</span>
                        <div class="content">
                            <strong>Sin Capacidad de Ahorro</strong>
                            <p>Tus gastos igualan o superan tus ingresos. Considera reducir gastos no esenciales.</p>
                        </div>
                    </div>
                `;
            }
            
            // Alerta: Buen ahorro
            if (sobrante > capitalTotal * 0.2) {
                alertasHTML += `
                    <div class="alert-item alert-success">
                        <span class="icon">🎉</span>
                        <div class="content">
                            <strong>¡Excelente Ahorro!</strong>
                            <p>Estás ahorrando más del 20% de tu capital. ¡Sigue así!</p>
                        </div>
                    </div>
                `;
            }
            
            // Alerta: Deuda de tarjetas alta
            if (totalDeudasTarjetas > totalIngresos) {
                alertasHTML += `
                    <div class="alert-item alert-warning">
                        <span class="icon">💳</span>
                        <div class="content">
                            <strong>Deuda de Tarjetas Alta</strong>
                            <p>Debes $${totalDeudasTarjetas.toFixed(2)} en tarjetas, más que tus ingresos mensuales. Considera un plan de pago agresivo.</p>
                        </div>
                    </div>
                `;
            }
            
            // Alerta: Sin fondo de emergencia
            if (balanceActual < totalGastos) {
                alertasHTML += `
                    <div class="alert-item alert-info">
                        <span class="icon">💡</span>
                        <div class="content">
                            <strong>Fondo de Emergencia</strong>
                            <p>Tu balance actual ($${balanceActual.toFixed(2)}) es menor que tus gastos mensuales. Se recomienda tener 3-6 meses de gastos ahorrados.</p>
                        </div>
                    </div>
                `;
            }
            
            // Insertar alertas en el HTML
            resultadoHTML = resultadoHTML.replace('<div class="smart-alerts">', `<div class="smart-alerts">${alertasHTML || '<p style="color: #666; text-align: center;">Sin alertas por ahora. ¡Todo bien! 👍</p>'}`);
            
            document.getElementById('resultado').innerHTML = resultadoHTML;
            document.getElementById('resultado').classList.add('show');
            document.getElementById('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // GENERAR GRÁFICA DE PASTEL
            renderizarGraficos(gastos, tarjetas, totalMiscelaneos, totalImprevistos);
            
            } catch (error) {
                console.error('❌ Error detallado:', error);
                console.error('Stack:', error.stack);
                alert('❌ Error al calcular:\n\n' + error.message + '\n\nRevisa la consola (F12) para más detalles.');
            }
        }
        
        // ==================== FUNCIONES DE GUARDADO ====================
        
        function guardarMes() {
            // Obtener datos actuales del formulario
            const mesActual = document.getElementById('mes-pago1').value;
            const añoActual = new Date().getFullYear();
            const mesesNombres = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const nombreMes = mesesNombres[parseInt(mesActual)];
            
            // Crear clave única para el mes
            const clave = `finanzas_${añoActual}_${mesActual.padStart(2, '0')}`;
            
            // Obtener tipo de ahorro y datos relacionados
            const tipoAhorro = document.querySelector('input[name="tipo-ahorro"]:checked').value;
            const metaAhorro = parseFloat(document.getElementById('meta-ahorro').value) || 0;
            
            let objetivoAhorro = null;
            if (tipoAhorro === 'fecha') {
                const metaTotal = parseFloat(document.getElementById('meta-total').value) || 0;
                const fechaObjetivo = document.getElementById('fecha-objetivo').value;
                
                if (metaTotal > 0 && fechaObjetivo) {
                    objetivoAhorro = {
                        metaTotal: metaTotal,
                        fechaObjetivo: fechaObjetivo,
                        ahorroPorMes: metaAhorro
                    };
                }
            }
            
            // Recolectar TODOS los gastos fijos
            const gastosFijos = [];
            const filasGastosFijos = document.querySelectorAll('#tabla-gastos-fijos-body tr');
            filasGastosFijos.forEach(fila => {
                const nombre = fila.querySelector('.gasto-fijo-nombre')?.value || '';
                const monto = parseFloat(fila.querySelector('.gasto-fijo-monto')?.value) || 0;
                const dia = parseInt(fila.querySelector('.gasto-fijo-dia')?.value) || 0;
                const mes = fila.querySelector('.gasto-fijo-mes')?.value || '';
                const recurrencia = fila.querySelector('.gasto-fijo-recurrencia')?.value || '';
                
                if (nombre && monto > 0) {
                    gastosFijos.push({ nombre, monto, dia, mes, recurrencia });
                }
            });
            
            // Recolectar tarjetas
            const tarjetas = [];
            const tarjetasElements = document.querySelectorAll('#tarjetas-container .gasto-categoria');
            tarjetasElements.forEach(tarjetaEl => {
                const nombre = tarjetaEl.querySelector('.tarjeta-nombre')?.value || '';
                const minimo = parseFloat(tarjetaEl.querySelector('.tarjeta-minimo')?.value) || 0;
                const deuda = parseFloat(tarjetaEl.querySelector('.tarjeta-deuda')?.value) || 0;
                const mes = tarjetaEl.querySelector('.tarjeta-mes')?.value || '';
                const dia = parseInt(tarjetaEl.querySelector('.tarjeta-dia')?.value) || 0;
                
                if (nombre && minimo > 0) {
                    tarjetas.push({ nombre, minimo, deuda, mes, dia });
                }
            });
            
            // Recolectar misceláneos
            const miscelaneos = [];
            const miscelaneosElements = document.querySelectorAll('#miscelaneos-container .gasto-item');
            miscelaneosElements.forEach(miscEl => {
                const nombre = miscEl.querySelector('.miscelaneo-nombre-input')?.value || '';
                const monto = parseFloat(miscEl.querySelector('.miscelaneo-monto')?.value) || 0;
                
                if (nombre && monto > 0) {
                    miscelaneos.push({ nombre, monto });
                }
            });
            
            // Recolectar imprevistos
            const imprevistos = [];
            const imprevistosElements = document.querySelectorAll('#imprevistos-container .gasto-item');
            imprevistosElements.forEach(impEl => {
                const nombre = impEl.querySelector('.imprevisto-nombre-input')?.value || '';
                const monto = parseFloat(impEl.querySelector('.imprevisto-monto')?.value) || 0;
                const mes = impEl.querySelector('.imprevisto-mes')?.value || '';
                const dia = parseInt(impEl.querySelector('.imprevisto-dia')?.value) || 0;
                
                if (nombre && monto > 0) {
                    imprevistos.push({ nombre, monto, mes, dia });
                }
            });
            
            // Calcular totales
            const montoPago1 = parseFloat(document.getElementById('monto-pago1').value) || 0;
            const montoPago2 = parseFloat(document.getElementById('monto-pago2').value) || 0;
            const montoPago3 = parseFloat(document.getElementById('monto-pago3')?.value) || 0;
            const montoPago4 = parseFloat(document.getElementById('monto-pago4')?.value) || 0;
            const tipoPago = document.querySelector('input[name="tipo-pago"]:checked').value;
            const esSemanal = tipoPago === 'semanal';
            
            const totalIngresos = esSemanal ? (montoPago1 + montoPago2 + montoPago3 + montoPago4) : (montoPago1 + montoPago2);
            const balanceActual = parseFloat(document.getElementById('balance-actual').value) || 0;
            const gastoGasolina = parseFloat(document.getElementById('gasto-gasolina')?.value) || 0;
            const gastoComida = parseFloat(document.getElementById('gasto-comida')?.value) || 0;
            
            const totalGastosFijos = gastosFijos.reduce((sum, g) => sum + g.monto, 0);
            const totalTarjetas = tarjetas.reduce((sum, t) => sum + t.minimo, 0);
            const totalMiscelaneos = miscelaneos.reduce((sum, m) => sum + m.monto, 0);
            const totalImprevistos = imprevistos.reduce((sum, i) => sum + i.monto, 0);
            const totalGastosVariables = gastoGasolina + gastoComida;
            
            const totalGastos = totalGastosFijos + totalTarjetas + totalMiscelaneos + totalImprevistos + totalGastosVariables;
            const capitalTotal = totalIngresos + balanceActual;
            const sobrante = capitalTotal - totalGastos - metaAhorro;
            
            // Obtener datos actuales del formulario
            const datos = {
                // Metadata
                fecha: new Date().toISOString(),
                mes: parseInt(mesActual),
                año: añoActual,
                nombreMes: nombreMes,
                
                // PayChecks
                tipoPago: tipoPago,
                paycheck1: {
                    mes: parseInt(document.getElementById('mes-pago1').value),
                    dia: parseInt(document.getElementById('dia-pago1').value),
                    monto: montoPago1
                },
                paycheck2: {
                    mes: parseInt(document.getElementById('mes-pago2').value),
                    dia: parseInt(document.getElementById('dia-pago2').value),
                    monto: montoPago2
                },
                paycheck3: esSemanal ? {
                    mes: parseInt(document.getElementById('mes-pago3').value),
                    dia: parseInt(document.getElementById('dia-pago3').value),
                    monto: montoPago3
                } : null,
                paycheck4: esSemanal ? {
                    mes: parseInt(document.getElementById('mes-pago4').value),
                    dia: parseInt(document.getElementById('dia-pago4').value),
                    monto: montoPago4
                } : null,
                
                // Capital y ahorro
                balanceActual: balanceActual,
                metaAhorro: metaAhorro,
                tipoAhorro: tipoAhorro,
                objetivoAhorro: objetivoAhorro,
                
                // Gastos variables
                gastoGasolina: gastoGasolina,
                gastoComida: gastoComida,
                
                // Todos los gastos detallados
                gastosFijos: gastosFijos,
                tarjetas: tarjetas,
                miscelaneos: miscelaneos,
                imprevistos: imprevistos,
                
                // Totales calculados
                totalIngresos: totalIngresos,
                capitalTotal: capitalTotal,
                totalGastosFijos: totalGastosFijos,
                totalTarjetas: totalTarjetas,
                totalMiscelaneos: totalMiscelaneos,
                totalImprevistos: totalImprevistos,
                totalGastosVariables: totalGastosVariables,
                totalGastos: totalGastos,
                sobrante: sobrante,
                ahorroReal: Math.max(sobrante, 0),
                cumplioMetaAhorro: sobrante >= 0
            };
            
            // Guardar en localStorage
            try {
                localStorage.setItem(clave, JSON.stringify(datos));
                localStorage.setItem('ultimo_mes_guardado', clave);
                
                // Si hay objetivo de ahorro, guardar/actualizar en el tracking global
                if (objetivoAhorro && metaAhorro > 0) {
                    // Guardar solo la meta mensual, NO el sobrante total
                    const ahorroParaObjetivo = sobrante >= 0 ? metaAhorro : 0;
                    guardarProgresoObjetivo(objetivoAhorro, ahorroParaObjetivo, nombreMes, añoActual);
                }
                
                let mensaje = `✅ ¡Mes guardado exitosamente!\n\n📅 ${nombreMes} ${añoActual}\n💰 Ingresos: ${datos.totalIngresos.toFixed(2)}\n💸 Gastos: ${datos.totalGastos.toFixed(2)}`;
                
                if (metaAhorro > 0) {
                    mensaje += `\n💎 Meta de ahorro: ${metaAhorro.toFixed(2)}`;
                    if (sobrante >= 0) {
                        mensaje += `\n✅ Ahorro logrado: ${sobrante.toFixed(2)}`;
                    } else {
                        mensaje += `\n⚠️ No se pudo cumplir la meta (faltaron ${Math.abs(sobrante).toFixed(2)})`;
                    }
                }
                
                if (objetivoAhorro) {
                    const progreso = calcularProgresoTotal(objetivoAhorro.fechaObjetivo);
                    mensaje += `\n\n🎯 Progreso hacia tu objetivo:\n${progreso.porcentaje.toFixed(1)}% completado (${progreso.ahorrado.toFixed(2)} de ${objetivoAhorro.metaTotal.toFixed(2)})`;
                }
                
                mensaje += `\n\n📊 Puedes ver el historial en "📂 Ver Meses Anteriores"`;
                
                alert(mensaje);
            } catch (error) {
                console.error('Error al guardar:', error);
                alert('❌ Error al guardar el mes. Tu navegador puede tener el almacenamiento deshabilitado.');
            }
        }
        
        function guardarProgresoObjetivo(objetivo, ahorroReal, nombreMes, año) {
            const claveObjetivo = `objetivo_${objetivo.fechaObjetivo}`;
            let tracking = localStorage.getItem(claveObjetivo);
            
            if (tracking) {
                tracking = JSON.parse(tracking);
            } else {
                tracking = {
                    fechaObjetivo: objetivo.fechaObjetivo,
                    metaTotal: objetivo.metaTotal,
                    mesesAhorro: []
                };
            }
            
            // Verificar si este mes ya existe (actualizar en lugar de duplicar)
            const indiceExistente = tracking.mesesAhorro.findIndex(m => m.mes === nombreMes && m.año === año);
            
            const registroMes = {
                mes: nombreMes,
                año: año,
                monto: ahorroReal, // Guardar el ahorro REAL logrado
                fecha: new Date().toISOString()
            };
            
            if (indiceExistente >= 0) {
                // Actualizar mes existente
                tracking.mesesAhorro[indiceExistente] = registroMes;
            } else {
                // Agregar nuevo mes
                tracking.mesesAhorro.push(registroMes);
            }
            
            localStorage.setItem(claveObjetivo, JSON.stringify(tracking));
        }
        
        function calcularProgresoTotal(fechaObjetivo) {
            const claveObjetivo = `objetivo_${fechaObjetivo}`;
            const tracking = localStorage.getItem(claveObjetivo);
            
            if (!tracking) {
                return { ahorrado: 0, porcentaje: 0 };
            }
            
            const data = JSON.parse(tracking);
            const totalAhorrado = data.mesesAhorro.reduce((sum, m) => sum + m.monto, 0);
            const porcentaje = (totalAhorrado / data.metaTotal) * 100;
            
            return {
                ahorrado: totalAhorrado,
                porcentaje: Math.min(porcentaje, 100),
                meta: data.metaTotal
            };
        }
        
        function verHistorial() {
            const modal = document.getElementById('modalHistorial');
            const content = document.getElementById('historialContent');
            
            // Obtener todos los meses guardados
            const mesesGuardados = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('finanzas_')) {
                    try {
                        const datos = JSON.parse(localStorage.getItem(key));
                        mesesGuardados.push({ key, ...datos });
                    } catch (e) {
                        console.error('Error al leer:', key, e);
                    }
                }
            }
            
            // Ordenar por fecha (más reciente primero)
            mesesGuardados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            
            if (mesesGuardados.length === 0) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <h3>📂 No hay meses guardados todavía</h3>
                        <p>Calcula tu plan financiero y presiona "💾 Guardar Este Mes" para empezar tu historial.</p>
                    </div>
                `;
            } else {
                let html = '<div style="margin-bottom: 20px;">';
                
                mesesGuardados.forEach(mes => {
                    const sobrante = mes.sobrante || 0;
                    const esPositivo = sobrante >= 0;
                    const cumplioMeta = mes.cumplioMetaAhorro !== false;
                    
                    html += `
                        <div class="month-card">
                            <div class="month-card-header">
                                <div class="month-card-title">📅 ${mes.nombreMes} ${mes.año}</div>
                                <span class="month-card-status ${esPositivo ? 'status-positive' : 'status-negative'}">
                                    ${esPositivo ? '✅ Ahorro' : '❌ Déficit'}
                                </span>
                            </div>
                            <div class="month-card-details">
                                <div class="month-detail">
                                    💰 <strong>Ingresos:</strong><br>${(mes.totalIngresos || 0).toFixed(2)}
                                </div>
                                <div class="month-detail">
                                    💸 <strong>Gastos:</strong><br>${(mes.totalGastos || 0).toFixed(2)}
                                </div>
                                <div class="month-detail">
                                    💵 <strong>Balance Inicial:</strong><br>${(mes.balanceActual || 0).toFixed(2)}
                                </div>
                                <div class="month-detail">
                                    ${esPositivo ? '💎 <strong>Ahorrado:</strong>' : '⚠️ <strong>Faltante:</strong>'}<br>
                                    <span style="color: ${esPositivo ? '#37b24d' : '#ff6b6b'};">${Math.abs(sobrante).toFixed(2)}</span>
                                </div>
                            </div>
                            
                            ${mes.metaAhorro > 0 ? `
                            <div style="margin-top: 10px; padding: 10px; background: ${cumplioMeta ? '#e8f5e9' : '#fff3e0'}; border-radius: 8px; font-size: 0.9em;">
                                🎯 <strong>Meta de ahorro:</strong> ${mes.metaAhorro.toFixed(2)} 
                                ${cumplioMeta ? '✅ Cumplida' : '⚠️ No cumplida'}
                            </div>
                            ` : ''}
                            
                            <details style="margin-top: 15px;">
                                <summary style="cursor: pointer; padding: 10px; background: #f8f9ff; border-radius: 8px; font-weight: bold;">
                                    📋 Ver detalles completos
                                </summary>
                                <div style="margin-top: 10px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e0e0e0;">
                                    ${mes.gastosFijos && mes.gastosFijos.length > 0 ? `
                                    <div style="margin-bottom: 15px;">
                                        <strong style="color: #667eea;">💳 Gastos Fijos (${mes.gastosFijos.length}):</strong>
                                        <ul style="margin: 5px 0 0 20px; font-size: 0.9em;">
                                            ${mes.gastosFijos.map(g => `<li>${g.nombre}: ${g.monto.toFixed(2)} (Día ${g.dia})</li>`).join('')}
                                        </ul>
                                        <div style="text-align: right; font-weight: bold; margin-top: 5px;">Total: ${(mes.totalGastosFijos || 0).toFixed(2)}</div>
                                    </div>
                                    ` : ''}
                                    
                                    ${mes.gastoGasolina > 0 || mes.gastoComida > 0 ? `
                                    <div style="margin-bottom: 15px;">
                                        <strong style="color: #51cf66;">🚗 Gastos Variables:</strong>
                                        <ul style="margin: 5px 0 0 20px; font-size: 0.9em;">
                                            ${mes.gastoGasolina > 0 ? `<li>⛽ Gasolina: ${mes.gastoGasolina.toFixed(2)}</li>` : ''}
                                            ${mes.gastoComida > 0 ? `<li>🍔 Comida: ${mes.gastoComida.toFixed(2)}</li>` : ''}
                                        </ul>
                                        <div style="text-align: right; font-weight: bold; margin-top: 5px;">Total: ${(mes.totalGastosVariables || 0).toFixed(2)}</div>
                                    </div>
                                    ` : ''}
                                    
                                    ${mes.tarjetas && mes.tarjetas.length > 0 ? `
                                    <div style="margin-bottom: 15px;">
                                        <strong style="color: #667eea;">💳 Tarjetas (${mes.tarjetas.length}):</strong>
                                        <ul style="margin: 5px 0 0 20px; font-size: 0.9em;">
                                            ${mes.tarjetas.map(t => `<li>${t.nombre}: Mínimo ${t.minimo.toFixed(2)} / Deuda ${t.deuda.toFixed(2)}</li>`).join('')}
                                        </ul>
                                        <div style="text-align: right; font-weight: bold; margin-top: 5px;">Total mínimos: ${(mes.totalTarjetas || 0).toFixed(2)}</div>
                                    </div>
                                    ` : ''}
                                    
                                    ${mes.miscelaneos && mes.miscelaneos.length > 0 ? `
                                    <div style="margin-bottom: 15px;">
                                        <strong style="color: #f59f00;">🎯 Misceláneos (${mes.miscelaneos.length}):</strong>
                                        <ul style="margin: 5px 0 0 20px; font-size: 0.9em;">
                                            ${mes.miscelaneos.map(m => `<li>${m.nombre}: ${m.monto.toFixed(2)}</li>`).join('')}
                                        </ul>
                                        <div style="text-align: right; font-weight: bold; margin-top: 5px;">Total: ${(mes.totalMiscelaneos || 0).toFixed(2)}</div>
                                    </div>
                                    ` : ''}
                                    
                                    ${mes.imprevistos && mes.imprevistos.length > 0 ? `
                                    <div style="margin-bottom: 15px;">
                                        <strong style="color: #ff6b6b;">🚨 Imprevistos (${mes.imprevistos.length}):</strong>
                                        <ul style="margin: 5px 0 0 20px; font-size: 0.9em;">
                                            ${mes.imprevistos.map(i => `<li>${i.nombre}: ${i.monto.toFixed(2)}</li>`).join('')}
                                        </ul>
                                        <div style="text-align: right; font-weight: bold; margin-top: 5px;">Total: ${(mes.totalImprevistos || 0).toFixed(2)}</div>
                                    </div>
                                    ` : ''}
                                </div>
                            </details>
                            
                            <div style="margin-top: 15px; display: flex; gap: 10px;">
                                <button onclick="cargarMes('${mes.key}')" class="btn-secondary" style="flex: 1; padding: 10px;">
                                    📥 Cargar
                                </button>
                                <button onclick="eliminarMes('${mes.key}')" class="btn-danger" style="flex: 1; padding: 10px;">
                                    🗑️ Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                content.innerHTML = html;
            }
            
            modal.classList.add('show');
        }
        
        function compararMeses() {
            // Obtener todos los meses guardados
            const mesesGuardados = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('finanzas_')) {
                    try {
                        const datos = JSON.parse(localStorage.getItem(key));
                        mesesGuardados.push(datos);
                    } catch (e) {
                        console.error('Error:', e);
                    }
                }
            }
            
            if (mesesGuardados.length < 2) {
                alert('📊 Necesitas al menos 2 meses guardados para comparar.\n\nGuarda más meses usando el botón "💾 Guardar Este Mes"');
                return;
            }
            
            // Ordenar por fecha
            mesesGuardados.sort((a, b) => {
                const fechaA = new Date(a.año, a.mes - 1);
                const fechaB = new Date(b.año, b.mes - 1);
                return fechaA - fechaB;
            });
            
            const modal = document.getElementById('modalComparacion');
            modal.classList.add('show');
            
            // Preparar datos para la gráfica
            setTimeout(() => {
                const ctx = document.getElementById('comparacionChart');
                if (ctx) {
                    const labels = mesesGuardados.map(m => `${m.nombreMes} ${m.año}`);
                    const ingresos = mesesGuardados.map(m => m.totalIngresos);
                    const balance = mesesGuardados.map(m => m.balanceActual || 0);
                    const metasAhorro = mesesGuardados.map(m => m.metaAhorro || 0);
                    
                    if (comparacionChartInstance) { comparacionChartInstance.destroy(); }
                    comparacionChartInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: 'Ingresos Totales',
                                    data: ingresos,
                                    borderColor: '#51cf66',
                                    backgroundColor: 'rgba(81, 207, 102, 0.1)',
                                    tension: 0.4,
                                    fill: true
                                },
                                {
                                    label: 'Balance Actual',
                                    data: balance,
                                    borderColor: '#667eea',
                                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                    tension: 0.4,
                                    fill: true
                                },
                                {
                                    label: 'Meta de Ahorro',
                                    data: metasAhorro,
                                    borderColor: '#f59f00',
                                    backgroundColor: 'rgba(245, 159, 0, 0.1)',
                                    tension: 0.4,
                                    fill: true
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: {
                                    position: 'bottom'
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value) {
                                            return '$' + value.toFixed(0);
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
                
                // Mostrar estadísticas
                const promIngresos = ingresos.reduce((a, b) => a + b, 0) / ingresos.length;
                const promBalance = balance.reduce((a, b) => a + b, 0) / balance.length;
                
                document.getElementById('comparacionStats').innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="background: #e8f5e9; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 0.9em; color: #666;">Promedio Ingresos</div>
                            <div style="font-size: 1.5em; font-weight: bold; color: #37b24d;">$${promIngresos.toFixed(2)}</div>
                        </div>
                        <div style="background: #e8eaff; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 0.9em; color: #666;">Promedio Balance</div>
                            <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">$${promBalance.toFixed(2)}</div>
                        </div>
                        <div style="background: #fff3e0; padding: 15px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 0.9em; color: #666;">Meses Registrados</div>
                            <div style="font-size: 1.5em; font-weight: bold; color: #f57c00;">${mesesGuardados.length}</div>
                        </div>
                    </div>
                `;
            }, 100);
        }
        
        function verProgresoAhorro() {
            const modal = document.getElementById('modalProgreso');
            const content = document.getElementById('progresoContent');
            
            // Buscar todos los objetivos de ahorro guardados
            const objetivos = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('objetivo_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        objetivos.push(data);
                    } catch (e) {
                        console.error('Error al leer objetivo:', e);
                    }
                }
            }
            
            if (objetivos.length === 0) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <h3>📊 No hay objetivos de ahorro registrados</h3>
                        <p style="margin-top: 15px;">Para empezar a hacer seguimiento:</p>
                        <ol style="text-align: left; max-width: 400px; margin: 20px auto; line-height: 1.8;">
                            <li>Selecciona "Ahorro con fecha objetivo" en el formulario</li>
                            <li>Define tu meta y fecha</li>
                            <li>Calcula y guarda el mes con "💾 Guardar Este Mes"</li>
                            <li>Repite cada mes para ver tu progreso aquí</li>
                        </ol>
                    </div>
                `;
            } else {
                let html = '';
                
                objetivos.forEach(obj => {
                    const totalAhorrado = obj.mesesAhorro.reduce((sum, m) => sum + m.monto, 0);
                    const porcentaje = Math.min((totalAhorrado / obj.metaTotal) * 100, 100);
                    const falta = Math.max(obj.metaTotal - totalAhorrado, 0);
                    
                    // Parsear fecha
                    const fechaObj = new Date(obj.fechaObjetivo);
                    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    const fechaTexto = `${fechaObj.getDate()} de ${meses[fechaObj.getMonth()]} ${fechaObj.getFullYear()}`;
                    
                    // Calcular días restantes
                    const hoy = new Date();
                    const diasRestantes = Math.ceil((fechaObj - hoy) / (1000 * 60 * 60 * 24));
                    const yaLlegó = diasRestantes <= 0;
                    
                    html += `
                        <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8eaff 100%); padding: 25px; border-radius: 15px; margin-bottom: 20px; border-left: 5px solid ${porcentaje >= 100 ? '#4caf50' : '#ff9800'};">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h3 style="margin: 0; color: #667eea;">🎯 Objetivo: ${fechaTexto}</h3>
                                ${porcentaje >= 100 ? '<span style="background: #4caf50; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">✅ Completado</span>' : 
                                  yaLlegó ? '<span style="background: #ff6b6b; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">⚠️ Fecha pasada</span>' :
                                  `<span style="background: #ff9800; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">⏳ ${diasRestantes} días restantes</span>`}
                            </div>
                            
                            <!-- Barra de progreso -->
                            <div style="background: #e9ecef; height: 40px; border-radius: 20px; overflow: hidden; margin-bottom: 15px; position: relative;">
                                <div style="background: linear-gradient(90deg, #4caf50, #2e7d32); height: 100%; width: ${porcentaje}%; transition: width 0.5s; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                                    ${porcentaje.toFixed(1)}%
                                </div>
                            </div>
                            
                            <!-- Estadísticas -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                                    <div style="font-size: 0.9em; color: #666;">Meta Total</div>
                                    <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">$${obj.metaTotal.toFixed(2)}</div>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                                    <div style="font-size: 0.9em; color: #666;">Ahorrado</div>
                                    <div style="font-size: 1.5em; font-weight: bold; color: #4caf50;">$${totalAhorrado.toFixed(2)}</div>
                                </div>
                                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                                    <div style="font-size: 0.9em; color: #666;">${porcentaje >= 100 ? 'Excedente' : 'Falta'}</div>
                                    <div style="font-size: 1.5em; font-weight: bold; color: ${porcentaje >= 100 ? '#4caf50' : '#ff9800'};">$${falta.toFixed(2)}</div>
                                </div>
                            </div>
                            
                            <!-- Historial de meses -->
                            <details style="margin-top: 15px;">
                                <summary style="cursor: pointer; padding: 10px; background: white; border-radius: 8px; font-weight: bold;">
                                    📋 Ver historial de ${obj.mesesAhorro.length} ${obj.mesesAhorro.length === 1 ? 'mes' : 'meses'} guardados
                                </summary>
                                <div style="margin-top: 10px; background: white; padding: 15px; border-radius: 8px;">
                                    ${obj.mesesAhorro.map((m, idx) => `
                                        <div style="padding: 8px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between;">
                                            <span>${idx + 1}. ${m.mes} ${m.año}</span>
                                            <strong style="color: #4caf50;">$${m.monto.toFixed(2)}</strong>
                                        </div>
                                    `).join('')}
                                    ${obj.mesesAhorro.length === 0 ? '<p style="color: #999;">Aún no has guardado ningún mes</p>' : ''}
                                </div>
                            </details>
                            
                            <!-- Botón de eliminar objetivo -->
                            <button onclick="eliminarObjetivo('${obj.fechaObjetivo}')" style="margin-top: 15px; background: #ff6b6b; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; width: 100%;">
                                🗑️ Eliminar este objetivo
                            </button>
                        </div>
                    `;
                });
                
                content.innerHTML = html;
            }
            
            modal.classList.add('show');
        }
        
        function eliminarObjetivo(fechaObjetivo) {
            if (confirm(`¿Estás seguro de eliminar el objetivo para ${fechaObjetivo}?\n\nSe perderá todo el historial de ahorro asociado.`)) {
                const claveObjetivo = `objetivo_${fechaObjetivo}`;
                localStorage.removeItem(claveObjetivo);
                alert('✅ Objetivo eliminado correctamente.');
                verProgresoAhorro(); // Recargar
            }
        }
        
        function cargarMes(key) {
            if (!confirm('¿Quieres cargar los datos de este mes? Los datos actuales en el formulario se reemplazarán.')) {
                return;
            }
            
            try {
                const datos = JSON.parse(localStorage.getItem(key));
                
                // Cargar datos en el formulario
                document.getElementById('mes-pago1').value = datos.paycheck1.mes;
                document.getElementById('dia-pago1').value = datos.paycheck1.dia;
                document.getElementById('monto-pago1').value = datos.paycheck1.monto;
                
                document.getElementById('mes-pago2').value = datos.paycheck2.mes;
                document.getElementById('dia-pago2').value = datos.paycheck2.dia;
                document.getElementById('monto-pago2').value = datos.paycheck2.monto;
                
                document.getElementById('balance-actual').value = datos.balanceActual;
                document.getElementById('meta-ahorro').value = datos.metaAhorro;
                
                cerrarModal('modalHistorial');
                alert(`✅ Datos de ${datos.nombreMes} ${datos.año} cargados.\n\nPresiona "CALCULAR" para ver los resultados.`);
                
                // Scroll hacia arriba
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                alert('❌ Error al cargar los datos del mes.');
                console.error(error);
            }
        }
        
        function eliminarMes(key) {
            const datos = JSON.parse(localStorage.getItem(key));
            
            if (confirm(`¿Estás seguro de eliminar ${datos.nombreMes} ${datos.año}?\n\nEsta acción no se puede deshacer.`)) {
                localStorage.removeItem(key);
                alert('✅ Mes eliminado correctamente.');
                verHistorial(); // Recargar el historial
            }
        }
        
        function cerrarModal(modalId) {
            document.getElementById(modalId).classList.remove('show');
        }
        
        // Cerrar modal al hacer click fuera
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.classList.remove('show');
            }
        }
        
        // ==================== VALIDACIÓN DE FECHAS ====================
        
        function validarDiaDelMes(mes, dia) {
            const diasPorMes = {
                1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
                7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
            };
            
            const maxDias = diasPorMes[parseInt(mes)] || 31;
            return parseInt(dia) <= maxDias;
        }
        
        function obtenerNombreMes(numeroMes) {
            const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            return meses[parseInt(numeroMes)] || '';
        }
        
        // Agregar validación a todos los inputs de día
        document.addEventListener('DOMContentLoaded', function() {
            // Validar días de servicios cuando cambien mes o día
            document.querySelectorAll('.servicio-mes, .servicio-dia').forEach(input => {
                input.addEventListener('change', function() {
                    const contenedor = this.closest('.gasto-categoria');
                    if (contenedor) {
                        const mesSelect = contenedor.querySelector('.servicio-mes');
                        const diaInput = contenedor.querySelector('.servicio-dia');
                        
                        if (mesSelect && diaInput && diaInput.value) {
                            const mes = mesSelect.value;
                            const dia = diaInput.value;
                            
                            if (mes !== 'todos' && !validarDiaDelMes(mes, dia)) {
                                const nombreMes = obtenerNombreMes(mes);
                                const diasPorMes = {1:31,2:28,3:31,4:30,5:31,6:30,7:31,8:31,9:30,10:31,11:30,12:31};
                                const maxDias = diasPorMes[parseInt(mes)];
                                
                                alert(`⚠️ ${nombreMes} solo tiene ${maxDias} días.\n\nPor favor ingresa un día válido (1-${maxDias}).`);
                                diaInput.value = '';
                                diaInput.focus();
                            }
                        }
                    }
                });
            });
            
            // Validar días de tarjetas
            document.querySelectorAll('.tarjeta-mes, .tarjeta-dia').forEach(input => {
                input.addEventListener('change', function() {
                    const contenedor = this.closest('.gasto-categoria');
                    if (contenedor) {
                        const mesSelect = contenedor.querySelector('.tarjeta-mes');
                        const diaInput = contenedor.querySelector('.tarjeta-dia');
                        
                        if (mesSelect && diaInput && diaInput.value) {
                            const mes = mesSelect.value;
                            const dia = diaInput.value;
                            
                            if (!validarDiaDelMes(mes, dia)) {
                                const nombreMes = obtenerNombreMes(mes);
                                const diasPorMes = {1:31,2:28,3:31,4:30,5:31,6:30,7:31,8:31,9:30,10:31,11:30,12:31};
                                const maxDias = diasPorMes[parseInt(mes)];
                                
                                alert(`⚠️ ${nombreMes} solo tiene ${maxDias} días.\n\nPor favor ingresa un día válido (1-${maxDias}).`);
                                diaInput.value = '';
                                diaInput.focus();
                            }
                        }
                    }
                });
            });
            
            // Validar días de imprevistos
            document.addEventListener('input', function(e) {
                if (e.target.classList.contains('imprevisto-dia')) {
                    const dia = parseInt(e.target.value);
                    if (dia > 31) {
                        alert('⚠️ El día no puede ser mayor a 31.');
                        e.target.value = '';
                    }
                }
            });
        });
        
        // ==================== FIN VALIDACIÓN ====================
        
        // ==================== FIN FUNCIONES DE GUARDADO ====================
        
        function exportarPDF() {
            const elemento = document.getElementById('resultado');
            
            if (!elemento || elemento.innerHTML === '') {
                alert('⚠️ Primero debes calcular tu plan financiero antes de exportar a PDF');
                return;
            }
            
            // Intentar imprimir con timeout para dar tiempo al navegador
            try {
                setTimeout(() => {
                    window.print();
                }, 100);
                
                // Mostrar instrucciones después de intentar imprimir
                setTimeout(() => {
                    // Solo mostrar si todavía no se abrió el diálogo
                    alert('💡 Si no se abrió el diálogo de impresión:\n\n🖥️ Computadora:\n  • Presiona Ctrl+P (Windows) o Cmd+P (Mac)\n\n📱 iPhone/iPad:\n  • Toca el botón Compartir 🔗 arriba\n  • Selecciona "Imprimir"\n  • O toma screenshot y compártelo');
                }, 500);
            } catch (error) {
                console.error('❌ Error al imprimir:', error);
                alert('❌ Error al imprimir. Usa el atajo de teclado:\n\n• Ctrl+P (Windows)\n• Cmd+P (Mac)\n\nO el menú del navegador: Archivo → Imprimir');
            }
        }
        
        // ==================== ATAJOS DE TECLADO GLOBALES ====================
        
        document.addEventListener('keydown', function(e) {
            // Ctrl+Enter o Cmd+Enter → Calcular
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                calcularFinanzas();
            }
            
            // Ctrl+N o Cmd+N → Agregar nueva fila de gasto fijo
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                agregarFilaGastoFijo();
            }
            
            // Escape → Cerrar mensajes de error/éxito y tooltips
            if (e.key === 'Escape') {
                const errorContainer = document.getElementById('error-container');
                const successContainer = document.getElementById('success-container');

                if (errorContainer) errorContainer.classList.remove('show');
                if (successContainer) successContainer.classList.remove('show');
                
                // Cerrar ayuda expandida si está abierta
                const helpHeaders = document.querySelectorAll('.collapsible-header.active');
                helpHeaders.forEach(header => {
                    header.classList.remove('active');
                    const content = header.nextElementSibling;
                    if (content) content.classList.remove('active');
                });
            }
        });
        
        // Auto-focus en el primer input al cargar la página
        window.addEventListener('load', function() {
            const primerInput = document.getElementById('balance-actual');
            if (primerInput) {
                setTimeout(() => primerInput.focus(), 500);
            }
        });
        
        // Global error handler to catch and suppress generic "Script error" messages
        window.addEventListener('error', function(event) {
            // If it's a generic "Script error" with no details, it's usually a CDN/CORS issue
            // that doesn't need to be shown to the user
            if (event.message === 'Script error.') {
                event.preventDefault();
                console.log('⚠️ Script error suprimido (probablemente CDN/CORS)');
            }
        });
        
        // ==================== REGISTRO PWA SERVICE WORKER ====================
        
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('✅ Service Worker registrado:', registration.scope);
                    })
                    .catch(error => {
                        console.log('❌ Error al registrar Service Worker:', error);
                    });
            });
        }